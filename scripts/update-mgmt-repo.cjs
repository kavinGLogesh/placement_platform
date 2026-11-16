const fs = require('fs');
const file = 'backend/src/repositories/management.repository.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        const acadData = {
          tenthObtainedMarks: s.tenthObtainedMarks ?? null,
          tenthTotalMarks: s.tenthTotalMarks ?? null,
          tenthPercentage: s.tenthPercentage ?? null,
          twelfthObtainedMarks: s.twelfthObtainedMarks ?? null,
          twelfthTotalMarks: s.twelfthTotalMarks ?? null,
          twelfthPercentage: s.twelfthPercentage ?? null,
          ugDegree: s.ugDegree ?? null,
          ugStatus: s.ugStatus || 'STUDYING',
          ugCgpa: s.ugCgpa ?? cgpaVal,
          ugPercentage: s.ugPercentage ?? null,
          pgDegree: s.pgDegree ?? null,
          pgStatus: s.pgStatus ?? null,
          pgCgpa: s.pgCgpa ?? null,
          pgPercentage: s.pgPercentage ?? null,
          currentCgpa: s.ugCgpa ?? cgpaVal,
          overallPercentage: s.ugPercentage ?? null,
        };`;

const replacementStr = `        const acadData = {
          tenthBoard: s.tenthBoard ?? null,
          tenthPassingYear: s.tenthPassingYear ?? null,
          tenthObtainedMarks: s.tenthObtainedMarks ?? null,
          tenthTotalMarks: s.tenthTotalMarks ?? null,
          tenthPercentage: s.tenthPercentage ?? null,
          twelfthBoard: s.twelfthBoard ?? null,
          twelfthPassingYear: s.twelfthPassingYear ?? null,
          twelfthObtainedMarks: s.twelfthObtainedMarks ?? null,
          twelfthTotalMarks: s.twelfthTotalMarks ?? null,
          twelfthPercentage: s.twelfthPercentage ?? null,
          degreeLevel: s.degreeLevel || 'UG',
          ugDegree: s.ugDegree ?? null,
          ugBranch: s.ugBranch ?? null,
          ugStatus: s.ugStatus || 'STUDYING',
          ugCgpa: s.ugCgpa ?? cgpaVal,
          ugPercentage: s.ugPercentage ?? null,
          currentSemester: s.currentSemester ?? 1,
          activeBacklogs: s.activeBacklogs ?? 0,
          historyOfBacklogs: s.historyOfBacklogs ?? 0,
          pgDegree: s.pgDegree ?? null,
          pgStatus: s.pgStatus ?? null,
          pgCgpa: s.pgCgpa ?? null,
          pgPercentage: s.pgPercentage ?? null,
          currentCgpa: s.ugCgpa ?? cgpaVal,
          overallPercentage: s.ugPercentage ?? null,
        };`;

const targetCRLF = targetStr.replace(/\r?\n/g, '\r\n');
const replacementCRLF = replacementStr.replace(/\r?\n/g, '\r\n');

if (content.includes(targetCRLF)) {
  content = content.replace(targetCRLF, replacementCRLF);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated management.repository.ts with CRLF!');
} else {
  const targetLF = targetStr.replace(/\r?\n/g, '\n');
  const replacementLF = replacementStr.replace(/\r?\n/g, '\n');
  if (content.includes(targetLF)) {
    content = content.replace(targetLF, replacementLF);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully updated management.repository.ts with LF!');
  } else {
    console.error('Could not find target in management.repository.ts');
  }
}

