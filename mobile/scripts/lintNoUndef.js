const fs = require('fs');
const path = require('path');
const parser = require('../node_modules/@babel/parser');
const traverse = require('../node_modules/@babel/traverse').default;

const GLOBALS = new Set([
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Math', 'Date', 'JSON', 'Promise', 'String', 'Number', 'Boolean', 'Array',
  'Object', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  '__DEV__', 'global', 'process', 'window', 'module', 'exports', 'require',
  'fetch', 'alert', 'requestAnimationFrame', 'cancelAnimationFrame', 'undefined',
  'NaN', 'Infinity', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Symbol', 'Buffer',
  'navigator', 'location', 'document'
]);

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.resolve(__dirname, '../src');
const files = getFiles(srcDir);
files.push(path.resolve(__dirname, '../App.js'));

let totalErrors = 0;
const errorReports = [];

for (const filePath of files) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (err) {
    console.error(`Syntax error in ${filePath}:`, err.message);
    totalErrors++;
    continue;
  }

  const fileUndeclared = [];

  traverse(ast, {
    ReferencedIdentifier(path) {
      const name = path.node.name;
      // Skip globals
      if (GLOBALS.has(name)) return;
      // Skip JSX closing element tags matching component
      if (path.parent.type === 'JSXClosingElement') return;
      // Check if binding exists in current or any parent scope
      if (!path.scope.hasBinding(name)) {
        fileUndeclared.push({ name, loc: path.node.loc?.start });
      }
    }
  });

  if (fileUndeclared.length > 0) {
    totalErrors += fileUndeclared.length;
    errorReports.push({ file: path.relative(path.resolve(__dirname, '..'), filePath), errors: fileUndeclared });
  }
}

console.log('==================================================================');
console.log(`🔍 STATIC ANALYSIS LINT REPORT (ESLint "no-undef" equivalent)`);
console.log(`Scanned ${files.length} files in mobile/`);
console.log('==================================================================');

if (totalErrors === 0) {
  console.log('✅ ZERO UNDEFINED VARIABLES FOUND! Every identifier across the app is properly declared.');
} else {
  console.log(`❌ Found ${totalErrors} undeclared variable references:`);
  for (const rep of errorReports) {
    console.log(`\n📄 ${rep.file}:`);
    for (const err of rep.errors) {
      console.log(`   - Line ${err.loc?.line || '?'}:${err.loc?.column || '?'}: "${err.name}" is not defined`);
    }
  }
}
console.log('==================================================================\n');

process.exit(totalErrors > 0 ? 1 : 0);
