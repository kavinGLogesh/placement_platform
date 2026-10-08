import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import pdfParsePkg from 'pdf-parse';
const pdfParse: any = (pdfParsePkg as any).default || pdfParsePkg;
import { XMLParser } from 'fast-xml-parser';
import { RawParsedQuestion } from './question-segmenter.util.js';
import {
  validateImageMagicBytes,
  generateSafeImageFilename,
  QUESTIONS_UPLOAD_DIR,
} from '../utils/file-security.util.js';

export type DetectedDocumentType = 'DOCX' | 'XLSX' | 'CSV' | 'XML' | 'PDF' | 'IMAGE' | 'TEXT';

export interface DocumentParseResult {
  detectedType: DetectedDocumentType;
  text: string;
  rawQuestions?: RawParsedQuestion[];
  embeddedImages?: Array<{ filename: string; url: string }>;
  isScannedPdf?: boolean;
  pageCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Extracts embedded images from DOCX archive (under word/media/).
 * Saves validated images to uploads/questions/ with secure unguessable names.
 */
export function extractDocxEmbeddedImages(buffer: Buffer): Array<{ filename: string; url: string }> {
  const extractedImages: Array<{ filename: string; url: string }> = [];
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName.startsWith('word/media/') && !entry.isDirectory) {
        const ext = entry.entryName.split('.').pop()?.toLowerCase() || 'png';
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          const imgBuffer = entry.getData();
          const magic = validateImageMagicBytes(imgBuffer);
          if (magic.isValid) {
            const safeName = generateSafeImageFilename(magic.ext);
            const targetPath = path.resolve(QUESTIONS_UPLOAD_DIR, safeName);
            fs.writeFileSync(targetPath, imgBuffer);
            extractedImages.push({
              filename: safeName,
              url: `/api/questions/images/${safeName}`,
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[extractDocxEmbeddedImages] Warning extracting media from docx:', err.message);
  }
  return extractedImages;
}

/**
 * Detects real file format from buffer magic bytes and file extension.
 * Eliminates the bug where ZIP-based Office files (DOCX/XLSX) are treated as raw text.
 */
export function detectRealFileType(
  buffer: Buffer,
  originalname?: string,
  mimetype?: string
): DetectedDocumentType {
  const ext = originalname ? originalname.split('.').pop()?.toLowerCase() || '' : '';
  const mime = mimetype ? mimetype.toLowerCase() : '';

  // 1. Check Magic Bytes
  if (buffer.length >= 4) {
    // PDF Magic Bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'PDF';
    }

    // ZIP Magic Bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      if (ext === 'xlsx' || ext === 'xls' || mime.includes('sheet') || mime.includes('excel')) {
        return 'XLSX';
      }
      // Default ZIP-based Office doc to DOCX
      return 'DOCX';
    }

    // JPEG Magic Bytes: 0xFF, 0xD8, 0xFF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'IMAGE';
    }

    // PNG Magic Bytes: 0x89, 0x50, 0x4E, 0x47 (\x89PNG)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'IMAGE';
    }
  }

  // 2. Check XML preamble
  const sample = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf-8').trim();
  if (ext === 'xml' || mime.includes('xml') || sample.startsWith('<?xml') || (sample.startsWith('<') && sample.includes('</'))) {
    return 'XML';
  }

  // 3. Check Extension & MIME
  if (ext === 'docx' || ext === 'doc' || mime.includes('word')) {
    return 'DOCX';
  }

  if (ext === 'xlsx' || ext === 'xls' || mime.includes('sheet') || mime.includes('excel')) {
    return 'XLSX';
  }

  if (ext === 'csv' || mime.includes('csv')) {
    return 'CSV';
  }

  if (ext === 'pdf' || mime.includes('pdf')) {
    return 'PDF';
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return 'IMAGE';
  }

  return 'TEXT';
}

/**
 * Parses DOCX document using mammoth to decompress ZIP and parse word/document.xml.
 * NEVER outputs "PK ... [Content_Types].xml" binary junk.
 */
export async function parseDocxDocument(buffer: Buffer): Promise<{
  text: string;
  embeddedImages?: Array<{ filename: string; url: string }>;
}> {
  const embeddedImages = extractDocxEmbeddedImages(buffer);
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : '';

    if (text.length > 0) {
      return { text, embeddedImages };
    }
  } catch (err: any) {
    console.warn('[parseDocxDocument] mammoth extraction warning:', err.message);
  }

  // Fallback: Safe XML extraction from ZIP structure
  try {
    const text = extractTextFromZipDocx(buffer);
    if (text.trim().length > 0) {
      return { text: text.trim(), embeddedImages };
    }
  } catch (err: any) {
    console.warn('[parseDocxDocument] ZIP XML fallback failed:', err.message);
  }

  throw new Error('Unable to extract readable text from DOCX file. Please verify file integrity.');
}

/**
 * Emergency DOCX fallback: extracts word/document.xml without exposing ZIP directory headers
 */
function extractTextFromZipDocx(buffer: Buffer): string {
  try {
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry('word/document.xml');
    if (entry) {
      const xml = zip.readAsText(entry);
      // Match each paragraph <w:p>...</w:p>
      const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g);
      if (paragraphs && paragraphs.length > 0) {
        return paragraphs
          .map((p) => {
            const texts = p.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g);
            return texts ? texts.map((t) => t.replace(/<[^>]+>/g, '')).join('') : '';
          })
          .filter(Boolean)
          .join('\n');
      }

      const matches = xml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (matches && matches.length > 0) {
        return matches.map((m) => m.replace(/<[^>]+>/g, '')).join('\n');
      }
    }
  } catch {
    // ignore
  }

  return '';
}

/**
 * Parses XLSX / XLS workbook sheets into structured questions and clean text.
 */
export function parseXlsxDocument(buffer: Buffer): { text: string; rawQuestions: RawParsedQuestion[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const rawQuestions: RawParsedQuestion[] = [];
  let fullText = '';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    fullText += `--- Sheet: ${sheetName} ---\n`;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Normalize row keys to lower-case for robust mapping
      const normalizedKeys: Record<string, any> = {};
      for (const key of Object.keys(row)) {
        normalizedKeys[key.trim().toLowerCase()] = row[key];
      }

      // Statement lookup
      const qText =
        normalizedKeys['question'] ||
        normalizedKeys['question statement'] ||
        normalizedKeys['question text'] ||
        normalizedKeys['statement'] ||
        normalizedKeys['problem'] ||
        normalizedKeys['title'] ||
        normalizedKeys['text'] ||
        normalizedKeys['q_text'] ||
        normalizedKeys['question_text'];

      if (!qText || !String(qText).trim()) {
        continue;
      }

      // Question Number lookup
      const qNum =
        normalizedKeys['#'] ||
        normalizedKeys['qno'] ||
        normalizedKeys['q.no'] ||
        normalizedKeys['q_no'] ||
        normalizedKeys['question number'] ||
        normalizedKeys['sr no'] ||
        normalizedKeys['sl no'] ||
        i + 1;

      // Options lookup
      const opts: Array<{ optionText: string; optionOrder: number; isCorrect: boolean; label: string }> = [];
      const optionLabels = ['A', 'B', 'C', 'D', 'E'];

      optionLabels.forEach((lbl, idx) => {
        const val =
          normalizedKeys[`option ${lbl.toLowerCase()}`] ||
          normalizedKeys[`option_${lbl.toLowerCase()}`] ||
          normalizedKeys[`option${lbl.toLowerCase()}`] ||
          normalizedKeys[lbl.toLowerCase()] ||
          normalizedKeys[`option ${idx + 1}`] ||
          normalizedKeys[`opt ${idx + 1}`];

        if (val && String(val).trim()) {
          opts.push({
            optionText: String(val).trim(),
            optionOrder: idx + 1,
            isCorrect: false,
            label: lbl,
          });
        }
      });

      // Correct Answer lookup
      const ansVal =
        normalizedKeys['answer'] ||
        normalizedKeys['correct answer'] ||
        normalizedKeys['correct_answer'] ||
        normalizedKeys['correct'] ||
        normalizedKeys['key'] ||
        normalizedKeys['ans'];

      let documentAnswer: string | null = null;
      let hasDocumentAnswer = false;

      if (ansVal && String(ansVal).trim()) {
        documentAnswer = String(ansVal).trim();
        hasDocumentAnswer = true;

        // Correlate with options
        const cleanAns = documentAnswer.toUpperCase();
        for (const opt of opts) {
          if (
            opt.label === cleanAns ||
            opt.optionText.toLowerCase() === documentAnswer.toLowerCase() ||
            cleanAns.includes(opt.label)
          ) {
            opt.isCorrect = true;
          }
        }
      }

      // Explanation lookup
      const explanation =
        normalizedKeys['explanation'] ||
        normalizedKeys['solution'] ||
        normalizedKeys['rationale'] ||
        normalizedKeys['reason'] ||
        null;

      // Image/Diagram lookup
      const imgVal =
        normalizedKeys['image'] ||
        normalizedKeys['imageurl'] ||
        normalizedKeys['image_url'] ||
        normalizedKeys['diagram'] ||
        normalizedKeys['diagramurl'] ||
        normalizedKeys['diagram_url'] ||
        normalizedKeys['figure'] ||
        normalizedKeys['figure_url'];

      let imageUrl: string | null = imgVal ? String(imgVal).trim() : null;
      let hasUnresolvedDiagram = false;
      let diagramReviewNote: string | null = null;

      const diagramRefRegex = /\b(refer\s+to\s+(?:the\s+)?(?:figure|diagram|chart|graph|image|table)|shown\s+in\s+(?:the\s+)?(?:figure|diagram|circuit|chart|graph)|see\s+(?:the\s+)?(?:figure|diagram|circuit|graph)|(?:figure|fig\.?|diagram|chart|circuit|schematic)\s*(?:[A-Z0-9\.\-]+)?\s*[:\-\—]?)\b/i;
      if (!imageUrl && diagramRefRegex.test(String(qText))) {
        hasUnresolvedDiagram = true;
        diagramReviewNote = 'Visual reference detected in spreadsheet row, but diagram column is empty. Needs Admin review.';
      }

      // Marks lookup
      const marks = normalizedKeys['marks'] ? Number(normalizedKeys['marks']) : 1.0;
      const negativeMarks = normalizedKeys['negative marks'] || normalizedKeys['negative_marks']
        ? Number(normalizedKeys['negative marks'] || normalizedKeys['negative_marks'])
        : 0.0;

      rawQuestions.push({
        questionNumber: qNum,
        questionText: String(qText).trim(),
        imageUrl,
        hasUnresolvedDiagram,
        diagramReviewNote,
        options: opts,
        documentAnswer,
        hasDocumentAnswer,
        explanation: explanation ? String(explanation).trim() : null,
        marks: isNaN(marks) ? 1.0 : marks,
        negativeMarks: isNaN(negativeMarks) ? 0.0 : negativeMarks,
      });

      // Append to fullText representation
      fullText += `Q${qNum}. ${qText}\n`;
      opts.forEach((o) => {
        fullText += `${o.label}) ${o.optionText}\n`;
      });
      if (documentAnswer) {
        fullText += `Answer: ${documentAnswer}\n`;
      }
      if (explanation) {
        fullText += `Explanation: ${explanation}\n`;
      }
      fullText += '\n';
    }
  }

  return { text: fullText, rawQuestions };
}

/**
 * Parses CSV document into structured questions and clean text.
 */
export function parseCsvDocument(buffer: Buffer): { text: string; rawQuestions: RawParsedQuestion[] } {
  return parseXlsxDocument(buffer);
}

/**
 * Parses XML document into structured questions.
 * Supports standard XML assessment schemas (<questions><question>..., <quiz><question>..., QTI).
 */
export function parseXmlDocument(buffer: Buffer): { text: string; rawQuestions: RawParsedQuestion[] } {
  const xmlContent = buffer.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsed = parser.parse(xmlContent);
  const rawQuestions: RawParsedQuestion[] = [];
  let fullText = '';

  // Helper to extract questions from any nested object
  const findQuestionNodes = (obj: any): any[] => {
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) {
      return obj.flatMap(findQuestionNodes);
    }

    const items: any[] = [];
    if (obj.question || obj.item || obj.problem) {
      const q = obj.question || obj.item || obj.problem;
      if (Array.isArray(q)) items.push(...q);
      else items.push(q);
    }

    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && !['question', 'item', 'problem'].includes(key)) {
        items.push(...findQuestionNodes(obj[key]));
      }
    }
    return items;
  };

  const questionNodes = findQuestionNodes(parsed);

  for (let i = 0; i < questionNodes.length; i++) {
    const node = questionNodes[i];
    const qText =
      node.text ||
      node.statement ||
      node.questiontext?.text ||
      node.prompt ||
      node.title ||
      node['#text'];

    if (!qText || !String(qText).trim()) continue;

    const qNum = node['@_id'] || node['@_number'] || node.number || i + 1;

    // Parse options
    const rawOptions = node.options?.option || node.choices?.choice || node.answers?.answer || [];
    const optionList = Array.isArray(rawOptions) ? rawOptions : [rawOptions];
    const opts: Array<{ optionText: string; optionOrder: number; isCorrect: boolean; label: string }> = [];

    optionList.forEach((opt: any, idx: number) => {
      const optText = typeof opt === 'string' ? opt : opt.text || opt['#text'] || '';
      const isCorrect =
        opt['@_correct'] === 'true' ||
        opt['@_is_correct'] === 'true' ||
        opt['@_fraction'] === '100' ||
        opt.isCorrect === true;

      const label = opt['@_label'] || String.fromCharCode(65 + idx);

      if (optText && String(optText).trim()) {
        opts.push({
          optionText: String(optText).trim(),
          optionOrder: idx + 1,
          isCorrect: Boolean(isCorrect),
          label,
        });
      }
    });

    const ansVal = node.correct_answer || node.correctAnswer || node.answer;
    let documentAnswer: string | null = null;
    let hasDocumentAnswer = false;

    if (ansVal && typeof ansVal === 'string' && ansVal.trim()) {
      documentAnswer = ansVal.trim();
      hasDocumentAnswer = true;
    } else if (opts.some((o) => o.isCorrect)) {
      const correctOpt = opts.find((o) => o.isCorrect);
      if (correctOpt) {
        documentAnswer = correctOpt.label;
        hasDocumentAnswer = true;
      }
    }

    const explanation = node.explanation || node.generalfeedback?.text || null;

    const xmlImgVal = node.image || node.imageUrl || node.diagram || node.figure || node['@_image'] || node['@_imageUrl'];
    let imageUrl: string | null = xmlImgVal ? String(xmlImgVal).trim() : null;
    let hasUnresolvedDiagram = false;
    let diagramReviewNote: string | null = null;

    const diagramRefRegex = /\b(refer\s+to\s+(?:the\s+)?(?:figure|diagram|chart|graph|image|table)|shown\s+in\s+(?:the\s+)?(?:figure|diagram|circuit|chart|graph)|see\s+(?:the\s+)?(?:figure|diagram|circuit|graph)|(?:figure|fig\.?|diagram|chart|circuit|schematic)\s*(?:[A-Z0-9\.\-]+)?\s*[:\-\—]?)\b/i;
    if (!imageUrl && diagramRefRegex.test(String(qText))) {
      hasUnresolvedDiagram = true;
      diagramReviewNote = 'Visual reference detected in XML question, but no diagram tag found. Needs Admin review.';
    }

    rawQuestions.push({
      questionNumber: qNum,
      questionText: String(qText).trim(),
      imageUrl,
      hasUnresolvedDiagram,
      diagramReviewNote,
      options: opts,
      documentAnswer,
      hasDocumentAnswer,
      explanation: explanation ? String(explanation).trim() : null,
      marks: node.marks ? Number(node.marks) : 1.0,
      negativeMarks: node.negative_marks ? Number(node.negative_marks) : 0.0,
    });

    fullText += `Q${qNum}. ${qText}\n`;
    opts.forEach((o) => {
      fullText += `${o.label}) ${o.optionText}\n`;
    });
    if (documentAnswer) fullText += `Answer: ${documentAnswer}\n`;
    fullText += '\n';
  }

  // If no structured XML questions found, use the raw text content
  if (rawQuestions.length === 0) {
    fullText = xmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return { text: fullText, rawQuestions };
}

/**
 * Parses PDF document using pdf-parse.
 * Distinguishes digital text PDFs from scanned PDFs requiring multimodal OCR.
 */
export async function parsePdfDocument(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
  isScanned: boolean;
}> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text ? data.text.trim() : '';
    const numPages = data.numpages || 1;

    // A PDF is considered scanned if it has very low text content relative to page count
    const isScanned = text.length < 50 || text.length / numPages < 15;

    return {
      text,
      numPages,
      isScanned,
    };
  } catch (err: any) {
    console.warn('[parsePdfDocument] pdf-parse error:', err.message);
    // Treat as scanned or encrypted PDF
    return {
      text: '',
      numPages: 1,
      isScanned: true,
    };
  }
}
