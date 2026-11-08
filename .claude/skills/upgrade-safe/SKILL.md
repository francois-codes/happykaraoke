---
name: upgrade-safe
description: Plan and execute incremental, verified dependency upgrades for HappiKaraoke (React, Electron, Express, Vite, Tailwind…). Use when asked to update or audit dependencies.
---

# Safe dependency upgrade

1. Audit `package.json` for outdated dependencies (`npm outdated`). See `.cursor/plans/dependency-update.md` for earlier analysis.
2. Write an upgrade plan in `tasks/upgrades.md`: one package at a time, with release-note breaking changes.
3. Get approval, then upgrade one package (`npm install <pkg>@<version> --legacy-peer-deps`).
4. Before and after each step: `npm run typecheck`, `npm run test:regression`.
5. Smoke test core flows in `npm run dev` (start session, change song, scroll sync, viewer connection). After Electron or native module changes, run `npm run install:deps:electron` first.
6. Commit each upgrade separately.
