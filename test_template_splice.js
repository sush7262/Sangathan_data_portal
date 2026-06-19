const ExcelJS = require('exceljs');
async function test() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('solan vibhag.xlsx');
  const ws = wb.worksheets[0];
  ws.spliceRows(9, 10);
  ws.insertRow(9, []);
  ws.getRow(9).getCell(1).value = "INSERTED";
  await wb.xlsx.writeFile('output.xlsx');
  console.log("Done");
}
test();
