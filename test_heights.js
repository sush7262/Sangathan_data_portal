const ExcelJS = require('exceljs');
async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('solan vibhag.xlsx');
  const ws = wb.worksheets[0];
  console.log("Row 7 height:", ws.getRow(7).height);
  console.log("Row 8 height:", ws.getRow(8).height);
  console.log("Row 9 height:", ws.getRow(9).height);
  ws.spliceRows(9, 4);
  console.log("After splice:");
  console.log("Row 7 height:", ws.getRow(7).height);
  console.log("Row 8 height:", ws.getRow(8).height);
}
test();
