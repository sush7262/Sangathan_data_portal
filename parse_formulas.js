const ExcelJS = require('exceljs');

async function parseFormulas() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('solan vibhag.xlsx');
  const ws = wb.worksheets[0];
  
  console.log("Row 8 (Vibhag Yog) Formulas:");
  ws.getRow(8).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.formula) console.log(`[${colNumber}] ${cell.formula}`);
  });

  console.log("Row 9 (District 1) Formulas:");
  ws.getRow(9).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (cell.formula) console.log(`[${colNumber}] ${cell.formula}`);
  });
}
parseFormulas();
