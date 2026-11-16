const fs = require('fs');
const file = 'backend/src/services/academic.service.ts';
let content = fs.readFileSync(file, 'utf8');

// Add detected mappings for UG & PG specific columns
const mappingAnchor = `      } else if (/^(historyofbacklogs|historyofarrears|totalbacklogs|standingarrears)$/.test(norm)) {
        detectedMapping['historyOfBacklogs'] = h;
      }`;

const newMappings = `      } else if (/^(historyofbacklogs|historyofarrears|totalbacklogs|standingarrears)$/.test(norm)) {
        detectedMapping['historyOfBacklogs'] = h;
      } else if (/^(ugcgpa|undergraduatecgpa|currentugcgpa|finalugcgpa)$/.test(norm)) {
        detectedMapping['ugCgpa'] = h;
      } else if (/^(ugpercentage|undergraduatepercentage|overallpercentage|percentage)$/.test(norm)) {
        detectedMapping['ugPercentage'] = h;
      } else if (/^(pgdegree|postgraduatedegree|pgprogram)$/.test(norm)) {
        detectedMapping['pgDegree'] = h;
      } else if (/^(pgstatus|postgraduatestatus)$/.test(norm)) {
        detectedMapping['pgStatus'] = h;
      } else if (/^(pgcgpa|postgraduatecgpa)$/.test(norm)) {
        detectedMapping['pgCgpa'] = h;
      } else if (/^(pgpercentage|postgraduatepercentage)$/.test(norm)) {
        detectedMapping['pgPercentage'] = h;
      }`;

const mappingAnchorCRLF = mappingAnchor.replace(/\r?\n/g, '\r\n');
const newMappingsCRLF = newMappings.replace(/\r?\n/g, '\r\n');
if (content.includes(mappingAnchorCRLF)) {
  content = content.replace(mappingAnchorCRLF, newMappingsCRLF);
} else {
  const mappingAnchorLF = mappingAnchor.replace(/\r?\n/g, '\n');
  const newMappingsLF = newMappings.replace(/\r?\n/g, '\n');
  content = content.replace(mappingAnchorLF, newMappingsLF);
}

// In row parsing: parse ugCgpa, ugPercentage, pgDegree, pgStatus, pgCgpa, pgPercentage
const targetParsingAnchor = `      const ugDegree = getVal('ugDegree') ? String(getVal('ugDegree')).trim() : 'B.Tech';
      const ugBranch = getVal('ugBranch') ? String(getVal('ugBranch')).trim() : null;
      let currentCgpa = getVal('currentCgpa') ? Number(getVal('currentCgpa')) : null;
      const activeBacklogs = getVal('activeBacklogs') !== '' && getVal('activeBacklogs') !== undefined ? Number(getVal('activeBacklogs')) : 0;
      const historyOfBacklogs = getVal('historyOfBacklogs') !== '' && getVal('historyOfBacklogs') !== undefined ? Number(getVal('historyOfBacklogs')) : 0;`;

const replacementParsingAnchor = `      const ugDegree = getVal('ugDegree') ? String(getVal('ugDegree')).trim() : 'B.Tech';
      const ugBranch = getVal('ugBranch') ? String(getVal('ugBranch')).trim() : null;
      let currentCgpa = getVal('currentCgpa') ? Number(getVal('currentCgpa')) : null;
      let ugCgpa = getVal('ugCgpa') ? Number(getVal('ugCgpa')) : currentCgpa;
      if (currentCgpa === null && ugCgpa !== null) currentCgpa = ugCgpa;
      if (ugCgpa === null && currentCgpa !== null) ugCgpa = currentCgpa;

      let ugPercentage = getVal('ugPercentage') ? Number(getVal('ugPercentage')) : null;
      if (ugPercentage === null && currentCgpa !== null) {
        ugPercentage = parseFloat((currentCgpa * 9.5).toFixed(2));
      }

      const pgDegree = getVal('pgDegree') ? String(getVal('pgDegree')).trim() : null;
      const pgStatus = getVal('pgStatus') ? String(getVal('pgStatus')).trim() : null;
      const pgCgpa = getVal('pgCgpa') ? Number(getVal('pgCgpa')) : null;
      let pgPercentage = getVal('pgPercentage') ? Number(getVal('pgPercentage')) : null;
      if (pgPercentage === null && pgCgpa !== null) {
        pgPercentage = parseFloat((pgCgpa * 9.5).toFixed(2));
      }

      const activeBacklogs = getVal('activeBacklogs') !== '' && getVal('activeBacklogs') !== undefined ? Number(getVal('activeBacklogs')) : 0;
      const historyOfBacklogs = getVal('historyOfBacklogs') !== '' && getVal('historyOfBacklogs') !== undefined ? Number(getVal('historyOfBacklogs')) : 0;`;

const targetParsingCRLF = targetParsingAnchor.replace(/\r?\n/g, '\r\n');
const replacementParsingCRLF = replacementParsingAnchor.replace(/\r?\n/g, '\r\n');
if (content.includes(targetParsingCRLF)) {
  content = content.replace(targetParsingCRLF, replacementParsingCRLF);
} else {
  const targetParsingLF = targetParsingAnchor.replace(/\r?\n/g, '\n');
  const replacementParsingLF = replacementParsingAnchor.replace(/\r?\n/g, '\n');
  content = content.replace(targetParsingLF, replacementParsingLF);
}

// In DTO: include ugCgpa, ugPercentage, pgDegree, pgStatus, pgCgpa, pgPercentage, overallPercentage
const targetDto = `        currentCgpa,
        activeBacklogs,
        historyOfBacklogs,
        semesters: semesters.length > 0 ? semesters : undefined,
      };`;

const replacementDto = `        currentCgpa,
        ugCgpa,
        ugPercentage,
        overallPercentage: ugPercentage,
        pgDegree,
        pgStatus,
        pgCgpa,
        pgPercentage,
        activeBacklogs,
        historyOfBacklogs,
        semesters: semesters.length > 0 ? semesters : undefined,
      };`;

const targetDtoCRLF = targetDto.replace(/\r?\n/g, '\r\n');
const replacementDtoCRLF = replacementDto.replace(/\r?\n/g, '\r\n');
if (content.includes(targetDtoCRLF)) {
  content = content.replace(targetDtoCRLF, replacementDtoCRLF);
} else {
  const targetDtoLF = targetDto.replace(/\r?\n/g, '\n');
  const replacementDtoLF = replacementDto.replace(/\r?\n/g, '\n');
  content = content.replace(targetDtoLF, replacementDtoLF);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated academic.service.ts!');

