# The Daily Buzz — Edition Specification

> This is the locked spec an automated run needs to generate an edition faithfully.
> It is deliberately scrubbed: no credentials, no business data, no personal
> information, no operational history. This repository is PUBLIC. Never add any
> of those categories to this file.

Product: **Beitou Roots Research — "The Daily Buzz"**, a markets newsletter published twice per weekday.

## 1. Editions

- **Morning Buzz** — 6 AM PT, pre-market setup. Accent: amber, emoji ☕.
- **Afternoon Buzz** — 2 PM PT, post-market close plus earnings and reactions. Accent: violet, emoji 🍸.
- Delivery target: verified edition live by **6:15 AM PT** (before the 6:30 PT open) and by **~2:00 PM PT** (2:15 latest).
- The site is a single **time-aware reader**: it shows Morning Buzz before 2:30 PM PT and Afternoon Buzz after; a ☕/🍸 toggle lets readers switch either way.
- Morning renders in **LIGHT mode**; Afternoon renders in **DARK mode**.

## 2. Locked structure of an edition

Six modules, in this order:

1. Story 01
2. Story 02
3. Story 03
4. Story 04
5. **🐝 What's Buzzing** — section label exactly `🐝 What's Buzzing · trending on fintwit`. Cube shows **"05"** so the lineup reads 01-05. Class `vector cx`, accent var `--xf:#2aa3ff`.
6. **🧠 The Big Brain** — the macro anchor, a 6-12 month view. Rendered as the `.anchor` card (stays DARK even in light mode).

Section labels:
- Morning: `☕ Before the bell`
- Afternoon: `🍸 How the day actually went`

Every story uses bullet points with **bold lead-ins**, e.g. "The tea", "The setup", "The play", "TL;DR".

Every story carries **2-3 source chips**. Multi-sourcing is non-negotiable; single-outlet sourcing is not acceptable.

The Afternoon edition carries an **"On Deck"** card naming companies reporting after the edition goes out.

Afternoon card titles, in order: 01 `🔔 The Close`, 02 `🟢 Winners & 🔴 Losers`, 03 `💥 The Standout`, 04 `👀 On Deck`.

## 3. Masthead and ticker tiles

- Masthead holds the kicker, title, date, and **6 ticker tiles** inside `<div class="ticker">`.
- Keep tile labels standard so symbol mapping works: **S&P 500, Nasdaq, Dow, Russell 2K, 10Y UST, WTI, Brent**.
- Morning tiles show **current PRE-MARKET data** — index futures level plus the overnight/pre-market % move into the open, never yesterday's close. A small `📊 Pre-market` label `<div>` goes immediately before `<div class="ticker">`.
- Afternoon tiles show **the day's close**.
- `.t-chg` may contain only clear standard descriptors: a % change, or All-Time High / Record High / 52-Wk High-Low / N-Month High / Yield Up-Down. **No slang** in `.t-chg`.
- Tiles link to StockTwits via `ST_MAP` and `linkifyTiles()`. `ST_MAP` = **SPY, QQQ, DIA, IWM, USO, BNO** only. Never map an instrument without a live priced StockTwits feed (yields/10Y UST are deliberately non-clickable).

## 4. Voice and tone (locked)

- Fun and casual, in the register of StockTwits **"The Daily Rip"**: short sentences, plain English, emojis used as punctuation, trader slang, a wink.
- NOT dry and institutional.
- Morning copy is a motivating pre-open kickoff; afternoon copy is a wind-down.

## 5. House style rules

- **Em-dash ban.** Do not use em dashes anywhere in the copy.
- **Tilde rule.** Never prefix a precise figure with `~` (write `-4.1%`, not `~-4.1%`). Use `~` only for genuinely rounded estimates, sparingly.
- **No invented characterization.** Never add a gloss, motive, or explanation that the sources do not state.
- **Never use 🔺/🔻 as up/down indicators** (both read red-ish and invert the meaning). Use 🟢/🔴 or plain wording.
- Emojis are part of the format: ☕ morning, 🍸 afternoon, 🐝 What's Buzzing, 🧠 Big Brain, 📊 pre-market label.
- Every edition ends with a self-QC pass against these style rules.
- **Curly/smart quotes are a hazard in JS strings.** Only ever write straight quotes inside `VO` and `BOOK`.

## 6. Accuracy and sourcing standards

**TICKER ACCURACY RULE.** Every ticker percentage (single stocks, indices, tiles) must be the official **CLOSE**, or explicitly labeled pre-market for the AM edition. Intraday swings may be cited only to show volatility and must be **labeled intraday**.

**SINGLE-STOCK ACCURACY RULE.** Name the ticker and the share class (GOOGL vs GOOG). If sources diverge, give a range.

**What's Buzzing numbers rule.** Cite a ticker's **daily price move** (real, sourced). **Never** cite social mention-volume percentages (e.g. "mentions up 11,700%"). Qualitative phrasing like "topping the mention boards" is fine.

**Earnings rule (Afternoon).** Only verified, released earnings get numbers. Marquee after-hours reporters that print after the edition are **named** in the On Deck card and the VO ("reporting after this edition: ..., we'll cover the reaction tomorrow"), never guessed at. At most one search to name them; never wait on or poll for their numbers.

**SOURCE DIVERSITY RULE.** Do not lean on the same two or three outlets. Use a broad mix of tier-1 wires and papers, **primary sources** (Fed, BLS, EIA, SEC filings/8-K, company earnings releases), and independent fintwit voices (public posts only).

**What's Buzzing sourcing.** StockTwits trending, Reddit/WSB trackers (altindex, swaggystocks, tradestie), Google Trends. Fresher is better.

**Self-fact-check.** One time-boxed self-fact-check pass: switch hats and re-verify every ticker, event, and number from scratch against primary sources; fix, cut, or soften anything unverified. Cap it (~10 minutes, <=2 fresh searches per claim, one pass, no second loop). An unverifiable number gets softened ("fell") or cut. If an edition cannot be made trustworthy, do not publish; keeping yesterday's verified edition live is the safe outcome.

## 7. Design system

"Crossy Road" blocky-grid aesthetic: grid background, chunky offset-shadow cards, lane stripe, a color cube per story.
Fonts: **Archivo Black**, **Space Grotesk**, **JetBrains Mono** (Google CDN). Single self-contained HTML file.

Light-mode (morning) color rules:
- `--bg` bright warm white `#fffdf7`, `--panel-2` `#fdf8ee`.
- **Decorative fills** may be sunshine yellow `#ffc400` (even lane `#ffe082`): the `.pop` BUZZ box, odd lanes, `.audio .play`, the `.sec::before` square.
- **Text accents must stay readable gold `#d98a16`** (kicker, `.a-title`, `.cbtn`, `.vsel`). Fills can be sunshine, text must stay gold.
- Story body text in light mode is dark: `body.lightmode .vector .blist li{color:#2f343c}`. The `.anchor` card stays dark.

## 8. HTML/JS elements an edit MUST preserve

A regeneration rewrites **only the story sections and the VO/BOOK strings**. It must never touch the CSS or the audio JavaScript. Specifically preserve:

- The two edition containers `#ed-morning` and `#ed-afternoon` (rewrite only the one you own; leave the other byte-for-byte untouched).
- Card classes: `.vector`, `.vector.cx`, `.anchor`, `.vhead`/`h2`, `.blist li`, `.sources`, `.sec`, `.tile` / `.t-chg` / `.ticker`, `.pop`, `.lane`, `.kicker`, `.a-title`, `.audio .play`, `.actrl .cbtn`, `.vsel`.
- Audio player internals: state object `A`; functions `audioToggle`, `audioSeek`, `audioSpeed`, `audioStop`, `toSentences`, `articleSentences`, `cleanSpeak`, `phon`, `audioVoice`, `dailyBook`, `dateStamp`, `expandDate`, `show`, `loadEdition`, `linkifyTiles`.
- The hardened audio + freshness layer: `chunkLine`, `speakIdx` (including its `advance` handler and `u.onerror`), `ensureLatest`, `docSig`, and the `pageshow` / `visibilitychange` / `focus` listeners. These fix silent audio death and stale restored tabs. Do not simplify them away.
- `body.lightmode` CSS overrides, the `show()` lightmode toggle, and `ST_MAP`.
- `var SIGNOFF = { am, pm }` (static).
- The subscribe anchor `<div id="buzz-subscribe">` at the BOTTOM of index.html, outside both edition divs, and the `./subscribe.js` script tag. A regen must not strip either.

## 9. Audio / read-aloud

- Each edition has a ▶ live read-aloud player on the browser **Web Speech API** (device voice, no paid TTS).
- One read mode: **Full**, word-for-word from the rendered DOM. `articleSentences(which)` walks the active edition's `.vector` and `.anchor` cards, taking `.vhead`/`h2` plus every `.blist li`, skipping `.sources`.
- `cleanSpeak` strips emoji and normalizes: `~` -> "about", `&` -> "and", digit-hyphen-digit -> "to".
- `phon()` respells for the voice only: **Beitou -> "Bay-toe"**, fintwit -> "fin-twit".
- Playback speeds: **1x / 1.25x / 1.5x** only. Seeking is **by sentence**.
- Every read is assembled as: **date stamp -> intro bookend -> article sentences -> outro bookend -> sign-off**.
- `SIGNOFF` is the final line: "And that is the Morning/Afternoon Buzz from Beitou Roots Research. You are all caught up, and we will be back this afternoon / bright and early."

## 10. The BOOK object (hype bookends)

```js
var BOOK = { am: { intro: "", outro: "" }, pm: { intro: "", outro: "" } };
```

- The Full read prefers `BOOK[edition]` when non-empty, else falls back to `dailyBook()`.
- Each run rewrites **only its own edition's BOOK line** with fresh, news-aware hype:
  - **am** = a motivating pre-open kickoff nodding to the day's catalyst, plus a send-off teasing what is next.
  - **pm** = a wind-down nodding to the day's move, plus a tease of tomorrow.
- Bookends must be **different every day**.
- Hard constraints: **no `"` characters inside the BOOK strings** (it breaks the JS). No em dashes. Spell "Beitou Roots Research" in full. Leave the other edition's line untouched.

## 11. The VO strings

`VO.am` / `VO.pm` are condensed summary scripts. Still written by each run but no longer used by playback; retained for email reuse. When a displayed figure is corrected, make the same correction in the VO.

## 12. Email edition (structure only)

The email mirrors the brand: masthead + BUZZ highlight box + the 6 cards + a "▶ Play & read on the web" button + unsubscribe footer. It parses `#ed-morning` / `#ed-afternoon` out of index.html.

- Subject format: `☕ Morning Buzz - <Wed, Jun 24, 2026>` (violet 🍸 variant for afternoon).
- Date line appends `· pre-market` (am) or `· market close` (pm).
- CTA button: sunshine yellow `#ffc400` with dark text for am, violet `#7B4ADB` with white text for pm.
- **HTML-email rule:** Gmail strips `background-color` from a `<span>` nested inside an `<a>`. Put every color fill on its own `<a>` or `<td>`.
