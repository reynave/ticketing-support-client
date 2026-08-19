const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'build-info.ts');
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const datePart = [
  String(now.getFullYear()).slice(-2),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
].join('');
const timePart = [pad(now.getHours()), pad(now.getMinutes())].join('');
const buildCode = `${datePart}.${timePart}`;

const content = `export const buildInfo = {\n  buildCode: '${buildCode}',\n};\n`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log(`Build code generated: ${buildCode}`);
