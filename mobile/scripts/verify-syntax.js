const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

function checkDir(dir) {
  let hasErrors = false;
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (checkDir(full)) hasErrors = true;
    } else if (f.name.endsWith('.js') && !f.name.endsWith('.test.js')) {
      const code = fs.readFileSync(full, 'utf8');
      try {
        parser.parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'classProperties', 'exportDefaultFrom', 'optionalChaining', 'nullishCoalescingOperator']
        });
        console.log(`  ✅ Syntax valid: ${path.relative(path.join(__dirname, '..'), full)}`);
      } catch (err) {
        console.error(`  ❌ Syntax error in ${full}:`, err.message);
        hasErrors = true;
      }
    }
  }
  return hasErrors;
}

console.log('🧪 Verifying all mobile React Native screens and components syntax...');
const srcDir = path.join(__dirname, '../src');
const appFile = path.join(__dirname, '../App.js');

try {
  parser.parse(fs.readFileSync(appFile, 'utf8'), {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'exportDefaultFrom', 'optionalChaining', 'nullishCoalescingOperator']
  });
  console.log('  ✅ Syntax valid: App.js');
} catch (e) {
  console.error('  ❌ Syntax error in App.js:', e.message);
}

const failed = checkDir(srcDir);
if (failed) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL MOBILE SCREENS AND COMPONENTS PASSED SYNTAX & BABEL VERIFICATION!\n');
}
