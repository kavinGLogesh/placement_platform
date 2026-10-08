import * as XLSX from 'xlsx';
import { QuestionCategory, QuestionDifficulty, QuestionType } from '../types/question.types.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ParsedQuestionRow {
  rowNumber: number;
  questionText: string;
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  marks: number;
  negativeMarks: number;
  correctAnswer?: string;
  explanation?: string;
  source?: string;
  year?: number;
  options: Array<{
    optionText: string;
    optionOrder: number;
    isCorrect: boolean;
  }>;
}

const normalizeHeader = (key: string): string => {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const normalizeCategory = (raw: string): QuestionCategory | null => {
  const s = raw.trim().toUpperCase().replace(/[^A-Z]/g, '_');
  if (s.includes('QUANT') || s.includes('APTITUDE') || s === 'QA') return 'QUANTITATIVE_APTITUDE';
  if (s.includes('LOGIC') || s.includes('REASON') || s === 'LR') return 'LOGICAL_REASONING';
  if (s.includes('VERBAL') || s.includes('ENGLISH') || s === 'VA') return 'VERBAL_ABILITY';
  if (s.includes('TECH') || s.includes('MCQ') || s.includes('COMPUTER')) return 'TECHNICAL_MCQ';
  if (s.includes('CODING') || s.includes('PROGRAM')) return 'CODING';
  return null;
};

const normalizeDifficulty = (raw?: string): QuestionDifficulty => {
  if (!raw) return 'MEDIUM';
  const s = raw.trim().toUpperCase();
  if (s.startsWith('E')) return 'EASY';
  if (s.startsWith('H')) return 'HARD';
  return 'MEDIUM';
};

const normalizeQuestionType = (raw?: string): QuestionType => {
  if (!raw) return 'SINGLE_CHOICE';
  const s = raw.trim().toUpperCase().replace(/[^A-Z]/g, '_');
  if (s.includes('MULTI')) return 'MULTIPLE_CHOICE';
  if (s.includes('TRUE') || s.includes('FALSE') || s === 'TF') return 'TRUE_FALSE';
  if (s.includes('FILL') || s.includes('BLANK') || s.includes('NUM') || s.includes('INT')) return 'FILL_BLANK';
  if (s.includes('DESC') || s.includes('CODE')) return 'DESCRIPTIVE';
  return 'SINGLE_CHOICE';
};

export function parseQuestionFileBuffer(
  buffer: Buffer,
  filename?: string
): { rows: ParsedQuestionRow[]; parseErrors: Array<{ row: number; error: string }> } {
  if (!buffer || buffer.length === 0) {
    throw new AppError('Uploaded file is empty', 400);
  }

  // Row limit protection
  const MAX_ROWS = 1000;
  const rows: ParsedQuestionRow[] = [];
  const parseErrors: Array<{ row: number; error: string }> = [];

  // Check if JSON
  const isJson = filename?.toLowerCase().endsWith('.json') || buffer.toString('utf8', 0, 10).trim().startsWith('[');
  if (isJson) {
    try {
      const parsed = JSON.parse(buffer.toString('utf8'));
      if (!Array.isArray(parsed)) {
        throw new AppError('JSON question file must contain an array of question objects', 400);
      }
      if (parsed.length > MAX_ROWS) {
        throw new AppError(`Uploaded file exceeds the maximum limit of ${MAX_ROWS} questions per batch`, 400);
      }

      parsed.forEach((item, idx) => {
        const rowNum = idx + 1;
        const qText = String(item.questionText || item.question || '').trim();
        if (!qText) {
          parseErrors.push({ row: rowNum, error: 'Question text is required' });
          return;
        }

        const rawCat = String(item.category || '');
        const category = normalizeCategory(rawCat);
        if (!category) {
          parseErrors.push({ row: rowNum, error: `Invalid category: '${rawCat}'` });
          return;
        }

        const topic = String(item.topic || '').trim();
        if (!topic) {
          parseErrors.push({ row: rowNum, error: 'Topic is required' });
          return;
        }

        const difficulty = normalizeDifficulty(item.difficulty);
        const questionType = normalizeQuestionType(item.questionType);
        const marks = Number(item.marks) > 0 ? Number(item.marks) : 1.0;
        const negativeMarks = Number(item.negativeMarks) >= 0 ? Number(item.negativeMarks) : 0.0;
        const explanation = item.explanation ? String(item.explanation).trim() : undefined;
        const source = item.source ? String(item.source).trim() : undefined;
        const year = Number(item.year) > 1990 && Number(item.year) < 2100 ? Number(item.year) : undefined;

        let options: Array<{ optionText: string; optionOrder: number; isCorrect: boolean }> = [];
        if (Array.isArray(item.options)) {
          options = item.options.map((opt: Record<string, unknown>, oIdx: number) => ({
            optionText: String(opt.optionText || opt.text || opt).trim(),
            optionOrder: (typeof opt.optionOrder === 'number' ? opt.optionOrder : oIdx + 1),
            isCorrect: Boolean(opt.isCorrect),
          }));
        }

        const correctAnswer = item.correctAnswer ? String(item.correctAnswer).trim() : undefined;

        rows.push({
          rowNumber: rowNum,
          questionText: qText,
          category,
          topic,
          difficulty,
          questionType,
          marks,
          negativeMarks,
          correctAnswer,
          explanation,
          source,
          year,
          options,
        });
      });

      return { rows, parseErrors };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError('Failed to parse JSON question file. Please verify JSON syntax.', 400);
    }
  }

  // Excel / CSV Parsing via XLSX
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new AppError('Unable to parse Excel / CSV file. Please upload a valid .xlsx or .csv file.', 400);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new AppError('Spreadsheet contains no sheets', 400);
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rawRecords.length === 0) {
    throw new AppError('Uploaded spreadsheet contains no data rows', 400);
  }

  if (rawRecords.length > MAX_ROWS) {
    throw new AppError(`Uploaded file contains ${rawRecords.length} rows, exceeding the maximum allowed limit of ${MAX_ROWS} rows per batch`, 400);
  }

  rawRecords.forEach((rowObj, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const normalized: Record<string, unknown> = {};

    Object.entries(rowObj).forEach(([k, v]) => {
      normalized[normalizeHeader(k)] = v;
    });

    const questionText = String(
      normalized['questiontext'] ||
        normalized['question'] ||
        normalized['problem'] ||
        normalized['title'] ||
        ''
    ).trim();

    if (!questionText) {
      parseErrors.push({ row: rowNumber, error: 'Question text is missing or empty' });
      return;
    }

    const rawCategory = String(
      normalized['category'] || normalized['domain'] || normalized['section'] || ''
    ).trim();

    const category = normalizeCategory(rawCategory);
    if (!category) {
      parseErrors.push({
        row: rowNumber,
        error: `Category '${rawCategory}' is not recognized. Valid: QUANTITATIVE_APTITUDE, LOGICAL_REASONING, VERBAL_ABILITY, TECHNICAL_MCQ, CODING`,
      });
      return;
    }

    const topic = String(normalized['topic'] || normalized['concept'] || '').trim();
    if (!topic) {
      parseErrors.push({ row: rowNumber, error: 'Topic is required' });
      return;
    }

    const difficulty = normalizeDifficulty(String(normalized['difficulty'] || normalized['level'] || ''));
    const questionType = normalizeQuestionType(String(normalized['questiontype'] || normalized['type'] || ''));

    const rawMarks = Number(normalized['marks'] || normalized['mark'] || 1);
    const marks = rawMarks > 0 ? rawMarks : 1.0;

    const rawNeg = Number(normalized['negativemarks'] || normalized['negativemark'] || 0);
    const negativeMarks = rawNeg >= 0 ? rawNeg : 0.0;

    const explanation = String(
      normalized['explanation'] || normalized['solution'] || normalized['rationale'] || ''
    ).trim() || undefined;

    const source = String(
      normalized['source'] || normalized['exam'] || normalized['drive'] || ''
    ).trim() || undefined;

    const rawYear = Number(normalized['year'] || normalized['batch'] || 0);
    const year = rawYear >= 1990 && rawYear <= 2100 ? rawYear : undefined;

    // Extract options
    const opt1 = String(normalized['option1'] || normalized['optiona'] || normalized['a'] || '').trim();
    const opt2 = String(normalized['option2'] || normalized['optionb'] || normalized['b'] || '').trim();
    const opt3 = String(normalized['option3'] || normalized['optionc'] || normalized['c'] || '').trim();
    const opt4 = String(normalized['option4'] || normalized['optiond'] || normalized['d'] || '').trim();

    const rawAnswer = String(
      normalized['correctanswer'] ||
        normalized['answer'] ||
        normalized['correctoption'] ||
        normalized['key'] ||
        ''
    ).trim();

    const optionsList: Array<{ optionText: string; optionOrder: number; isCorrect: boolean }> = [];
    const candidates = [opt1, opt2, opt3, opt4].filter(Boolean);

    if (candidates.length >= 2) {
      // Determine which option is correct
      // rawAnswer could be "A", "B", "C", "D" or "1", "2", "3", "4" or the full text
      const cleanAns = rawAnswer.toUpperCase();
      let matchedIndex = -1;

      if (cleanAns === 'A' || cleanAns === '1' || cleanAns === 'OPTION 1' || cleanAns === 'OPTION A') matchedIndex = 0;
      else if (cleanAns === 'B' || cleanAns === '2' || cleanAns === 'OPTION 2' || cleanAns === 'OPTION B') matchedIndex = 1;
      else if (cleanAns === 'C' || cleanAns === '3' || cleanAns === 'OPTION 3' || cleanAns === 'OPTION C') matchedIndex = 2;
      else if (cleanAns === 'D' || cleanAns === '4' || cleanAns === 'OPTION 4' || cleanAns === 'OPTION D') matchedIndex = 3;
      else {
        // Compare by option text
        const normAns = rawAnswer.toLowerCase();
        matchedIndex = candidates.findIndex((opt) => opt.toLowerCase() === normAns);
      }

      candidates.forEach((optText, idx) => {
        optionsList.push({
          optionText: optText,
          optionOrder: idx + 1,
          isCorrect: idx === matchedIndex,
        });
      });
    }

    // Determine correct answer text
    let correctAnswer = rawAnswer;
    const correctOpt = optionsList.find((o) => o.isCorrect);
    if (correctOpt) {
      correctAnswer = correctOpt.optionText;
    }

    rows.push({
      rowNumber,
      questionText,
      category,
      topic,
      difficulty,
      questionType,
      marks,
      negativeMarks,
      correctAnswer: correctAnswer || undefined,
      explanation,
      source,
      year,
      options: optionsList,
    });
  });

  return { rows, parseErrors };
}
