const fs = require('fs');

// 1. Fix management.service.ts line 723
const mgmtFile = 'backend/src/services/management.service.ts';
let mgmtContent = fs.readFileSync(mgmtFile, 'utf8');

const oldPctStr = 'const overallPct = row.ugPercentage ?? ((row.cgpa ?? row.ugCgpa) ? parseFloat(((row.cgpa ?? row.ugCgpa) * 9.5).toFixed(2)) : undefined);';
const newPctStr = 'const cgpaCandidate = row.cgpa ?? row.ugCgpa;\n      const overallPct = row.ugPercentage ?? (cgpaCandidate !== undefined && cgpaCandidate !== null ? parseFloat((cgpaCandidate * 9.5).toFixed(2)) : undefined);';

mgmtContent = mgmtContent.replace(oldPctStr, newPctStr);
fs.writeFileSync(mgmtFile, mgmtContent, 'utf8');
console.log('Fixed management.service.ts line 723!');

// 2. Fix placement-drive.service.ts _academicRepo
const driveFile = 'backend/src/services/placement-drive.service.ts';
let driveContent = fs.readFileSync(driveFile, 'utf8');

driveContent = driveContent.replace(
  'private academicRepo: AcademicRepository = academicRepository',
  'private _academicRepo: AcademicRepository = academicRepository'
);
fs.writeFileSync(driveFile, driveContent, 'utf8');
console.log('Fixed placement-drive.service.ts _academicRepo!');

