#!/usr/bin/env bash
# Re-sign HappiKaraoke with network server entitlement so the browser can connect.
# Run this if you installed from the DMG and http://<IP>:8081/join does not load.
set -e
# When run from Resources: ../../.. = .app
RESOURCES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$RESOURCES/../.." && pwd)"
ENTITLEMENTS="$APP/Contents/Resources/Entitlements.plist"
if [[ ! -f "$ENTITLEMENTS" ]]; then
  echo "Entitlements not found inside app. Re-run after installing from the DMG." >&2
  exit 1
fi
echo "Re-signing $(basename "$APP") so it can accept browser connections..."
codesign --force --deep --sign - --entitlements "$ENTITLEMENTS" "$APP"
echo "Done. You can open the app and try http://<this-machine-IP>:8081/join again."
