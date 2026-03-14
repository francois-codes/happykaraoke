---

name: Safe Dependency Upgrade
description: Plan + execute incremental dep upgrades with verification.
prompt: |

1. Audit `package.json` for outdated deps (React, Electron, Express, etc.).
2. Create upgrade plan in tasks/upgrades.md: one package at a time.
3. Run `npm outdated`, propose `npm update [pkg]@latest`.
4. Typecheck + test before/after.
5. Smoke test core flows.

Approve plan? Then execute.
