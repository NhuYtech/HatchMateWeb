const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/@firebase/database/dist/index.esm.js',
  'node_modules/@firebase/database/dist/node-esm/index.node.esm.js',
  'node_modules/@firebase/database/dist/index.cjs.js',
  'node_modules/@firebase/database/dist/index.node.cjs.js',
  'node_modules/@firebase/database/dist/index.standalone.js'
];

let patchedCount = 0;

filesToPatch.forEach((relPath) => {
  const fullPath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace strict instanceof check and raw .split('/') call with safe duck-typing and safe split
    if (content.includes('if (childPathObj instanceof Path)') && content.includes('const childPieces = childPathObj.split(\'/\');')) {
      content = content.replace(
        'if (childPathObj instanceof Path)',
        'if (childPathObj instanceof Path || (childPathObj && Array.isArray(childPathObj.pieces_)))'
      );
      content = content.replace(
        'const childPieces = childPathObj.split(\'/\');',
        'const childPieces = typeof childPathObj === \'string\' ? childPathObj.split(\'/\') : String(childPathObj || \'\').split(\'/\');'
      );
      fs.writeFileSync(fullPath, content, 'utf8');
      patchedCount++;
    }
  }
});

console.log(`[Patch Firebase] Patched ${patchedCount} @firebase/database bundle file(s).`);
