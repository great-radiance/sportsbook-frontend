const fs = require("fs");
const path = require("path");

const localesDir = __dirname;
const enPath = path.join(localesDir, "en.json");
const otherLocales = [
  "ar",
  "az",
  "de",
  "el",
  "es",
  "fa",
  "fr",
  "he",
  "it",
  "pt",
  "ru",
  "tr",
];

function deepMergeKeys(target, source) {
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      target[key] = source[key];
    } else if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMergeKeys(target[key], source[key]);
    }
  }
  return target;
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

for (const locale of otherLocales) {
  const filePath = path.join(localesDir, `${locale}.json`);
  const content = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(content);
  deepMergeKeys(data, en);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}

console.log("Done. All locale files now have the same keys as en.json.");
