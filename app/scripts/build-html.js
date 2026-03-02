/**
 * Build HTML from partials without changing runtime logic.
 *
 * Reads `src/index.html` as a template and replaces tokens like:
 *   <!-- PARTIAL: admin-panel -->
 * with the contents of:
 *   src/partials/admin-panel.html
 *
 * Writes the composed output to:
 *   src/index.generated.html
 */
const fs = require('fs');
const path = require('path');

const appDir = process.cwd();
const srcDir = path.join(appDir, 'src');
const templatePath = path.join(srcDir, 'index.html');
const partialsDir = path.join(srcDir, 'partials');
const outPath = path.join(srcDir, 'index.generated.html');

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function build() {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing template: ${templatePath}`);
  }
  const template = readFile(templatePath);

  const tokenRe = /<!--\s*PARTIAL:\s*([a-z0-9_-]+)\s*-->/gi;
  const used = new Set();
  const composed = template.replace(tokenRe, (_, name) => {
    const key = String(name || '').trim();
    used.add(key);
    const partialPath = path.join(partialsDir, `${key}.html`);
    if (!fs.existsSync(partialPath)) {
      throw new Error(`Missing partial for token "${key}": ${partialPath}`);
    }
    return readFile(partialPath).replace(/\r\n/g, '\n');
  });

  const header =
    '<!--\n' +
    '  AUTO-GENERATED FILE.\n' +
    '  Do not edit `index.generated.html` directly.\n' +
    '  Edit `index.html` and files in `src/partials/`, then rebuild.\n' +
    '-->\n';

  fs.writeFileSync(outPath, header + composed, 'utf8');
  return { outPath, used: Array.from(used) };
}

try {
  const res = build();
  // eslint-disable-next-line no-console
  console.log(`Built ${path.relative(appDir, res.outPath)} (partials: ${res.used.join(', ') || 'none'})`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('HTML build failed:', err && err.message ? err.message : err);
  process.exit(1);
}

