#!/usr/bin/env bash
# Builds audio/<morning|afternoon>.mp3 (+ .json) for one Buzz edition from the current index.html.
# Run from anywhere: bash .github/audio/build-audio.sh am|pm
#
# Voice: Piper (free, open source, runs on the runner). Change voice with BUZZ_VOICE, e.g.
# en_US-ryan-high (male) or en_US-amy-medium; names from huggingface.co/rhasspy/piper-voices.
# Output is written to audio/ only after every step succeeds, so a failure leaves the previous
# files in place; the page then sees a date mismatch and falls back to the live speech reader.
set -euo pipefail

ED="${1:-}"
case "$ED" in am) NAME=morning; LABEL="Morning Buzz";; pm) NAME=afternoon; LABEL="Afternoon Buzz";;
  *) echo "usage: build-audio.sh am|pm" >&2; exit 2;; esac

VOICE="${BUZZ_VOICE:-en_US-lessac-high}"
CACHE="${BUZZ_AUDIO_CACHE:-$HOME/.cache}"
VDIR="$CACHE/piper-voices"; VENV="$CACHE/buzz-audio-venv"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# 1. The exact lines the page's reader speaks, plus the edition date the MP3 is tied to.
(cd "$HERE" && npm install --no-audit --no-fund --silent)
node "$HERE/edition-text.mjs" "$ED" "$ROOT/index.html" > "$WORK/text.txt"
DATE="$(node "$HERE/edition-text.mjs" "$ED" "$ROOT/index.html" --date)"
echo "$LABEL for $DATE: $(wc -l < "$WORK/text.txt") lines, $(wc -c < "$WORK/text.txt") chars"

# 2. Piper in its own venv (system pip is locked on recent Ubuntu runners) and the voice model.
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --quiet --disable-pip-version-check piper-tts
mkdir -p "$VDIR"
IFS=- read -r LOCALE SPEAKER QUALITY <<< "$VOICE"
BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/${LOCALE%%_*}/$LOCALE/$SPEAKER/$QUALITY/$VOICE"
for ext in onnx onnx.json; do
  [ -s "$VDIR/$VOICE.$ext" ] || curl -sSfL --retry 3 -o "$VDIR/$VOICE.$ext" "$BASE.$ext"
done

# 3. Speak it, then encode a small mono MP3 (speech sounds fine at 40 kbps; ~0.3 MB a minute).
"$VENV/bin/python" -m piper -m "$VDIR/$VOICE.onnx" -c "$VDIR/$VOICE.onnx.json" \
  -i "$WORK/text.txt" -f "$WORK/out.wav" --sentence-silence 0.4
if ! command -v ffmpeg >/dev/null; then
  sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg >/dev/null
fi
ffmpeg -nostdin -y -loglevel error -i "$WORK/out.wav" -ac 1 -ar 22050 -codec:a libmp3lame -b:a 40k \
  -id3v2_version 3 -metadata title="$LABEL, $DATE" -metadata artist="Beitou Roots Research" "$WORK/$NAME.mp3"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/$NAME.mp3")"
python3 -c "import sys; d=float(sys.argv[1]); sys.exit(0 if d>=60 else 1)" "$DUR" \
  || { echo "::error::audio is only ${DUR}s long; not publishing it"; exit 1; }

# 4. Publish into the site (the workflow commits audio/ together with the edition).
mkdir -p "$ROOT/audio"
mv "$WORK/$NAME.mp3" "$ROOT/audio/$NAME.mp3"
python3 - "$ROOT/audio/$NAME.json" "$ED" "$DATE" "$DUR" "$VOICE" <<'PY'
import json, sys, datetime
path, ed, date, dur, voice = sys.argv[1:]
json.dump({"edition": ed, "date": date, "duration": round(float(dur)),
           "voice": voice, "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
          open(path, "w"), indent=2)
PY
echo "Built audio/$NAME.mp3: ${DUR%.*}s, $(du -k "$ROOT/audio/$NAME.mp3" | cut -f1) KB, voice $VOICE"
