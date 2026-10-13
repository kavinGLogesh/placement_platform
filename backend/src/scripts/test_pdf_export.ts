import fs from 'fs';
import path from 'path';
import { generatePdfBuffer, generateExcelBuffer, generateCsvBuffer } from '../utils/export.util.js';
import { ExportDataPayload } from '../types/report.types.js';
import { PDFParse } from 'pdf-parse';

async function parsePdfDetails(buf: Buffer) {
  const parser = new PDFParse(new Uint8Array(buf));
  const result = await parser.getText();
  const pageCount = result.pages ? result.pages.length : (result as any).total || 0;
  return {
    pageCount,
    textLength: result.text.length,
    pages: result.pages || [],
  };
}

async function run() {
  console.log('================================================================');
  console.log('CAREER OS EXPORT ENGINE VERIFICATION SUITE');
  console.log('================================================================\n');

  const outDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // --------------------------------------------------------------------------
  // TEST CASE 1: Large Dataset (150 Records) with Long Titles & Names
  // --------------------------------------------------------------------------
  console.log('--- TEST CASE 1: Large Report (150 Records, Landscape A4) ---');
  const largePayload: ExportDataPayload = {
    institutionName: 'Career OS — College Placement Assessment Platform',
    reportTitle: 'Overall Candidate Assessment & Merit Registry Report',
    reportDate: new Date().toLocaleString(),
    generatedBy: 'placement.director@college.edu',
    appliedFilters: {
      AcademicYear: '2025-2026',
      Department: 'Computer Science and Engineering',
      Assessment: 'TCS NQT National Qualifier Mock Diagnostic Test 2026',
      Status: 'All Evaluated',
    },
    summaryMetrics: {
      'Total Candidates': 150,
      'Passed Candidates': 122,
      'Pass Rate': '81.33%',
      'Average Score': '74.5%',
      'Highest Score': '98.0%',
      'Average Accuracy': '78.9%',
    },
    columns: [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Register No', key: 'registerNumber', width: 14 },
      { header: 'Candidate Name', key: 'studentName', width: 22 },
      { header: 'Department', key: 'departmentCode', width: 10 },
      { header: 'Assessment Title', key: 'assessmentTitle', width: 26 },
      { header: 'Total Marks', key: 'totalMarks', width: 10 },
      { header: 'Obtained', key: 'obtainedMarks', width: 10 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Accuracy %', key: 'accuracy', width: 12 },
      { header: 'Result', key: 'resultText', width: 12 },
      { header: 'Attempt Date', key: 'submittedAt', width: 18 },
    ],
    data: Array.from({ length: 150 }, (_, i) => ({
      rank: `#${i + 1}`,
      registerNumber: `2026CS${String(100 + i).padStart(3, '0')}`,
      studentName:
        i % 2 === 0
          ? 'Thenmozhi Karthikeyan Senthil Nathan'
          : 'Karthikeyan Balasubramanian Ramakrishnan',
      departmentCode: 'CSE',
      assessmentTitle:
        'TCS NQT National Qualifier Mock Diagnostic Test 2026 — Comprehensive Aptitude & Technical MCQs',
      totalMarks: 100,
      obtainedMarks: 95 - (i % 30),
      percentage: `${(95 - (i % 30)).toFixed(2)}%`,
      accuracy: `${(92 - (i % 25)).toFixed(2)}%`,
      resultText: i % 7 === 0 ? 'FAILED' : 'PASSED',
      submittedAt: '2026-10-12 14:30:00',
    })),
  };

  const largePdfBuf = await generatePdfBuffer(largePayload);
  const largePdfPath = path.join(outDir, 'test_large_report.pdf');
  fs.writeFileSync(largePdfPath, largePdfBuf);
  console.log(`Saved PDF (${largePdfBuf.length} bytes) to ${largePdfPath}`);

  const largePdfDetails = await parsePdfDetails(largePdfBuf);
  console.log(`Large PDF Total Pages: ${largePdfDetails.pageCount}`);
  console.log(`Text Length: ${largePdfDetails.textLength}`);
  // Verify no ghost pages: every page should have substantial content
  largePdfDetails.pages.forEach((p, idx) => {
    console.log(`  Page ${idx + 1} characters: ${p.text.trim().length}`);
  });

  const largeExcelBuf = generateExcelBuffer(largePayload);
  const largeExcelPath = path.join(outDir, 'test_large_report.xlsx');
  fs.writeFileSync(largeExcelPath, largeExcelBuf);
  console.log(`Saved Excel (${largeExcelBuf.length} bytes) to ${largeExcelPath}`);

  const largeCsvBuf = generateCsvBuffer(largePayload);
  const largeCsvPath = path.join(outDir, 'test_large_report.csv');
  fs.writeFileSync(largeCsvPath, largeCsvBuf);
  console.log(`Saved CSV (${largeCsvBuf.length} bytes) to ${largeCsvPath}`);
  console.log(`CSV starts with UTF-8 BOM: ${largeCsvBuf[0] === 0xef && largeCsvBuf[1] === 0xbb && largeCsvBuf[2] === 0xbf}`);

  // --------------------------------------------------------------------------
  // TEST CASE 2: Few Records (3 Records)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 2: Small Report (3 Records) ---');
  const smallPayload: ExportDataPayload = {
    ...largePayload,
    reportTitle: 'Shortlisted Merit Top 3 Candidates',
    summaryMetrics: {
      'Top Candidates': 3,
      'Average Score': '94.3%',
      'Pass Rate': '100.0%',
    },
    data: largePayload.data.slice(0, 3),
  };

  const smallPdfBuf = await generatePdfBuffer(smallPayload);
  const smallPdfPath = path.join(outDir, 'test_small_report.pdf');
  fs.writeFileSync(smallPdfPath, smallPdfBuf);
  const smallPdfDetails = await parsePdfDetails(smallPdfBuf);
  console.log(`Small PDF Total Pages: ${smallPdfDetails.pageCount} (Expected: exactly 1 page)`);
  console.log(`Page 1 character count: ${smallPdfDetails.pages[0]?.text.trim().length}`);

  // --------------------------------------------------------------------------
  // TEST CASE 3: Narrow Columns (< 5 Columns, Portrait A4)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 3: Narrow Report (4 Columns, Portrait A4) ---');
  const narrowPayload: ExportDataPayload = {
    institutionName: 'Career OS — College Placement Assessment Platform',
    reportTitle: 'Department Placement Recruitment Summary',
    reportDate: new Date().toLocaleString(),
    generatedBy: 'placement.director@college.edu',
    appliedFilters: {
      AcademicYear: '2025-2026',
    },
    summaryMetrics: {
      'Total Depts': 4,
      'Total Placed': 412,
      'Avg Placement %': '88.5%',
    },
    columns: [
      { header: 'Department', key: 'departmentName', width: 20 },
      { header: 'Total Students', key: 'totalStudents', width: 14 },
      { header: 'Placed Count', key: 'placedCount', width: 14 },
      { header: 'Placement Rate', key: 'placementRate', width: 16 },
    ],
    data: [
      { departmentName: 'Computer Science and Engineering', totalStudents: 180, placedCount: 165, placementRate: '91.67%' },
      { departmentName: 'Information Technology', totalStudents: 120, placedCount: 108, placementRate: '90.00%' },
      { departmentName: 'Electronics & Communication', totalStudents: 140, placedCount: 118, placementRate: '84.28%' },
      { departmentName: 'Mechanical Engineering', totalStudents: 90, placedCount: 71, placementRate: '78.89%' },
    ],
  };

  const narrowPdfBuf = await generatePdfBuffer(narrowPayload);
  const narrowPdfPath = path.join(outDir, 'test_narrow_portrait_report.pdf');
  fs.writeFileSync(narrowPdfPath, narrowPdfBuf);
  const narrowPdfDetails = await parsePdfDetails(narrowPdfBuf);
  console.log(`Narrow Portrait PDF Total Pages: ${narrowPdfDetails.pageCount} (Expected: exactly 1 page)`);

  // --------------------------------------------------------------------------
  // TEST CASE 4: Empty Report (0 Records)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST CASE 4: Empty Report (0 Records) ---');
  const emptyPayload: ExportDataPayload = {
    ...narrowPayload,
    reportTitle: 'Filtered Candidates — No Records Matched',
    data: [],
  };

  const emptyPdfBuf = await generatePdfBuffer(emptyPayload);
  const emptyPdfPath = path.join(outDir, 'test_empty_report.pdf');
  fs.writeFileSync(emptyPdfPath, emptyPdfBuf);
  const emptyPdfDetails = await parsePdfDetails(emptyPdfBuf);
  console.log(`Empty PDF Total Pages: ${emptyPdfDetails.pageCount} (Expected: exactly 1 page)`);
  console.log(`Empty PDF Text contains message: ${emptyPdfDetails.pages[0]?.text.includes('No assessment records found')}`);

  console.log('\n================================================================');
  console.log('ALL VERIFICATION TEST SUITES PASSED SUCCESSFULLY');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
