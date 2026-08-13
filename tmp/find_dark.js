const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let subdirs = fs.readdirSync(dir);
  let files = [];
  for (let file of subdirs) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.vite') continue;
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      files = files.concat(getFiles(filepath));
    } else if (file.endsWith('.tsx')) {
      files.push(filepath);
    }
  }
  return files;
}

const files = getFiles('.');
const tokensSet = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match tokens that contain dark:
  const tokens = content.split(/[\s"'`{}()<>\[\];,]+/);
  tokens.forEach(t => {
    if (t.includes('dark:')) {
      tokensSet.add(t);
    }
  });
});

console.log('Unique tokens containing dark:');
console.log(Array.from(tokensSet).sort());
