# Images de couverture (⌘Y / ⌘U / ⌘I) — implémenté

Objectif : l'admin recouvre l'écran de tous les invités avec une image du dossier `<dossier des chansons>/images` (ordre alphabétique du Finder). ⌘Y = 1re image, ⌘U = 2e, ⌘I = 3e ; le même raccourci ou Échap la retire ; un autre raccourci passe à l'autre image. Les admins ne sont jamais recouverts : ils voient un bandeau « Couverture n affichée aux invités ». Image entière sur fond noir (bandes noires si le format diffère).

Choix : ⌘K (recherche) et ⌘O (dossier des chansons) étaient pris ; ⌘Y, ⌘U, ⌘I sont libres dans l'appli et dans le menu Electron par défaut.

- [x] `src/shared/lib/data/coverImages.ts` : liste des images (jpg, jpeg, png, webp, gif ; fichiers cachés et autres ignorés), tri « Finder » (`localeCompare` fr, insensible à la casse, nombres naturels), image n → état `{ index, file, version }` (version = date du fichier, pour que le navigateur recharge une image remplacée).
- [x] État `cover` dans la config de session (donc renvoyé par `fetchSessionConfig` aux invités qui arrivent en cours de route) ; message socket `cover:changed`.
- [x] Endpoints : `POST /cover` (admin vérifié côté serveur, `requireAdminInOpenSession` exporté ; 404 « Pas d'image n°3… » si l'image n'existe pas) et `GET /cover-image?index=n` (sert le fichier).
- [x] Le dossier `images` n'apparaît plus comme une chanson.
- [x] `CoverLayer` (écran de session) : raccourcis admin, couverture plein écran (z-index au-dessus de tout) pour les invités, bandeau pour l'admin. Échap ne retire la couverture que si aucune fenêtre (recherche, transposition, QR, IA) n'est ouverte.
- [ ] `assets/CHEATSHEET.md` : à compléter après la fusion de la PR « grilles à corriger », qui réécrit ce fichier (évite un conflit).

## What I tested

- `npm run typecheck` OK ; `npm test` (comme la CI) : invariants Vitest 7/7, régression 19/19 dont 2 nouveaux tests (ordre Finder, fichiers non-images ignorés, nombres naturels, image manquante, dossier absent).
- `npm run test:electron` : 19 étapes PASS, dont 2 nouvelles : ⌘Y recouvre l'invité (image chargée, plein écran) mais pas l'admin, qui voit le bandeau ; l'invité qui recharge la page retrouve la couverture ; ⌘U passe à l'image 2, ⌘U à nouveau la retire ; ⌘I sans 3e image affiche une erreur à l'admin et ne recouvre personne ; Échap retire ; ⌘Y sur un invité ne fait rien ; `images` absent de la liste des chansons. Captures : `out/electron-smoke/cover-admin.png`, `cover-follower.png`.
- Non testé : tes vraies images Dropbox sur de vrais téléphones / la TV (format, poids ~1 Mo par image sur le Wi-Fi).

# Couleurs de sections (mode accords) — implémenté

Objectif : quand les accords sont affichés, chaque type de section a toujours la même couleur (barre à gauche + titre teinté). En paroles seules, rien ne change par rapport à aujourd'hui.

Palette : intro/outro gris · couplet/verse bleu · pré-… (pre-chorus, pre-verse) violet · refrain/chorus vert · pont/bridge orange · solo/instrumental/interlude rose · nom inconnu → pas de couleur.

Principe de sécurité : **aucune modification du DOM des lignes ni de la mise en page**. Les barres sont dessinées dans une couche superposée en position absolue (comme `SectionScrollDebugMarkers`), le titre est teinté via `background` + `box-shadow` (pas de padding). Donc ni le scroll, ni l'alignement accords/paroles, ni la bascule accords ne peuvent bouger.

Branche : `feat/section-colors` depuis `fix/session-usability` (on garde `resources/db.sqlite` hors commit).

- [x] 1. `src/client/lib/sectionKind.ts` : fonction pure `getSectionKind(title: string): SectionKind | null` (union de chaînes `'intro' | 'verse' | 'prechorus' | 'chorus' | 'bridge' | 'solo' | 'outro'`), insensible à la casse, aux accents, aux numéros, `#` et `[ ]`. Couleurs en variables CSS dans `base.css` (une valeur qui marche en thème clair et sombre).
- [x] 2. Test de régression `tests/regression/section-kind.test.ts` : les titres réels du répertoire (Couplet 1, # Verse 2, [Chorus], Pre-Chorus, Pré-refrain, Pont, Bridge, Instrumental, Interlude, Solo, Intro, Outro, titre vide, titre inconnu).
- [x] 3. `Section.tsx` : ajoute `data-section-kind` sur le `h3.song-section` (classe et texte inchangés, car `useSongSections` les lit). Style du titre appliqué seulement sous `.song-lines--chords-on`.
- [x] 4. `SectionColorBars.tsx` dans `SongWrapper` : couche `absolute`, `pointer-events: none`, `aria-hidden`, rendue seulement si `chordsEnabled`. Mesure les `.song-section` ayant un type et trace une barre de 4 px de chaque titre jusqu'au titre suivant (les titres vides créés entre deux strophes prolongent la section en cours). Recalcul avec `ResizeObserver` sur `#song-lines` (police, fenêtre, transposition, rechargement du fichier).
- [x] 5. Barre placée à 10 px à gauche du texte, dans la marge existante : visible et non coupée dans Electron (vérifié par le test).

Risques et parades :
- Scroll / sections (invariant 3) : on ne touche ni à `useSongSections`, ni à `useAutoScroller`, ni à la structure des lignes ; la couche est hors flux.
- Affichage identique admin/invités (invariant 2) : même rendu partout, couleurs calculées depuis le texte du fichier, pas de réglage serveur.
- Bascule accords sans décalage : la couche disparaît, le titre perd sa teinte, aucune dimension ne change. Vérifié par capture avant/après bascule (positions des lignes identiques au pixel).
- Fluidité admin (invariant 4) : mesure regroupée dans un `requestAnimationFrame`, uniquement au redimensionnement, pas au scroll.

## What I tested

- `npm run typecheck` : OK (client + serveur).
- `npm run test:regression` : 17/17, dont le nouveau test `section-kind` (titres réels du répertoire). Sur les 14 745 titres de sections de `songs-library`, 97,3 % reçoivent une couleur ; le reste (« A », « Day », noms de personnages…) reste neutre.
- `npm run test:electron` : tout passe, avec une nouvelle étape « section colours » sur admin + invité : une barre par section connue, aucune pour un titre inconnu, strophe sans titre rattachée à la section en cours, 5 couleurs distinctes, titre teinté ; positions de toutes les lignes identiques avec ou sans couleurs ; en paroles seules ni barre ni teinte, et l'invité garde ses couleurs (réglage par appareil) ; la bascule accords ne change pas le scroll. Captures : `out/electron-smoke/section-colours-*.png` (admin, follower, lyrics-only, dark, space-oddity).
- Tout le reste du smoke test (transitions de sections, scroll musicien, auto-scroll, changement de chanson, reprise en cours de chanson) passe toujours.
- Non vérifié à la main : navigateur d'un vrai téléphone invité.

# Session usability fixes

## Follow-up: reset everyone when changing songs

- [x] Reproduce retained scroll positions in Electron with scroll master disabled (900 px retained).
- [x] Reset each screen on song changes and stop previous scrolling. Preserve explicit zero in follower anchor mapping; wait for rendered lyrics before restoring saved positions when joining.
- [x] Verify normal and musician followers, master enabled/disabled, and mid-song joining; run typechecks/regressions and commit.

Review: full Electron smoke flow passes with two songs, master disabled, musician mode, active auto-scroll, and follower reload. Explicit master position zero now stays zero instead of mapping to the first section at 33 px. Client/server typechecks and all 16 regression tests pass. The smoke app uses port 18081 and disposable data so the running app on 8081 is unaffected.

## Follow-up: diagnostics off by default

- [x] Reset scroll markers, diagnostic logging, and verbose logging when opening the session screen, including old saved enabled preferences.
- [x] Make an absent logging preference mean disabled; honor the disabled setting for console output and automatic diagnostic-file export.
- [x] Verify defaults, manual opt-in, and reopening in regression tests and actual Electron windows; commit the focused fix.

Verification: 16 regression tests pass; client/server typechecks and client build pass. The full Electron smoke flow passes with legacy enabled preferences preloaded, manual toggles, a window reload, and no diagnostic file written at closure while disabled.

## Plan

Implement and commit each fix in order, as authorized. Test the actual Electron app via `npm run dev`; do not launch a browser. Preserve the pre-existing database change and exclude unrelated lessons from fix commits.

- [x] 1. Enable scroll master for the creator. Regression reproduced (old admin ID 1 retained instead of creator ID 2), then fixed. Both real SQLite/HTTP regression tests and client/server typechecks pass; explicit release and later logins retain intended ownership. Desktop flow will be exercised in the final Electron harness.
- [x] 2. Animate discrete jumps. Publish section targets immediately and animate for 170 ms. Seven regression checks pass, including cancellation, replacement, reduced motion, and server propagation. Electron host/follower frame sampling verified forward/reverse sections, musician steps, rapid presses, chord toggle stability, and continuous-scroll resume. Initial desktop check reproduced the instantaneous follower jump before the fix.
- [x] 3. Return closed sessions newest first with an ID tie-breaker. Query regression reproduced oldest-first behavior, then passed with descending date/ID. Eight regression tests and Electron's visible session list pass.
- [x] 4. Delete sessions with 0–4 recorded entries on explicit or timeout closure; retain at least 5. All 13 regression tests pass, covering boundaries, queued guests/foreign keys, repeated closure, admin continuity, ID reuse, and rollback. Electron's close button removed the short fixture session and preserved historical sessions. Full typecheck passed.
- [x] 5. Render QR codes black on white with a white quiet zone in both themes. Electron reproduced the transparent surround before the fix; afterward it verifies black/white paths, at least four modules of quiet zone, both themes, and a 380 px window. Screenshots inspected in `out/electron-smoke/`.

## Verification

- Baseline client/server typecheck passed.
- `npm run dev` started Electron successfully.
- Use focused regression tests executed by Electron's Node runtime, preserving its SQLite binary.
- Run tests before each commit; run final typechecks and client/server builds.

## Review

All five fixes implemented. Final regression run: 13/13 pass. Final Electron smoke run passes creation, section/musician transitions, rapid navigation, chord toggles, auto-scroll resume, mode changes during a jump, log ordering, QR rendering, and short-session closure. Client/server typechecks and both builds pass. Server build passed after allowing tsx's required IPC socket.

Review corrections were folded into their respective fixes: broadcast creator ownership to connected admins, and preserve active transitions across musician preference changes. Test fixtures use temporary SQLite databases and songs, never the user's session history.

Existing warnings remain: the command-menu dialog lacks an accessible title, and the Vite build reports existing bundling/Browserslist warnings. The legacy `test:invariants` script still depends on absent Jest/Vitest; the new executable regression suite is `npm run test:regression`. Physical iPad/Safari verification remains for the user.
