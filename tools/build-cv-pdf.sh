#!/bin/zsh
#
# Regenerate assets/CV_Yurii_Fokin.pdf from cv/index.html.
#
# The CV page is the source of truth; this is the only thing that turns it into
# the PDF the site hands out. Run it in the same commit as any edit to the CV
# page, otherwise the download drifts away from the page.
#
#   ./tools/build-cv-pdf.sh                 → replaces the published PDF
#   ./tools/build-cv-pdf.sh /tmp/check.pdf  → writes elsewhere, publishes nothing
#
# Serves the repo on a scratch port, prints the page through Chrome, checks the
# result is a single A4 page, and only then replaces the published file. A CV
# that has outgrown one page fails here instead of shipping as two.

set -e

REPO="${0:A:h:h}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=4598
OUT="${1:-$REPO/assets/CV_Yurii_Fokin.pdf}"
TMP="${TMPDIR:-/tmp}/cv-build-$$.pdf"

[[ -x "$CHROME" ]] || { print -u2 "Chrome not found at $CHROME"; exit 1; }

python3 "$REPO/server.py" "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT

# wait for the port instead of sleeping a guessed amount
for i in {1..40}; do
  curl -sf -o /dev/null "http://localhost:$PORT/cv/" && break
  sleep 0.25
done

rm -f "$TMP"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
          --virtual-time-budget=6000 --print-to-pdf="$TMP" \
          "http://localhost:$PORT/cv/" >/dev/null 2>&1

[[ -s "$TMP" ]] || { print -u2 "Chrome produced no PDF"; exit 1; }

python3 - "$TMP" <<'PY'
import sys
try:
    from pypdf import PdfReader
except ImportError:
    print("  (pypdf missing — skipped the one-page check)")
    sys.exit(0)

r = PdfReader(sys.argv[1])
mb = r.pages[0].mediabox
w = float(mb.width) * 25.4 / 72
h = float(mb.height) * 25.4 / 72
print("  pages: %d   size: %.1f x %.1f mm" % (len(r.pages), w, h))
if len(r.pages) != 1:
    sys.exit("  FAILED: the CV no longer fits one page — shorten it, or loosen "
             "the sheet in cv/index.html, then run this again.")
if abs(w - 210) > 1 or abs(h - 297) > 1:
    sys.exit("  FAILED: page is not A4.")
PY

mv "$TMP" "$OUT"
print "  wrote $OUT ($(du -h "$OUT" | cut -f1))"
