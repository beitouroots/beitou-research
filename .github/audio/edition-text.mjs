// Prints the exact script the page's read-aloud player would speak for one edition,
// one sentence per line, so the generated MP3 matches the on-page reader word for word.
// It runs the page's own inline script in a simulated browser and asks it for the lines
// (loadEdition -> A.sents), so there is no second copy of the text logic to drift.
//
// usage: node edition-text.mjs am|pm [path/to/index.html] [--date]
//   --date prints just that edition's masthead date (what the page matches the MP3 against).
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const which = process.argv[2];
if (which !== 'am' && which !== 'pm') { console.error('usage: edition-text.mjs am|pm [index.html]'); process.exit(2); }
const args = process.argv.slice(3);
const wantDate = args.includes('--date');
const file = args.find(a => !a.startsWith('--')) || new URL('../../index.html', import.meta.url);

// Only the inline page script is needed; external scripts (subscribe.js, fonts) are never fetched.
const html = readFileSync(file, 'utf8');
const vc = new VirtualConsole(); // swallow page console noise
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://research.beitouroots.com/',
  virtualConsole: vc,
  beforeParse(w) {
    w.fetch = () => new Promise(() => {}); // ensureLatest(): never resolve, never hit the network
    w.scrollTo = () => {};
  },
});
const w = dom.window;

if (typeof w.loadEdition !== 'function' || !w.A) {
  console.error('page script did not expose loadEdition/A; the reader code may have changed');
  process.exit(1);
}
if (wantDate) {
  // Same lookup as the page's recEdDate().
  const ed = w.document.getElementById(which === 'am' ? 'ed-morning' : 'ed-afternoon');
  const d = ((ed && ed.querySelector('.subline b')) || {}).textContent || '';
  if (!d.trim()) { console.error('edition date not found'); process.exit(1); }
  process.stdout.write(d.trim() + '\n');
  process.exit(0);
}
w.loadEdition(which);
const lines = (w.A.sents || []).map(s => String(s).trim()).filter(Boolean);
if (lines.length < 10) {
  console.error(`only ${lines.length} lines extracted for ${which}; refusing to build thin audio`);
  process.exit(1);
}
process.stdout.write(lines.join('\n') + '\n');
w.close();
