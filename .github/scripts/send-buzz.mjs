// Build an email-safe HTML version of a Daily Buzz edition and send it via Resend.
// Runs inside GitHub Actions (which CAN reach api.resend.com, unlike the publish sandbox).
// Env: RESEND_API_KEY, BUZZ_SUBSCRIBERS (comma-separated). Arg: edition "am" | "pm".
import { readFileSync } from 'node:fs';
import { parse } from 'node-html-parser';

const EDITION = (process.argv[2] || process.env.EDITION || 'am').toLowerCase();
const isAM = EDITION === 'am';
const KEY = process.env.RESEND_API_KEY;
const SUBS = (process.env.BUZZ_SUBSCRIBERS || '').split(',').map(s => s.trim()).filter(Boolean);
const SITE = 'https://research.beitouroots.com';
const FROM = 'The Daily Buzz <research@beitouroots.com>';

if (!KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1); }
if (!SUBS.length) { console.error('No BUZZ_SUBSCRIBERS set; nothing to send.'); process.exit(0); }

// Brand (mirrors the website: morning = sunshine yellow fills + gold text; afternoon = violet)
const ACCENT = isAM ? '#c8870f' : '#7B4ADB';      // readable accent TEXT (gold / violet)
const SUN    = isAM ? '#ffc400' : '#9b7bf0';       // bright highlight FILL (BUZZ box)
const BTN_BG = isAM ? '#ffc400' : '#7B4ADB';       // CTA button fill (sunshine / violet)
const BTN_TX = isAM ? '#14161b' : '#ffffff';       // CTA button text (dark on yellow / white on violet)
const NAME   = isAM ? 'Morning' : 'Afternoon';
const TIME   = isAM ? '6 AM' : '2 PM';

const root = parse(readFileSync(new URL('../../index.html', import.meta.url), 'utf8'));
const ed = root.querySelector(isAM ? '#ed-morning' : '#ed-afternoon');
if (!ed) { console.error('Edition not found in index.html'); process.exit(1); }

const txt = (el) => (el ? el.structuredText.replace(/\s+/g, ' ').trim() : '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Masthead bits
const dateStr = txt(ed.querySelector('.subline b')) || '';
const tiles = ed.querySelectorAll('.tile').map(t => ({
  lbl: txt(t.querySelector('.t-lbl')),
  val: txt(t.querySelector('.t-val')),
  chg: txt(t.querySelector('.t-chg')),
  up: !!t.querySelector('.t-chg.up'),
}));

// Story cards (.vector) + Big Brain (.anchor)
const cards = ed.querySelectorAll('.vector, .anchor').map(card => {
  const head = card.querySelector('.vhead, h2');
  const tag = card.querySelector('.vtag');
  const bullets = card.querySelectorAll('.blist li').map(li => txt(li)).filter(Boolean);
  const sources = card.querySelectorAll('.sources a.chip').map(a => ({ name: txt(a), href: a.getAttribute('href') || SITE }));
  return { tag: txt(tag), head: txt(head), bullets, sources, anchor: card.classList.contains('anchor') };
});

// ---- email-safe HTML (tables + inline styles, light background for deliverability) ----
const tileCells = tiles.map(t => `
  <td align="center" valign="top" style="padding:8px 6px;border:2px solid #14161b;background:#ffffff;font-family:'Courier New',monospace;">
    <div style="font-size:10px;letter-spacing:.06em;color:#6b7280;text-transform:uppercase;">${esc(t.lbl)}</div>
    <div style="font-size:16px;font-weight:bold;color:#14161b;margin:3px 0;">${esc(t.val)}</div>
    <div style="font-size:11px;font-weight:bold;color:${t.up ? '#13864a' : '#cf3a20'};">${esc(t.chg)}</div>
  </td>`).join('');
// chunk tiles 3 per row
let tileRows = '';
for (let i = 0; i < tiles.length; i += 3) {
  tileRows += `<tr>${tiles.slice(i, i + 3).map(t => `
    <td align="center" valign="top" width="33%" style="padding:5px;">
      <a href="${SITE}" style="text-decoration:none;color:inherit;display:block;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #14161b;background:#ffffff;box-shadow:3px 3px 0 #14161b;">
        <tr><td align="center" style="padding:8px 4px;font-family:'Courier New',monospace;">
          <div style="font-size:10px;letter-spacing:.06em;color:#6b7280;text-transform:uppercase;">${esc(t.lbl)}</div>
          <div style="font-size:16px;font-weight:bold;color:#14161b;margin:3px 0;">${esc(t.val)}</div>
          <div style="font-size:11px;font-weight:bold;color:${t.up ? '#13864a' : '#cf3a20'};">${esc(t.chg)}</div>
        </td></tr>
      </table>
      </a>
    </td>`).join('')}</tr>`;
}

const cardBlocks = cards.map((c, i) => {
  const num = c.anchor ? '🧠' : String(i + 1).padStart(2, '0');
  const bullets = c.bullets.map(b => `<li style="margin:0 0 8px;line-height:1.5;">${esc(b)}</li>`).join('');
  const srcs = c.sources.length ? `<div style="margin-top:10px;font-family:'Courier New',monospace;font-size:11px;">${c.sources.map(s => `<a href="${esc(s.href)}" style="color:${ACCENT};text-decoration:none;border:1px solid #d8d4c8;padding:3px 7px;margin-right:5px;display:inline-block;">${esc(s.name)}</a>`).join('')}</div>` : '';
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:2px solid #14161b;background:#ffffff;box-shadow:6px 6px 0 #14161b;">
    <tr>
      <td valign="top" width="54" align="center" style="padding:18px 0;border-right:2px solid #14161b;background:${c.anchor ? SUN : '#f6f3ec'};font-family:'Arial Black',Arial,sans-serif;font-weight:bold;font-size:18px;color:#14161b;">${num}</td>
      <td valign="top" style="padding:16px 18px;">
        <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${ACCENT};font-weight:bold;margin-bottom:6px;">${esc(c.tag)}</div>
        <div style="font-family:Arial,sans-serif;font-weight:bold;font-size:18px;color:#14161b;line-height:1.25;margin-bottom:10px;">${esc(c.head)}</div>
        <ul style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:14px;color:#2f343c;">${bullets}</ul>
        ${srcs}
      </td>
    </tr>
  </table>`;
}).join('');

const subject = `${isAM ? '☕' : '🍸'} ${NAME} Buzz — ${dateStr}`;
const preheader = `Your ${NAME.toLowerCase()} markets readout, as of ${TIME} Pacific.`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eee9dd;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eee9dd;"><tr><td align="center" style="padding:18px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#14161b;padding:0 0 10px;">
    <a href="${SITE}" style="background:#7B4ADB;color:#fff;padding:3px 7px;font-weight:bold;text-decoration:none;">$</a><a href="${SITE}" style="text-decoration:none;color:#14161b;"> Beitou Roots <span style="color:#13864a;">Research</span></a>
  </td></tr>
  <tr><td style="background:#ffffff;border:2px solid #14161b;box-shadow:8px 8px 0 #14161b;padding:24px;">
    <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:8px;"><a href="${SITE}" style="text-decoration:none;color:${ACCENT};">${isAM ? '☕ Your 6 AM jolt' : '🍸 The closing-bell rundown'}</a></div>
    <div style="font-family:'Arial Black',Arial,sans-serif;font-weight:bold;font-size:34px;text-transform:uppercase;line-height:1;"><a href="${SITE}" style="text-decoration:none;color:#14161b;">${NAME} </a><a href="${SITE}" style="background:${SUN};color:#14161b;padding:2px 8px;text-decoration:none;">Buzz</a></div>
    <div style="font-family:'Courier New',monospace;font-size:12px;margin-top:12px;"><a href="${SITE}" style="text-decoration:none;color:#5f6675;">📅 <b style="color:#14161b;">${esc(dateStr)}</b> &nbsp;·&nbsp; as of ${TIME} Pacific</a></div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;">${tileRows}</table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;"><tr><td align="center">
      <a href="${SITE}" style="display:inline-block;background:${BTN_BG};color:${BTN_TX};font-family:Arial,sans-serif;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 28px;border:2px solid #14161b;box-shadow:4px 4px 0 #14161b;">▶ Play the audio &amp; read it on the web</a>
    </td></tr></table>
  </td></tr>

  <tr><td style="padding:22px 0 0;">${cardBlocks}</td></tr>

  <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;padding:8px 4px 30px;text-align:center;line-height:1.6;">
    You're receiving The Daily Buzz from Beitou Roots Research.<br>
    <a href="${SITE}" style="color:${ACCENT};">Read online</a> &nbsp;·&nbsp; <a href="{{UNSUB}}" style="color:#6b7280;">Unsubscribe</a><br>
    <span style="color:#9aa1ab;">Beitou Roots, Inc.</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

// ---- send via Resend (one message per subscriber so each can have its own unsubscribe) ----
let ok = 0, fail = 0;
for (const to of SUBS) {
  const unsub = `mailto:research@beitouroots.com?subject=Unsubscribe%20${encodeURIComponent(to)}`;
  const body = {
    from: FROM,
    to: [to],
    subject,
    html: html.replace('{{UNSUB}}', unsub),
    headers: { 'List-Unsubscribe': `<${unsub}>` },
  };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) { ok++; console.log('sent ->', to); }
    else { fail++; console.error('FAILED ->', to, r.status, await r.text()); }
  } catch (e) { fail++; console.error('ERROR ->', to, e.message); }
}
console.log(`Done. sent=${ok} failed=${fail} edition=${EDITION} subject="${subject}"`);
if (fail) process.exit(1);
