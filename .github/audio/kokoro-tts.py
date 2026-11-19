"""Speak an edition script with Kokoro (hexgrad/Kokoro-82M) into a 24 kHz WAV.

usage: kokoro-tts.py TEXT_FILE OUT_WAV VOICE
TEXT_FILE has one line per sentence, exactly what the page's reader speaks.
Kokoro picks pronunciation from the sentence (it says "wind it down" and "the close"
correctly, where Piper did not). For words it still gets wrong, add a line to
pronunciations.txt next to this script.
"""
import re
import sys
from pathlib import Path

import espeakng_loader

# espeakng-loader's bundled data path is broken in its Linux wheel; use the system espeak-ng
# (installed by build-audio.sh), which Kokoro only needs for words outside its dictionary.
espeakng_loader.get_data_path = lambda: "/usr/lib/x86_64-linux-gnu/espeak-ng-data"
espeakng_loader.get_library_path = lambda: "/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1"

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from kokoro import KPipeline  # noqa: E402

RATE = 24000
PAUSE = np.zeros(int(RATE * 0.4), dtype=np.float32)  # same 0.4 s gap between lines as before


def load_fixes():
    """pronunciations.txt: `phrase<TAB>replacement` per line; # starts a comment."""
    fixes = []
    for line in (Path(__file__).with_name("pronunciations.txt")).read_text().splitlines():
        if line.strip() and not line.startswith("#") and "\t" in line:
            phrase, repl = line.split("\t", 1)
            fixes.append((re.compile(r"\b" + re.escape(phrase) + r"\b"), repl.strip()))
    return fixes


def main():
    text_file, out_wav, voice = sys.argv[1:4]
    fixes = load_fixes()
    pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    chunks = []
    for line in Path(text_file).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        for pattern, repl in fixes:
            line = pattern.sub(repl, line)
        for _, _, audio in pipe(line, voice=voice, speed=1.0):
            chunks.append(audio.numpy() if hasattr(audio, "numpy") else np.asarray(audio))
        chunks.append(PAUSE)
    if not chunks:
        sys.exit("no text to speak")
    sf.write(out_wav, np.concatenate(chunks), RATE)


if __name__ == "__main__":
    main()
