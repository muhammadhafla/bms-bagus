const fs = require('fs');
const path = require('path');

function findUseStates(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findUseStates(filePath, fileList);
    } else if (file === 'page.tsx') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const states = lines.filter(line => line.includes('useState') && !line.trim().startsWith('//'));
      if (states.length > 0) {
        fileList.push({ path: filePath, states: states.map(s => s.trim()) });
      }
    }
  });

  return fileList;
}

const mainDir = path.join('c:', 'project', 'inventory', 'app', '(main)');
const results = findUseStates(mainDir);

results.forEach(res => {
  const relativePath = res.path.replace(mainDir, '');
  console.log(`\n--- ${relativePath} ---`);
  res.states.forEach(s => {
    // try to extract just the variable name
    const match = s.match(/const\s+\[(.*?)\]/);
    if (match) {
        console.log(`  - ${match[1].split(',')[0].trim()}`);
    } else {
        console.log(`  - ${s}`);
    }
  });
});
