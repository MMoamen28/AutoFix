const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/i18n/locales/en.json');
const arPath = path.join(__dirname, '../src/i18n/locales/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

function getFlattenedKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getFlattenedKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = new Set(getFlattenedKeys(en));
const arKeys = new Set(getFlattenedKeys(ar));

let hasErrors = false;

// Check missing in ar
for (const key of enKeys) {
  if (!arKeys.has(key)) {
    console.error(`❌ Key missing in ar.json: ${key}`);
    hasErrors = true;
  }
}

// Check missing in en
for (const key of arKeys) {
  if (!enKeys.has(key)) {
    console.error(`❌ Key missing in en.json: ${key}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n❌ i18n parity check failed! Please synchronize ar.json and en.json.');
  process.exit(1);
} else {
  console.log(`✅ i18n check passed: Both en.json and ar.json have ${enKeys.size} matching keys.`);
  process.exit(0);
}
