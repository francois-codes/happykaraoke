#!/usr/bin/env bash
# Re-sign the app inside the built DMG with our entitlements so the sandbox
# allows incoming network (browser/LAN). Then replace the DMG with the new one.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TAURI_DIR="$REPO_ROOT/src-tauri"
ENTITLEMENTS="$TAURI_DIR/Entitlements.plist"
BUNDLE_DMG="$TAURI_DIR/target/release/bundle/dmg"
BUNDLE_MACOS="$TAURI_DIR/target/release/bundle/macos"

if [[ ! -f "$ENTITLEMENTS" ]]; then
  echo "Entitlements not found: $ENTITLEMENTS" >&2
  exit 1
fi

DMG=( "$BUNDLE_DMG"/*.dmg )
if [[ ${#DMG[@]} -eq 0 || ! -f "${DMG[0]}" ]]; then
  echo "No DMG found in $BUNDLE_DMG. Run: npm run bundle" >&2
  exit 1
fi
DMG_PATH="${DMG[0]}"
DMG_NAME="$(basename "$DMG_PATH")"
MOUNT_POINT=$(hdiutil attach -nobrowse -readonly -noidme -mountrandom /tmp "$DMG_PATH" | tail -1 | awk '{print $NF}')
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"; hdiutil detach "$MOUNT_POINT" 2>/dev/null || true' EXIT

cp -R "$MOUNT_POINT"/* "$TEMP_DIR/"
hdiutil detach "$MOUNT_POINT"

# Find the .app (e.g. HappiKaraoke.app)
APP_PATH=$(find "$TEMP_DIR" -maxdepth 1 -name "*.app" -type d | head -1)
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "No .app found on DMG volume" >&2
  exit 1
fi

echo "Re-signing $(basename "$APP_PATH") with entitlements..."
codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$APP_PATH"

echo "Creating new DMG..."
rm -f "$DMG_PATH"
# Use same layout as Tauri: app and Application folder link
hdiutil create -volname "HappiKaraoke" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

echo "Done. DMG updated: $DMG_PATH"
