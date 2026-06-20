const ExcelJS = require('exceljs');
const fs = require('fs');
const appData = fs.readFileSync('app-data.js', 'utf8');
let js = fs.readFileSync('app.js', 'utf8');
const mock = `
const window = global;
window.atob = (s) => Buffer.from(s, 'base64').toString('binary');
window.toast = console.log;
window.dl = () => {};
const document = {createElement: () => ({style:{}, click: () => {}})};
`;

js = js.replace(/function toast/g, 'window.toast = function');
js = js.replace(/function downloadAck/g, 'window.downloadAck = function');
js = js.replace(/function printReport/g, 'window.printReport = function');
js = js.replace(/function exportCSV/g, 'window.exportCSV = function');
js = js.replace(/async function downloadExcel/g, 'window.downloadExcel = async function');
js = js.replace(/new Promise\(\(resolve\) => setTimeout\(resolve, 50\)\);/g, 'await Promise.resolve();');

eval(mock + appData + js + '; window.downloadExcel([\'सोलन\', \'नालागढ़\'], \'test.xlsx\').catch(console.error);');
