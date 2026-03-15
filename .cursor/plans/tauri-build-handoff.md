# Tauri build – handoff (pick up later)

**Status:** Tauri app is the default (`npm run dev`, `npm run bundle`). This note helps resume work on packaging and built-app behavior.

---

## What’s done

- **Desktop:** Tauri 2 + Rust backend (Axum, rusqlite, WebSocket). `npm run dev` / `npm run build` use Tauri. Electron still available as `npm run build:electron`.
- **DMG:** `npm run bundle` builds client → `tauri build --bundles dmg` → re-signs app with entitlements and repacks DMG. Output: `src-tauri/target/release/bundle/dmg/HappiKaraoke_*.dmg`.
- **macOS entitlements:** `src-tauri/Entitlements.plist` (app-sandbox, network.client, network.server). Re-sign script ensures the app in the DMG has these so browser/LAN can connect. User fix script: `HappiKaraoke.app/Contents/Resources/fix-network-permissions.command`.
- **Admin login in built app:** API base URL uses runtime `isTauri()` from `@tauri-apps/api/core` so the packaged app (asset protocol) hits `http://127.0.0.1:8081`.
- **Join URL in built app:** Backend discovers LAN IP via interface list, then UDP-socket fallback (sandbox-safe). UI shows that URL; link opens in real browser. If only 127.0.0.1, a short note explains using the machine’s IP for other devices.
- **.gitignore:** `src-tauri/target` added. If it was committed before, run `git rm -r --cached src-tauri/target` once.

---

## Useful paths

| What | Where |
|------|--------|
| Tauri config | `src-tauri/tauri.conf.json` |
| Entitlements | `src-tauri/Entitlements.plist` |
| Re-sign + repack DMG | `scripts/resign-and-repack-dmg.sh` (run after `tauri build --bundles dmg`) |
| Distribution doc | `docs/DISTRIBUTION.md` |
| Host URL / join URL logic | `src-tauri/src/backend/server.rs` (`discover_host_url`), `src/client/components/Settings/QrCode.tsx` |

---

## If you need to continue

- **Browser still can’t connect to built app:** Confirm entitlements on installed app: `codesign -d --entitlements - /Applications/HappiKaraoke.app 2>/dev/null | xmllint --format -` and check for `com.apple.security.network.server` → `<true/>`. If missing, run the app’s `fix-network-permissions.command` or rebuild with `npm run bundle`.
- **Login still fails in built app:** Check that `src/client/lib/tauriEnv.ts` uses `isTauri()` from `@tauri-apps/api/core` (runtime), not only build-time env.
- **Join URL still 127.0.0.1:** Backend uses `discover_host_url()` in `server.rs`; UDP fallback should give LAN IP in sandbox. If it doesn’t, consider logging `list_afinet_netifas` / UDP result to see why.

---

*Last updated: handoff note added when pausing work on Tauri packaging.*
