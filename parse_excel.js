const ExcelJS = require('exceljs');

async function parse() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('solan vibhag.xlsx');
  const ws = wb.worksheets[0];
  console.log("Worksheet:", ws.name);
  for (let i = 1; i <= 20; i++) {
    const row = ws.getRow(i);
    let values = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      values.push(`[${colNumber}] ${cell.value}`);
    });
    console.log(`Row ${i}:`, values.join(' | '));
  }
}
parse();
