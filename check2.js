const ExcelJS = require('exceljs');
const fs = require('fs');
const appData = fs.readFileSync('app-data.js', 'utf8');
const match = appData.match(/"b64":\s*"([^"]+)"/);
if (!match) throw new Error("no b64 found");
const b64 = match[1];
const wb = new ExcelJS.Workbook();
wb.xlsx.load(Buffer.from(b64, 'base64')).then(() => {
    const ws = wb.worksheets[0];
    for(let r=1; r<=10; r++) {
        const row = ws.getRow(r);
        row.eachCell((cell, colNumber) => {
            if (cell.value && String(cell.value).includes('नगर')) {
                console.log('Found in', cell.address, ':', cell.value);
            }
        });
    }
}).catch(console.error);
