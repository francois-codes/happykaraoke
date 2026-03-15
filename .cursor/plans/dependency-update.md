# Dependency Update Plan

**Current versions vs latest:**

| Package           | Current | Latest | Gap      |
| ----------------- | ------- | ------ | -------- |
| React / React-DOM | ^18.3.1 | 19.2.4 | Major    |
| Tailwind CSS      | ^3.4.4  | 4.x    | Major    |
| Vite              | ^5.3.0  | 8.0    | 3 majors |
| Electron          | ^30.1.0 | 33.4.x | 3 minors |

---

## Tier 1: Low-Risk Updates (Recommended)

### Electron 30 → 33

- **Effort:** Low
- **Benefit:** Security fixes (CVE patches), newer Chromium/Node
- **Changes:**
  - Update `electron` in [package.json](package.json) to `^33.4.0`
  - Update hardcoded `--target=30.1.0` to `--target=33.4.0` in `install:deps:electron` (line 18)
  - Electron 33 requires **C++20** for native modules — ensure your build environment supports it (Xcode 14+/VS 2022+)
- **Compatibility:** `better-sqlite3`, `electron-builder`, `@electron/rebuild` support Electron 33

### React 18 → 19

- **Effort:** Low–Medium
- **Benefit:** Actions, improved Suspense, better error handling, ref-as-prop
- **Changes:** Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` to ^19.x
- **Compatibility:** Radix UI and `@vitejs/plugin-react` both support React 19
- **Caveat:** Minor HMR quirk — `useEffect` may not re-fire on hot reload in dev (upstream React issue)

---

## Tier 2: Medium Effort — Vite 5 → 6 or 7

### Vite 6 or 7 (not 8 yet)

- **Effort:** Medium
- **Benefit:** Faster builds, newer browser target defaults, security/performance fixes
- **Path:** Vite 5 → 6 → 7 (follow [official migration guide](https://vite.dev/guide/migration))
- **Changes:**
  - Update `vite` and `@vitejs/plugin-react` (v4.3.1 is fine for Vite 6/7)
  - Check `vite-plugin-node-polyfills` compatibility
  - `build.target` may change; test in Electron
- **Recommendation:** Upgrade to Vite 6 first for incremental, lower-risk adoption. Vite 8's Rolldown shift is a bigger jump.

---

## Tier 3: Higher Effort — Tailwind v4

### Tailwind 3 → 4

- **Effort:** High
- **Benefit:** 5x faster builds, CSS-first config, new theme/utility APIs
- **Changes:** Tailwind v4 is a full rewrite:
  - **Config:** Your [tailwind.config.js](tailwind.config.js) moves to CSS (e.g. `@theme` in `*.css`)
  - **Content detection:** Automatic; may need `@config` if custom
  - **Plugins:** `tailwindcss-animate` needs v4-compatible version
  - Official [upgrade tool](https://tailwindcss.com/blog/tailwindcss-v4) and migration guide exist
- **Recommendation:** Stay on Tailwind 3.x for now. Apply patch updates (e.g. 3.4.4 → 3.4.16) for fixes. Plan Tailwind 4 as a separate migration when you have time.

---

## Suggested Order of Execution

1. **Electron** — Quick security win, single script change
2. **React** — Straightforward with good ecosystem support
3. **Vite 6** — One major step, then reassess 7/8
4. **Tailwind 4** — Defer to a dedicated migration

---

## Files to Modify

| Update   | Files                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Electron | [package.json](package.json) — `electron` version and `install:deps:electron` target                |
| React    | [package.json](package.json) — `react`, `react-dom`, `@types/react`, `@types/react-dom`             |
| Vite     | [package.json](package.json), [vite.config.ts](vite.config.ts) — versions and build config          |
| Tailwind | [package.json](package.json), [tailwind.config.js](tailwind.config.js), PostCSS config, CSS imports |

---

## Summary

- **Do update:** Electron (security) and React (modern API support)
- **Consider:** Vite 6 for incremental tooling updates
- **Defer:** Tailwind 4 until you're ready for a config/migration project

After Electron + React upgrades, run `npm run install:deps:electron` to rebuild `better-sqlite3` for the new Electron target.
