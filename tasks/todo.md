# Préférence ♯ / ♭ (touche B) — PLAN validé, pas encore implémenté

Objectif : comme sur Ultimate Guitar, l'admin choisit l'écriture des altérations pour tout le monde. La touche `B` fait tourner : **Bémols ♭** → **Dièses ♯** → **Auto** (comportement actuel). **Le mode revient en Auto dès qu'on change de morceau ou de transposition** (demande de Louis : une nouvelle tonalité doit repartir de l'écriture par défaut). Il revient aussi en Auto au redémarrage de l'appli.

Faits vérifiés : tous les accords passent par `ChordLabel` (`Chord.tsx`) → `transposeChord(songKey, transpo, label)`. Sans transposition, l'accord est affiché tel qu'écrit dans le fichier ; en transposant, ♯/♭ dépend de la tonalité d'arrivée (`tonality.ts`). La transposition est diffusée à tous via `setTranspo` + message `transpo:changed`.

Branche : `feat/accidental-preference`, à créer depuis `main` au moment de l'implémentation.

## Étapes

- [ ] 1. `src/shared/lib/transpose/tonality.ts` : `type AccidentalMode = 'auto' | 'flat' | 'sharp'` et 4e paramètre optionnel de `transposeChord` (défaut `'auto'`). **En `'auto'`, le code actuel est exécuté tel quel** (aucun changement de comportement). En `'flat'`/`'sharp'` : fondamentale et basse réécrites avec l'altération choisie, y compris sans transposition et sans tonalité connue. Pas de `Cb`, `Fb`, `E#`, `B#` ; les notes naturelles ne bougent pas.
- [ ] 2. Test de régression sur **tous les accords de `songs-library`** : en `auto`, résultat identique à aujourd'hui pour chaque transposition (−11…+11) ; en `flat`/`sharp`, même hauteur que `auto`, aucune altération opposée, et même nombre de caractères (la mise en page ne peut pas bouger).
- [ ] 3. État partagé : `accidentalMode` dans la config de session (serveur) et le store (client) ; endpoint `setAccidentalMode` + message socket `accidental:changed` (calqués sur la transposition) ; lu au chargement via `fetchSessionConfig` pour les invités qui arrivent en cours de route. **Retour en Auto côté serveur** dans `changeSong` et `setTranspo` (avec diffusion du message), pour que tous les écrans repassent en Auto en même temps.
- [ ] 4. `ChordLabel` passe `accidentalMode` à `transposeChord`.
- [ ] 5. Touche `B` (admin, désactivée quand une fenêtre est ouverte) + court message « Bémols ♭ / Dièses ♯ / Auto » ; mode affiché dans la fenêtre de transposition (`T`). `assets/CHEATSHEET.md` mis à jour.

## Risques (chemins critiques : `transpose/**`, `SongComponents/**`)

- Parsing des accords (invariant 1) : `chord.ts` et `note.ts` ne changent pas ; le test couvre tout le répertoire.
- Affichage identique partout / pas de décalage (invariant 2) : même longueur garantie par le test, et vérifiée dans Electron (positions des lignes avant/après `B`, admin et invité).
- Scroll (invariant 3) : non touché ; le changement de mode ne doit pas déplacer le scroll (vérifié dans Electron).

## What I tested (à remplir)

- `npm run typecheck`, `npm run test:regression` (nouveau test sur tout le répertoire).
- `npm run test:electron` : `B` sur l'admin → l'invité affiche `Bb` au lieu de `A#` puis `A#` au lieu de `Bb`, puis Auto ; après un changement de morceau et après une transposition, admin et invité sont revenus en Auto ; positions des lignes et scroll inchangés ; `B` sur un invité sans effet ; un invité qui rejoint après reçoit le mode.

# Fix : scroll master perdu après avoir quitté et relancé l'appli

Cause : chaque `/login` crée un compte admin, jamais supprimé, et tous sont rattachés à chaque nouvelle session (base réelle : 17 admins). Après une relance, si la session a expiré, la session de remplacement n'a pas d'hôte : `/user` ne le fixait que s'il n'y avait qu'un seul admin, ce qui n'arrive plus. Le scroll revenait donc par défaut au plus petit id (admin n° 1, compte périmé). Session ouverte réelle : `scrollHostUserId` vide.

- [x] `/user` (admin qui reprend sa connexion au lancement) : devient hôte de la session si elle n'en a pas encore, quel que soit le nombre d'admins. Une session qui a déjà un hôte n'est pas modifiée (le test « another login does not steal ownership » reste valable).

## What I tested

- Nouveau test de régression : 3 comptes admin, session de remplacement sans hôte → le scroll va à l'admin 1 ; l'admin 3 reprend via `/user` → hôte et scroll master ; un autre admin qui reprend ensuite ne le récupère pas. Échoue sans la correction, passe avec.
- `npm run typecheck` OK, `npm run test:regression` 17/17, `npm run test:electron` : 16 étapes PASS.
- Non testé : une vraie relance de l'appli packagée sur ta base (nécessite un nouveau build).
# Grilles à corriger (touche P) — implémenté

Objectif : pendant qu'il joue, l'admin appuie sur `P` pour marquer la chanson en cours comme « grille à corriger ». La liste est visible dans l'app (Réglages) et dans l'éditeur de grilles (Claude-grilles). Dès que le fichier de la grille est modifié, la chanson sort de la liste.

Faits vérifiés : l'app et l'éditeur travaillent sur le même dossier (`Dropbox/…/KARAOKE_sn/03-HappiKaraoke songs`). L'éditeur est un petit serveur Python (`editeur/serveur.py`, port 8777) qui écrit directement les `.txt`. L'app surveille déjà ce dossier (`src/shared/lib/data/watcher.ts`).

## Choix : un fichier partagé dans le dossier des chansons

`03-HappiKaraoke songs/.grilles-a-corriger.json`, une entrée par chanson :
`{ file, title, markedAt, sections: [{ name, markedAt }], hash, note? }` (`hash` = SHA-1 du contenu du `.txt` au moment de la marque).

- Pourquoi pas SQLite : l'éditeur (Python, autre projet) doit lire la liste sans que l'app tourne ; le fichier voyage avec les grilles via Dropbox. Pas de migration.
- **Un seul écrivain : l'app.** L'éditeur ne fait que lire. Pas de conflit d'écriture.
- « Corrigée » = le contenu actuel du `.txt` n'a plus le même SHA-1 que `hash`. Une synchro qui touche le fichier sans le changer ne retire rien.

## Étapes côté app (branche `feat/grid-flags`)

- [x] 1. `src/shared/lib/data/gridFlags.ts` : lire / écrire le JSON (écriture atomique : fichier temporaire puis renommage), ajouter une marque (fusion si la chanson est déjà marquée), retirer, purger les entrées dont le hash ne correspond plus. Types en interfaces, pas de `any`.
- [x] 2. Endpoints via `createEndpoint` (`src/shared/endpoints/gridFlags.ts`, exportés dans `index.ts`) : `flagCurrentSong` (admin seulement, contrôlé côté serveur), `fetchGridFlags`, `unflagSong`, `setGridFlagNote`.
- [x] 3. Purge : dans `watcher.ts`, à chaque changement d'un `.txt` marqué ; et au démarrage du serveur (grilles modifiées pendant que l'app était fermée).
- [x] 4. Exclure le JSON de la liste des chansons (`songs.ts` charge tout le dossier, il faut l'ignorer).
- [x] 5. Touche `P` (admin seulement, désactivée quand une fenêtre est ouverte), via `useKeyboardShortcut` : enregistre la chanson et la section affichée (même calcul que la navigation ↑/↓, `useSongSections`). Petit message « Grille marquée · Refrain 2 » ; un 2e appui dans les 5 s annule.
- [x] 6. Réglages → « Grilles à corriger » (modèle de `SessionLogs`) : chanson, date, sections, note modifiable, boutons « Ouvrir » et « Retirer ». Petit ⚠ devant les chansons marquées dans la recherche `Cmd + K`.
- [x] 7. Mettre à jour `assets/CHEATSHEET.md` (tous les raccourcis, y compris `P`).

## Étape côté éditeur (Claude-grilles, autre dossier, en lecture seule)

- [x] 8. `serveur.py` : `GET /api/a-corriger` lit le JSON, garde les entrées dont le SHA-1 du fichier correspond encore, renvoie la liste. `index.html` : un filtre / une section « À corriger » (comme le top 100 prioritaires), avec les sections et la note. Aucune écriture du JSON par l'éditeur. Sauvegarde de `serveur.py` et `index.html` avant modification.

## Risques

- Scroll / affichage : on ne touche ni au rendu des chansons ni au scroll ; la touche `P` ne fait que lire la section courante.
- Dossier de chansons inaccessible (Dropbox hors ligne) : la marque échoue avec un message, rien ne plante.
- Encodage des noms (accents NFC/NFD sur macOS) : comparer les noms normalisés NFC, comme le fait déjà l'éditeur.

## What I tested

- `npm run typecheck` : OK. `npm run build:client` : OK (le hash utilise un import par défaut de `crypto`, car le code partagé est aussi empaqueté pour le navigateur ; la config de build n'est pas modifiée).
- `npm run test:regression` : 22/22, dont 6 nouveaux tests `grid-flags` (ajout, fusion des sections, annulation, purge par hash, fichier touché sans changement conservé, nouvelle marque après modification, noms accentués NFD, note, retrait, fichier JSON corrompu, chanson inconnue).
- `npm run test:electron` : tout passe, avec une nouvelle étape : `P` sur l'invité ne marque rien ; `P` sur l'admin enregistre la chanson et la section affichée (« Verse 3 ») ; un 2e `P` annule ; la liste « Grilles à corriger » s'affiche dans les Réglages ; modifier le `.txt` retire la marque du fichier partagé ; le JSON n'apparaît pas dans la liste des chansons. Capture : `out/electron-smoke/grid-flags.png`.
- Éditeur (copie isolée dans le scratchpad, port 8799, sur des marques écrites par le module de l'app) : `/api/a-corriger` renvoie les 2 grilles marquées (dont un nom accentué stocké en NFD) ; après `/api/enregistrer`, la grille corrigée n'est plus renvoyée et l'éditeur n'a pas écrit dans le JSON ; la case « à corriger (marquées pendant le jeu) » affiche la grille restante avec section et note. Sauvegarde des fichiers d'origine : `Claude-grilles/sauvegardes-editeur/avant-a-corriger-2026-11-08/`.
- Non testé : la marque pendant une vraie session sur ton dossier Dropbox, et le ⚠ dans la recherche `Cmd + K` (vérifié seulement par le typecheck).
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
