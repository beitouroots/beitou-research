#!/usr/bin/env python3
"""Catch an edition whose story sections were carried over from the previous one.

On 11/5 the writer refreshed the scoreboard tiles (S&P -4.36%) but left every section
below them word for word from 11/4's rally edition, so the page and email said stocks
rose on a day they tanked. Every other check passed, because the page was edited and valid.

usage: check-fresh.py am|pm NEW_HTML OLD_HTML
  OLD_HTML is the page as it was before the writer ran (git show HEAD:index.html).
Exits 1, with the reason, if the edition looks stale; 0 otherwise.
"""
import html
import re
import sys

STALE_LIMIT = 0.5  # fail if more than half the section lines are unchanged from last time


def edition(page, ed):
    start = page.find(f'id="ed-{"morning" if ed == "am" else "afternoon"}"')
    if start < 0:
        sys.exit(f"edition {ed} not found")
    ends = [i for i in (page.find('id="ed-', start + 10), page.find("<script", start)) if i > 0]
    return page[start:min(ends) if ends else len(page)]


def text(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def section_lines(seg):
    """Headlines and bullets of the numbered story sections (everything below the tiles)."""
    body = seg[seg.find('class="vector'):] if 'class="vector' in seg else ""
    lines = re.findall(r'<h3 class="vhead">(.*?)</h3>|<li>(.*?)</li>', body, re.S)
    return [t for t in (text(a or b) for a, b in lines) if len(t) > 25]


def main():
    ed, new_path, old_path = sys.argv[1:4]
    new = edition(open(new_path, encoding="utf-8").read(), ed)
    old = edition(open(old_path, encoding="utf-8").read(), ed)
    problems = []

    new_lines, old_lines = section_lines(new), set(section_lines(old))
    if not new_lines:
        problems.append("no story sections found")
    else:
        same = [l for l in new_lines if l in old_lines]
        ratio = len(same) / len(new_lines)
        print(f"{len(same)} of {len(new_lines)} section lines unchanged from the previous {ed} edition")
        if ratio > STALE_LIMIT:
            problems.append(
                f"{ratio:.0%} of the story sections are copied from the previous edition, "
                f"e.g. \"{same[0][:120]}\""
            )

    # The closing rundown must report the same S&P move as its own scoreboard tile.
    if ed == "pm":
        m = re.search(r'S&amp;P 500</div>.*?class="t-chg[^"]*">\s*([+-]?)([\d.]+)%', new, re.S)
        if m:
            pct = float(m.group(2))
            body = text(new[new.find('class="vector'):])
            forms = {f"{pct:.2f}%", f"{pct:.1f}%", f"{pct:g}%"}
            if not any(f in body for f in forms):
                problems.append(
                    f"the S&P tile says {m.group(1)}{m.group(2)}% but no section mentions that move"
                )

    for p in problems:
        print(f"::error::Stale or inconsistent {ed} edition: {p}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
