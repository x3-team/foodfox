#!/usr/bin/env bash
# Re-sign Flutter release APKs with the v1, v2 and v3 schemes.
#
# The Android Gradle Plugin drops v1 (JAR) signing once minSdk >= 24. That is
# valid, but several OEM package installers still read the v1 manifest and
# refuse to install without it — the user sees "problem parsing the package".
# Sideloaded builds therefore carry all three schemes.
#
# apksigner only emits v1 when the signing SDK range reaches below 24, hence the
# explicit --min-sdk-version 21. The range is deliberately left open at the top:
# capping it bounds the v3 signer, and a device past the cap then finds no
# applicable signer at all.
#
#   bash scripts/sign-apks.sh 0.3.0

set -euo pipefail

VERSION="${1:-0.0.0}"
MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/mobile" && pwd)"
APK_DIR="$MOBILE_DIR/build/app/outputs/flutter-apk"
OUT_DIR="$MOBILE_DIR/dist"
KEYSTORE="$MOBILE_DIR/android/app/foodfox-demo.jks"
PROPS="$MOBILE_DIR/android/key.properties"

if [[ ! -f "$PROPS" ]]; then
  echo "key.properties not found — copy key.properties.example first" >&2
  exit 1
fi

read_prop() { grep -E "^$1=" "$PROPS" | cut -d= -f2- | tr -d '\r'; }
STORE_PASS="$(read_prop storePassword)"
KEY_PASS="$(read_prop keyPassword)"
KEY_ALIAS="$(read_prop keyAlias)"

BUILD_TOOLS="$(find "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}/build-tools" \
  -maxdepth 1 -mindepth 1 -type d | sort -V | tail -1)"
APKSIGNER="$BUILD_TOOLS/apksigner"
ZIPALIGN="$BUILD_TOOLS/zipalign"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.apk "$OUT_DIR"/*.idsig

sign_one() {
  local src="$1" out="$2"
  [[ -f "$src" ]] || return 0
  "$ZIPALIGN" -p -f 4 "$src" "$src.aligned"
  "$APKSIGNER" sign \
    --ks "$KEYSTORE" --ks-pass "pass:$STORE_PASS" --key-pass "pass:$KEY_PASS" \
    --ks-key-alias "$KEY_ALIAS" \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
    --min-sdk-version 21 \
    --out "$out" "$src.aligned"
  rm -f "$src.aligned"
  "$APKSIGNER" verify -v --min-sdk-version 21 "$out" | grep -E "^Verifies|scheme"
  echo "$(basename "$out"): $(du -h "$out" | cut -f1)"
}

sign_one "$APK_DIR/app-arm64-v8a-release.apk"   "$OUT_DIR/foodfox-$VERSION-arm64-v8a.apk"
sign_one "$APK_DIR/app-armeabi-v7a-release.apk" "$OUT_DIR/foodfox-$VERSION-armeabi-v7a.apk"
sign_one "$APK_DIR/app-x86_64-release.apk"      "$OUT_DIR/foodfox-$VERSION-x86_64.apk"
sign_one "$APK_DIR/app-release.apk"             "$OUT_DIR/foodfox-$VERSION-universal.apk"

rm -f "$OUT_DIR"/*.idsig
( cd "$OUT_DIR" && sha256sum ./*.apk > SHA256SUMS.txt && cat SHA256SUMS.txt )
