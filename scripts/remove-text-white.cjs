const fs = require("fs");
const path = require("path");
const glob = require("glob");

const root = path.resolve(__dirname, "..");
const patterns = [
  "src/app/components/**/*.tsx",
  "src/app/components/**/*.ts",
  "src/app/pages/**/*.tsx",
  "src/app/pages/**/*.ts",
];

const regex = /\btext-white(?:\/\d{1,3})?\b/g;
const classAttrCleanup = /className=("|')([\s\S]*?)\1/g;

let processed = 0;
let changed = 0;

patterns.forEach((pattern) => {
  const files = glob.sync(pattern, { cwd: root, absolute: true });
  files.forEach((file) => {
    processed++;
    let content = fs.readFileSync(file, "utf8");
    const original = content;
    // Remove text-white tokens
    content = content.replace(regex, "");
    // Clean up multiple spaces inside className and stray spaces before closing quote
    content = content.replace(classAttrCleanup, (m, quote, inner) => {
      // Collapse multiple spaces
      const cleaned = inner.replace(/\s+/g, " ").trim();
      return `className=${quote}${cleaned}${quote}`;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      changed++;
      console.log(`Updated: ${path.relative(root, file)}`);
    }
  });
});

console.log(`Processed ${processed} files. Updated ${changed} files.`);
if (changed === 0) process.exit(1);
