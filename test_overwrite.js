const ExcelJS = require('exceljs');
async function test() {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('solan vibhag.xlsx');
    const ws = wb.worksheets[0];
    
    // Simulate what we do
    const templateRowStyles = {};
    const templateRowFormulas = {};
    ws.getRow(9).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      templateRowStyles[colNumber] = cell.style;
      if (cell.formula) templateRowFormulas[colNumber] = cell.formula;
    });

    let currentRow = 9;
    const dists = ['Mandi', 'Kullu', 'Lahaul', 'Spiti', 'Extra']; // 5 districts
    
    dists.forEach(name => {
      const row = ws.getRow(currentRow);
      if (currentRow > 12) {
        for (let c = 1; c <= 150; c++) {
          const cell = row.getCell(c);
          if (templateRowStyles[c]) cell.style = templateRowStyles[c];
          if (templateRowFormulas[c]) {
             cell.value = { formula: templateRowFormulas[c].replace(/\b([A-Z]+)9\b/g, `$1${currentRow}`) };
          }
        }
      }
      row.getCell('A').value = currentRow - 8;
      row.getCell('B').value = 'Test';
      row.getCell('C').value = name;
      currentRow++;
    });

    for (let r = currentRow; r <= 15; r++) {
      const row = ws.getRow(r);
      row.getCell('A').value = null;
      row.getCell('B').value = null;
      row.getCell('C').value = null;
    }

    await wb.xlsx.writeFile('output2.xlsx');
    console.log("Success! No shared formula errors.");
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
