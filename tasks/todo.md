# Session usability fixes

## Plan

Implement and commit each fix in order, as authorized. Test the actual Electron app via `npm run dev`; do not launch a browser. Preserve the pre-existing database change and exclude unrelated lessons from fix commits.

- [x] 1. Enable scroll master for the creator. Regression reproduced (old admin ID 1 retained instead of creator ID 2), then fixed. Both real SQLite/HTTP regression tests and client/server typechecks pass; explicit release and later logins retain intended ownership. Desktop flow will be exercised in the final Electron harness.
- [ ] 2. Animate discrete jumps. Publish the section-transition target immediately; animate host and followers for about 170–200 ms, including musician steps. Keep continuous scrolling distinct, cancel stale animation on song/ownership changes, and respect reduced motion. Verify rapid navigation and auto-scroll resume.
- [ ] 3. Return closed sessions newest first with an ID tie-breaker. Verify query ordering and the desktop log list.
- [ ] 4. Delete sessions with 0–4 recorded song entries at closure; retain at least 5. Clean dependent queue/log data transactionally and preserve admin continuity across refresh. Apply on explicit and timeout closure only. Verify boundaries, foreign keys, repeated closure, and rollover.
- [ ] 5. Render QR codes black on white with a white quiet zone in both themes. Inspect the desktop modal in dark mode and at a narrow window size.

## Verification

- Baseline client/server typecheck passed.
- `npm run dev` started Electron successfully.
- Use focused regression tests executed by Electron's Node runtime, preserving its SQLite binary.
- Run tests before each commit; run final typechecks and client/server builds.

## Review

Implementation in progress.
