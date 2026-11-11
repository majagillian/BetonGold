#!/usr/bin/env bash
# Bereitet das Android-Projekt nach "npx cap add android" vor:
# App-Icons setzen und Hochformat erzwingen.
set -euo pipefail
RES=android/app/src/main/res
ICON=icon-1024.png
declare -A SIZES=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
for d in "${!SIZES[@]}"; do
  s=${SIZES[$d]}
  mkdir -p "$RES/mipmap-$d"
  convert "$ICON" -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher.png"
  convert "$ICON" -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher_round.png"
  fg=$((s * 9 / 4))
  convert -size ${fg}x${fg} xc:none \( "$ICON" -resize $((fg * 2 / 3))x$((fg * 2 / 3)) \) -gravity center -composite "$RES/mipmap-$d/ic_launcher_foreground.png"
done
# Hintergrundfarbe des adaptiven Icons
if [ -f "$RES/values/ic_launcher_background.xml" ]; then
  sed -i 's/#FFFFFF/#2B2140/I' "$RES/values/ic_launcher_background.xml"
fi
# Hochformat
sed -i 's/<activity /<activity android:screenOrientation="portrait" /' android/app/src/main/AndroidManifest.xml
echo "Android-Projekt vorbereitet."
