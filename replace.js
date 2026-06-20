const fs = require('fs');
let code = fs.readFileSync('app-data.js', 'utf8');
code = code.replace(/अन्य नगर/g, 'नगर');
fs.writeFileSync('app-data.js', code, 'utf8');
console.log('Replaced successfully');
