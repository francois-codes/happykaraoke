# Session usability fixes

## Plan

Implement and commit each fix in order, as authorized. Test the actual Electron app via `npm run dev`; do not launch a browser. Preserve the pre-existing database change and exclude unrelated lessons from fix commits.

- [x] 1. Enable scroll master for the creator. Regression reproduced (old admin ID 1 retained instead of creator ID 2), then fixed. Both real SQLite/HTTP regression tests and client/server typechecks pass; explicit release and later logins retain intended ownership. Desktop flow will be exercised in the final Electron harness.
- [x] 2. Animate discrete jumps. Publish section targets immediately and animate for 170 ms. Seven regression checks pass, including cancellation, replacement, reduced motion, and server propagation. Electron host/follower frame sampling verified forward/reverse sections, musician steps, rapid presses, chord toggle stability, and continuous-scroll resume. Initial desktop check reproduced the instantaneous follower jump before the fix.
- [x] 3. Return closed sessions newest first with an ID tie-breaker. Query regression reproduced oldest-first behavior, then passed with descending date/ID. Eight regression tests and Electron's visible session list pass.
- [x] 4. Delete sessions with 0–4 recorded entries on explicit or timeout closure; retain at least 5. All 13 regression tests pass, covering boundaries, queued guests/foreign keys, repeated closure, admin continuity, ID reuse, and rollback. Electron's close button removed the short fixture session and preserved historical sessions. Full typecheck passed.
- [ ] 5. Render QR codes black on white with a white quiet zone in both themes. Inspect the desktop modal in dark mode and at a narrow window size.

## Verification

- Baseline client/server typecheck passed.
- `npm run dev` started Electron successfully.
- Use focused regression tests executed by Electron's Node runtime, preserving its SQLite binary.
- Run tests before each commit; run final typechecks and client/server builds.

## Review

Implementation in progress.
