const fs = require('fs');
const code = fs.readFileSync('app-data.js', 'utf8');
console.log('Total file length:', code.length);
const match = code.match(/"b64":\s*"([^"]+)"/);
if (match) {
    console.log('b64 string length:', match[1].length);
} else {
    console.log('b64 string not found!');
}
