#!/bin/zsh
#
# Render tools/og-card.html into the share card at 1200x630.
#
# The card is what LinkedIn, Slack, Telegram and mail clients show when the
# link is pasted. It is one image for the whole site: index, cv and all four
# case pages point their og:image at it.
#
#   ./tools/build-og-card.sh assets/images/og-default-v3.png
#
# ALWAYS a new filename. _headers serves /assets/images/* as immutable for a
# year, so replacing the file in place leaves every scraper and CDN showing the
# old card. After building, repoint og:image on all six pages:
#
#   grep -rln 'og-default-v2.png' --include='*.html' . | xargs sed -i '' \
#     's/og-default-v2\.png/og-default-v3.png/'
#
# The geometry was matched to the hand-drawn original by sampling its pixels:
# ground #F8F7F4, an 80px side margin, the eyebrow's cap-top at y=76, the
# headline at y=195, the subtitle at y=295, the pill text at y=415 and the
# bottom row at y=538. Check a redraw against those numbers, not by eye.

set -e

REPO="${0:A:h:h}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=4599
OUT="${1:?usage: build-og-card.sh assets/images/og-default-vN.png}"
# a repo-relative path is the normal case; an absolute one writes outside it
[[ "$OUT" = /* ]] || OUT="$REPO/$OUT"

[[ -x "$CHROME" ]] || { print -u2 "Chrome not found at $CHROME"; exit 1; }
[[ -e "$OUT" ]] && { print -u2 "$OUT exists — the card must take a new filename, see the note above"; exit 1; }

python3 "$REPO/server.py" "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for i in {1..40}; do curl -sf -o /dev/null "http://localhost:$PORT/tools/og-card.html" && break; sleep 0.25; done

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
          --window-size=1200,630 --default-background-color=00000000 \
          --virtual-time-budget=6000 \
          --screenshot="$OUT" "http://localhost:$PORT/tools/og-card.html" >/dev/null 2>&1

[[ -s "$OUT" ]] || { print -u2 "Chrome produced no image"; exit 1; }
print "  wrote $OUT ($(sips -g pixelWidth -g pixelHeight "$OUT" | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/ /;s/pixelHeight:/x/'))"
