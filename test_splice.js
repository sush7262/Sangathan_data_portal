const ExcelJS = require('exceljs');
async function test() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('test');
  for (let i=1; i<=15; i++) ws.getRow(i).getCell(1).value = `Row ${i}`;
  ws.spliceRows(9, 4);
  console.log("After splice:");
  for (let i=1; i<=15; i++) console.log(`Row ${i}:`, ws.getRow(i).getCell(1).value);
}
test();
