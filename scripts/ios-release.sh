#!/usr/bin/env bash
# Builds, signs and uploads the FoodFox iPhone app (apps/mobile) to TestFlight on a Mac.
# Used by codemagic.yaml; ported from x3-team/diggo-vpn app/scripts/apple-release.sh.
#
# Environment (Codemagic group foodfox_apple):
#   ASC_KEY_ID, ASC_ISSUER_ID   App Store Connect API key (Team key, Admin or App Manager)
#   ASC_KEY_P8                  the .p8 text (or ASC_KEY_P8_BASE64)
#   APPLE_TEAM_ID               optional, read from the distribution certificate by default
#   FOX_BUILD                   build number; must grow from build to build
#   FOX_UPLOAD=false            build and sign only
# Usage: scripts/ios-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"
: "${ASC_KEY_ID:?set ASC_KEY_ID}" "${ASC_ISSUER_ID:?set ASC_ISSUER_ID}" "${FOX_BUILD:?set FOX_BUILD}"
WORK="$(mktemp -d)"
KC="$WORK/signing.keychain-db"
cleanup() {
  rm -f "$WORK"/AuthKey_*.p8 "$WORK"/*.key
  security delete-keychain "$KC" 2> /dev/null || true
}
trap cleanup EXIT

echo "== App Store Connect API key"
KEY="$WORK/AuthKey_$ASC_KEY_ID.p8"
if [ -n "${ASC_KEY_P8_BASE64:-}" ]; then
  printf '%s' "$ASC_KEY_P8_BASE64" | tr -d ' \r\n' | base64 --decode > "$KEY"
else
  printf '%b\n' "${ASC_KEY_P8:?set ASC_KEY_P8 or ASC_KEY_P8_BASE64}" | tr -d '\r' > "$KEY"
fi

echo "== Signing"
ruby "$ROOT/scripts/asc-signing.rb" "$KEY" "$ASC_KEY_ID" "$ASC_ISSUER_ID" "$WORK"
while IFS='=' read -r k v; do [ -n "$k" ] && export "$k=$v"; done < "$WORK/signing.env" # values have spaces
TEAM_ID="${APPLE_TEAM_ID:-$FOX_TEAM_ID}"
: "${TEAM_ID:?no team id: set APPLE_TEAM_ID}"
PASS="$(uuidgen)"
security create-keychain -p "$PASS" "$KC"
security set-keychain-settings -lut 21600 "$KC"
security unlock-keychain -p "$PASS" "$KC"
security list-keychains -d user -s "$KC" $(security list-keychains -d user | tr -d '"')
curl -fsSL -o "$WORK/AppleWWDRCAG3.cer" https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer \
  && security import "$WORK/AppleWWDRCAG3.cer" -k "$KC" || true
security import "$WORK/distribution.key" -k "$KC" -t priv -f openssl -T /usr/bin/codesign -T /usr/bin/security
security import "$WORK/distribution.cer" -k "$KC" -T /usr/bin/codesign
rm -f "$WORK"/*.key
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$PASS" "$KC" > /dev/null

echo "== Flutter build settings"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
flutter pub get
# Same defines as the Android build (.github/workflows/android-apk.yml).
flutter build ios --release --config-only --no-codesign \
  --build-name "$VERSION" --build-number "$FOX_BUILD" \
  --dart-define=FOX_API_BASE=https://foodfox.yuri.guru \
  --dart-define=FOX_BASIC_USER=demo \
  --dart-define=FOX_BASIC_PASS=FoodFox2026! \
  --dart-define=FOX_DEMO_PHONE=9251111111 \
  --dart-define=FOX_DEMO_OTP=1111

echo "== Archive"
# FOX_APP_PROFILE reaches only the Runner target (PROVISIONING_PROFILE_SPECIFIER in project.pbxproj).
xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Release \
  -destination generic/platform=iOS -archivePath "$WORK/FoodFox.xcarchive" \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" DEVELOPMENT_TEAM="$TEAM_ID" \
  FOX_APP_PROFILE="$FOX_APP_PROFILE" \
  -quiet archive

echo "== Export .ipa"
cat > "$WORK/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>teamID</key><string>$TEAM_ID</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>Apple Distribution</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>guru.yuri.foodfox</key><string>$FOX_APP_PROFILE</string>
  </dict>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
PLIST
OUT="$ROOT/apps/mobile/build/ios-release"
rm -rf "$OUT"
xcodebuild -exportArchive -archivePath "$WORK/FoodFox.xcarchive" -exportOptionsPlist "$WORK/ExportOptions.plist" -exportPath "$OUT"
FILE="$(ls "$OUT"/*.ipa)"
ls -la "$OUT"

if [ "${FOX_UPLOAD:-true}" != true ]; then
  echo "== Not uploaded (FOX_UPLOAD=$FOX_UPLOAD)"; exit 0
fi
if [ -z "${ASC_APP_ID:-}" ]; then
  echo "error: no App Store Connect app for guru.yuri.foodfox, create it first (docs/codemagic.md)" >&2; exit 1
fi
echo "== Upload to TestFlight"
API_PRIVATE_KEYS_DIR="$WORK" xcrun altool --upload-app --type ios --file "$FILE" \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
echo "== $VERSION ($FOX_BUILD) is uploaded; TestFlight shows it after processing"
