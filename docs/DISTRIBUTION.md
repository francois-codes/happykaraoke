# Distributing HappiKaraoke (Tauri)

## Building a DMG for macOS

From the project root:

```bash
npm run bundle
```

This builds the client, packages the app as a DMG, then **re-signs the app inside the DMG** with macOS entitlements so the sandbox allows incoming network (browser/LAN). Output is in `src-tauri/target/release/bundle/dmg/`.

To build all default bundles (app + DMG on macOS), use `npm run build`. To only re-sign and repack an existing DMG (after `tauri build --bundles dmg`), run `npm run resign:macos`.

**Output:** `src-tauri/target/release/bundle/dmg/HappiKaraoke_2.10.0_aarch64.dmg` (or similar, depending on architecture).

The DMG uses the same background and layout as before (drag app to Applications). Window size and icon positions match `build/background.png`.

### Entitlements (browser/LAN connection)

The built app is sandboxed. For `http://<IP>:8081/join` to work from other devices, the app must have the `com.apple.security.network.server` entitlement. We set this in `src-tauri/Entitlements.plist` and reference it in `tauri.conf.json`. Because the Tauri bundler does not always apply this file when signing the packaged app, the `npm run bundle` flow runs a post-step that re-signs the app inside the DMG with our entitlements before you distribute it.

If you already installed from an older DMG and the browser cannot connect:

1. Right‑click **HappiKaraoke.app** → **Show Package Contents** → **Contents** → **Resources**.
2. Double‑click **fix-network-permissions.command** (re-signs the app with the bundled entitlements).
3. Open the app and try `http://<this-machine-IP>:8081/join` again.

To verify entitlements on an installed app:  
`codesign -d --entitlements - /Applications/HappiKaraoke.app 2>/dev/null | xmllint --format -` and check for `com.apple.security.network.server` → `<true/>`.

## Helper files (Lisez-moi, post-install, network fix)

Unlike the old Electron build, Tauri does not support placing extra files (e.g. a readme or script) as separate icons inside the DMG window. Those files are **bundled inside the app** instead:

- **Lisez-moi.txt** (keyboard shortcuts) → `HappiKaraoke.app/Contents/Resources/Lisez-moi.txt`
- **post-install.command** (clears quarantine so the app can open) → `HappiKaraoke.app/Contents/Resources/post-install.command`
- **fix-network-permissions.command** (re-signs the app so browser/LAN can connect) → `HappiKaraoke.app/Contents/Resources/fix-network-permissions.command`
- **Entitlements.plist** (used by the fix script) → `HappiKaraoke.app/Contents/Resources/Entitlements.plist`

**Instructions for users:**

1. Drag HappiKaraoke to Applications.
2. If macOS blocks the app (“cannot be opened because the developer cannot be verified”):
   - Right‑click **HappiKaraoke.app** → **Show Package Contents** → open **Contents** → **Resources**.
   - Double‑click **post-install.command** (or run it in Terminal). Then open the app as usual.
3. For the shortcut list: same path → open **Lisez-moi.txt**.

## First run

Users open HappiKaraoke from Applications. They can then open a session (admin password) or join via browser at `http://<this-machine-IP>:8081/join`.
