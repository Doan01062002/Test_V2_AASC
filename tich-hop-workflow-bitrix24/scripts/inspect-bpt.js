const fs = require('fs');
const zlib = require('zlib');

function inspectBpt(filePath) {
  console.log(`=== Inspecting ${filePath} ===`);
  const buf = fs.readFileSync(filePath);
  const text = zlib.inflateSync(buf).toString('utf-8');
  
  // Find types and titles
  const regex = /s:4:"Type";s:\d+:"([^"]+)";s:4:"Name";s:\d+:"([^"]+)";.*?s:5:"Title";s:\d+:"([^"]+)"/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    console.log(`Type: ${match[1]}, Title: ${match[3]}`);
  }

  // Look for fields / parameters
  const paramRegex = /s:10:"PARAMETERS";a:\d+:\{(.*?)\}s:\d+:"/s;
  const pMatch = text.match(paramRegex);
  if (pMatch) {
    console.log('Parameters found:');
    const fieldRegex = /s:\d+:"([^"]+)";a:\d+:\{s:4:"Name";s:\d+:"([^"]+)"/g;
    let f;
    while ((f = fieldRegex.exec(pMatch[1])) !== null) {
      console.log(`  - ${f[1]}: ${f[2]}`);
    }
  } else {
    console.log('No PARAMETERS block found or different structure');
  }
}

inspectBpt('exports/ChiPhiCongTac_4Cap.bpt');
console.log('\n');
inspectBpt('exports/NghiPhep_3Cap.bpt');
