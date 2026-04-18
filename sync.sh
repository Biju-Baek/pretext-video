#!/bin/bash
PROJ=~/Downloads/pretext-project
DL=~/Downloads

for f in main.js detector.js renderer.js config.js corpus.js pretext.js; do
  [ -f "$DL/$f" ] && cp "$DL/$f" "$PROJ/js/$f" && echo "✓ $f"
done
[ -f "$DL/index.html" ] && cp "$DL/index.html" "$PROJ/index.html" && echo "✓ index.html"
[ -f "$DL/style.css" ]  && cp "$DL/style.css"  "$PROJ/css/style.css" && echo "✓ style.css"

cd "$PROJ"
git add .
git commit -m "update from claude" --allow-empty
git push
echo "✅ done — refresh localhost:8080"
