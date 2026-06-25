// subscribe.js — the "Get The Daily Buzz" signup block at the bottom of the newsletter.
// Self-contained: injects its own markup + scoped styles into <div id="buzz-subscribe">,
// so the daily scheduled regen of index.html never has to know about it.
// Writes a create-only doc to Firestore (rules block reads/edits to the public).
import { firebaseConfig, COLLECTION } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const mount = document.getElementById('buzz-subscribe');
if (mount) {
  // ---- scoped styles (use the page's CSS vars so it adapts to morning light / afternoon dark) ----
  const style = document.createElement('style');
  style.textContent = `
    #buzz-subscribe .bsub{background:var(--panel);border:2px solid var(--line);box-shadow:8px 8px 0 var(--shadow);padding:26px 26px 22px;margin-top:34px;}
    #buzz-subscribe .bsub .bk{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--grass);margin:0 0 10px;}
    #buzz-subscribe .bsub h3{font-family:'Archivo Black',sans-serif;font-size:clamp(22px,4vw,30px);line-height:1.04;margin:0 0 8px;text-transform:uppercase;letter-spacing:-.01em;color:var(--ink);}
    #buzz-subscribe .bsub p.sub{font-size:14.5px;color:var(--muted);margin:0 0 18px;max-width:60ch;}
    #buzz-subscribe .bform{display:flex;flex-wrap:wrap;gap:10px;}
    #buzz-subscribe .bform input[type=email]{flex:1;min-width:220px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--ink);background:var(--panel-2);border:2px solid var(--line);box-shadow:4px 4px 0 var(--shadow);padding:13px 14px;outline:none;}
    #buzz-subscribe .bform input[type=email]:focus{border-color:var(--grass);}
    #buzz-subscribe .bform button{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;background:var(--grass);color:#0a0d13;border:2px solid var(--line);box-shadow:4px 4px 0 var(--shadow);padding:13px 22px;}
    #buzz-subscribe .bform button:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--shadow);}
    #buzz-subscribe .bform button[disabled]{opacity:.55;cursor:default;}
    #buzz-subscribe .bfine{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.04em;color:var(--muted);margin-top:13px;}
    #buzz-subscribe .bmsg{font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:14px;display:none;padding:11px 13px;border:2px solid var(--line);box-shadow:4px 4px 0 var(--shadow);}
    #buzz-subscribe .bmsg.ok{display:block;background:rgba(61,220,132,.10);border-color:var(--grass);color:var(--ink);}
    #buzz-subscribe .bmsg.err{display:block;background:rgba(255,107,74,.10);border-color:var(--ember);color:var(--ink);}
    #buzz-subscribe .bhp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}
  `;
  document.head.appendChild(style);

  // ---- markup ----
  mount.innerHTML = `
    <div class="bsub">
      <p class="bk">🐝 Never miss a drop</p>
      <h3>Get The Daily Buzz in your inbox</h3>
      <p class="sub">Two short, fun, fact-checked market reads a day: the Morning Buzz before the bell and the Afternoon Buzz after the close. Free, and you can unsubscribe in one click anytime.</p>
      <form class="bform" novalidate>
        <input type="email" name="email" placeholder="you@email.com" autocomplete="email" required aria-label="Email address">
        <input type="text" name="company" class="bhp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit">Subscribe</button>
      </form>
      <div class="bfine">Free · Two drops a day · Unsubscribe anytime</div>
      <div class="bmsg" role="status" aria-live="polite"></div>
    </div>`;

  const form = mount.querySelector('.bform');
  const input = form.querySelector('input[type=email]');
  const honey = form.querySelector('input[name=company]');
  const btn = form.querySelector('button');
  const msg = mount.querySelector('.bmsg');

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const show = (kind, text) => { msg.className = 'bmsg ' + kind; msg.textContent = text; };

  let db = null;
  try { db = getFirestore(initializeApp(firebaseConfig)); }
  catch (e) { console.error('Firebase init failed', e); }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (honey.value) return;                       // bot trap: silently drop
    const email = input.value.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { show('err', 'Please enter a valid email address.'); return; }
    if (!db) { show('err', 'Signup is warming up, please try again in a moment.'); return; }
    btn.disabled = true; btn.textContent = 'Joining…';
    try {
      await addDoc(collection(db, COLLECTION), {
        email,
        status: 'active',
        source: 'web',
        subscribedAt: serverTimestamp()
      });
      form.style.display = 'none';
      show('ok', "You're in! Your first Buzz lands at the next drop. Watch your inbox 🐝");
    } catch (e) {
      console.error(e);
      show('err', 'Something went wrong on our end. Please try again.');
      btn.disabled = false; btn.textContent = 'Subscribe';
    }
  });
}
