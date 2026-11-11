#!/usr/bin/env bash
# Bereitet das Android-Projekt nach "npx cap add android" vor:
# App-Icons setzen und Hochformat erzwingen.
set -euo pipefail
RES=android/app/src/main/res
cp -r resources/android/. "$RES/"
if [ -f "$RES/values/ic_launcher_background.xml" ]; then
  sed -i 's/#FFFFFF/#2B2140/I' "$RES/values/ic_launcher_background.xml"
fi
sed -i -e 's/<activity$/<activity android:screenOrientation="portrait"/' -e 's/<activity /<activity android:screenOrientation="portrait" /' android/app/src/main/AndroidManifest.xml
echo "Android-Projekt vorbereitet."
