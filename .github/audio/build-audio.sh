#!/usr/bin/env bash
# Builds audio/<morning|afternoon>.mp3 (+ .json) for one Buzz edition from the current index.html.
# Run from anywhere: bash .github/audio/build-audio.sh am|pm
#
# Voice: Kokoro (hexgrad/Kokoro-82M; free, open source, runs on the runner's CPU), voice af_heart.
# Change it with BUZZ_VOICE, e.g. am_michael (male). It replaced Piper on 11/19 because it reads
# words from context ("wind it down", "the close"); fix any it still gets wrong in
# pronunciations.txt.
# Output is written to audio/ only after every step succeeds, so a failure leaves the previous
# files in place; the page then sees a date mismatch and falls back to the live speech reader.
set -euo pipefail

ED="${1:-}"
case "$ED" in am) NAME=morning; LABEL="Morning Buzz";; pm) NAME=afternoon; LABEL="Afternoon Buzz";;
  *) echo "usage: build-audio.sh am|pm" >&2; exit 2;; esac

VOICE="${BUZZ_VOICE:-af_heart}"
CACHE="${BUZZ_AUDIO_CACHE:-$HOME/.cache}"
VENV="$CACHE/buzz-audio-venv"; export HF_HOME="$CACHE/huggingface"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# 1. The exact lines the page's reader speaks, plus the edition date the MP3 is tied to.
(cd "$HERE" && npm install --no-audit --no-fund --silent)
node "$HERE/edition-text.mjs" "$ED" "$ROOT/index.html" > "$WORK/text.txt"
DATE="$(node "$HERE/edition-text.mjs" "$ED" "$ROOT/index.html" --date)"
echo "$LABEL for $DATE: $(wc -l < "$WORK/text.txt") lines, $(wc -c < "$WORK/text.txt") chars"

# 2. Kokoro in its own venv (system pip is locked on recent Ubuntu runners). A cached venv goes
# stale when the runner image upgrades Python (seen 11/16: "No module named pip"), so rebuild it
# whenever it can no longer run pip. Each stage has its own time limit and a log line, so a hang
# (11/18: the step sat silent for 10 minutes) fails fast and shows where it stuck.
if ! "$VENV/bin/python" -m pip --version >/dev/null 2>&1; then
  echo "Audio tools venv missing or stale; rebuilding it."
  rm -rf "$VENV"; python3 -m venv "$VENV"
fi
if ! "$VENV/bin/python" -c "import kokoro, soundfile, en_core_web_sm" >/dev/null 2>&1; then
  echo "Installing Kokoro..."
  timeout 420 "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check --timeout 30 \
    torch --index-url https://download.pytorch.org/whl/cpu
  timeout 300 "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check --timeout 30 \
    kokoro soundfile
  timeout 180 "$VENV/bin/python" -m spacy download en_core_web_sm >/dev/null
fi
# espeak-ng voices the few words outside Kokoro's dictionary.
if ! command -v espeak-ng >/dev/null; then
  echo "Installing espeak-ng..."
  timeout 240 sudo apt-get update -qq && timeout 240 sudo apt-get install -y -qq espeak-ng >/dev/null
fi

# 3. Speak it (the model downloads once, then comes from the cache), then encode a small mono
# MP3 (speech sounds fine at 32 kbps; ~0.25 MB a minute).
echo "Synthesizing speech..."
timeout 420 "$VENV/bin/python" "$HERE/kokoro-tts.py" "$WORK/text.txt" "$WORK/out.wav" "$VOICE" 2>&1 \
  | grep -v -i -E "warn|super\(\)|WeightNorm" || true
[ -s "$WORK/out.wav" ] || { echo "::error::speech synthesis produced no audio"; exit 1; }
if ! command -v ffmpeg >/dev/null; then
  echo "Installing ffmpeg..."
  timeout 240 sudo apt-get update -qq && timeout 240 sudo apt-get install -y -qq ffmpeg >/dev/null
fi
ffmpeg -nostdin -y -loglevel error -i "$WORK/out.wav" -ac 1 -ar 22050 -codec:a libmp3lame -b:a 32k \
  -id3v2_version 3 -metadata title="$LABEL, $DATE" -metadata artist="Beitou Roots Research" "$WORK/$NAME.mp3"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/$NAME.mp3")"
python3 -c "import sys; d=float(sys.argv[1]); sys.exit(0 if d>=60 else 1)" "$DUR" \
  || { echo "::error::audio is only ${DUR}s long; not publishing it"; exit 1; }

# 4. Publish into the site (the workflow commits audio/ together with the edition).
mkdir -p "$ROOT/audio"
mv "$WORK/$NAME.mp3" "$ROOT/audio/$NAME.mp3"
python3 - "$ROOT/audio/$NAME.json" "$ED" "$DATE" "$DUR" "kokoro-$VOICE" <<'PY'
import json, sys, datetime
path, ed, date, dur, voice = sys.argv[1:]
json.dump({"edition": ed, "date": date, "duration": round(float(dur)),
           "voice": voice, "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
          open(path, "w"), indent=2)
PY
echo "Built audio/$NAME.mp3: ${DUR%.*}s, $(du -k "$ROOT/audio/$NAME.mp3" | cut -f1) KB, voice $VOICE"
