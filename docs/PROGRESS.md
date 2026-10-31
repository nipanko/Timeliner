# TIMELINER — Progress

Claude reads this first in every session and updates it at the end. Newest entry on top.

## Now
- **GitHub:** https://github.com/nipanko/Timeliner (private; `origin`, `main` pushed 1 Nov). CI runs on every push / PR.
- **Phase:** 1, local MVP (started 30 Oct). Phase 0 leftovers stay with Nipanko: name check, domain, landing page.
- **Where the code is:** `main` has scaffold + slices 1–8, the pro look, motion polish, drag-to-reschedule, pinch zoom, calendar/clock jump, Inbox, Tick the mascot, drag across lanes, the web app (installable, offline), GitHub CI and backup export/restore (all merged 1 Nov). 69 tests, typecheck and lint green.
- **Resume with:** web app live and working on iPhone. Next (LAUNCH.md §9): first native phone run (Expo dev build: haptics, sounds, notifications), privacy policy draft, then accounts + sync (Supabase).
- **Still open from slices 2–3:** windowed DB query once entries reach thousands (`shortcut:` in `features/entries/data.ts`).
- **Decisions made:** layers = lanes; 4 directions (radial later); phones stay portrait, horizontal is a direction setting; minimum age 13 with parental consent for 13–17; web = single-page app with isolation headers.
- **Nipanko's to-dos:** connect Cloudflare Pages; 2-factor on GitHub + Cloudflare; decide domain and LAUNCH.md §10 choices; confirm "what makes it different" (PRODUCT.md); check the name (Play Store, App Store, IP India); buy domain; create the private GitHub repo so CI can run.
- **Blocked on:** —

## Session log
### 2026-11-01 (13)
- Nipanko confirmed the live site works on iPhone Safari (storage fix + branch timeline). Safari launch blocker closed.

### 2026-11-01 (12)
- Fixes merged and pushed (live on Cloudflare). Branch `timeline/branches`: the branch timeline. Trunk beside the time labels (dim line + lit trail using the veil's transform), Tick on the trunk at now, each entry a branch: connector, node (tap to complete), title + time / Done / Next up / Missed, length bar; goals get a trunk flag; `compact` items render as branches too. Next-up = earliest open timed entry ahead. Engine, drag (time + lanes), zoom and scrolling unchanged. Phone header: short month, smaller buttons, no Tick in the level chip, XP as "51/100".
- Backup restore now reloads the app afterwards (screens showed stale numbers until a reload).
- Checked on the web build at 390 and 1200 px with sample tasks loaded via backup (then restored): trunk, trail, Tick, done / next / missed / reminder nodes, tapping a node → done, XP 21 → 41, Tick cheering.
- **Mystery solved:** the browser pane wipes its storage when it's closed and reopened (database and localStorage both empty after the usage-limit break). Not the app.

### 2026-11-01 (11)
- Site live on Cloudflare Pages (Nipanko; the `timeliner.pages.dev` name belongs to someone else's project, our address still to note). Safari showed "Could not open your data: The operation failed for an unknown transient reason".
- Branch `fix/safari-scroll`: expo-sqlite's web worker can't retry once its OPFS pool fails (later calls hit "Invalid VFS state"), so the root layout reloads once with a fresh worker (sessionStorage flag) and otherwise shows a helpful screen (other tabs, Private Browsing, old iOS) with Try again. Plain wheel / trackpad scrolling now travels the timeline without end. Not verifiable here (no Safari).
- Proposed the branch timeline redesign (one straight trunk for time, layers branch off as nodes, Tick walks the trunk, goals as checkpoints); waiting for Nipanko's OK.

### 2026-11-01 (10)
- Web app merged. Branch `ci/github`: `.github/workflows/ci.yml` (npm ci → typecheck → `expo lint --no-cache` → jest → build:web on every PR and push to main; typecheck doesn't need the generated route types). Runs once the GitHub repo exists.
- Branch `settings/backup`: `core/backup.ts` (format v1; validates every table, field type, enum, link and duplicate; drops unknown fields; 4 tests), `db/backup.ts` (export all; replace all in one transaction, parents first), Settings › Your data (web: download a file / restore from a file with a confirm card; a safety copy of the current data downloads first; phone: export via the share sheet, restore later). `index.html` asks for persistent storage. 69 tests.
- Checked on the web build (downloads and the file picker intercepted in the page): export, restore with a marked test item (safety copy identical to the data replaced, item arrived), restored the original byte-for-byte, damaged file refused.
- **Data loss in the test browser:** between ~1:25 and 1:30 PM the pane's database was found fresh (0 XP, starter layers, no settings); it was also empty this morning. Nothing in the app deletes it; expo-sqlite's access-handle pool fails rather than wipes when another tab holds it. Most likely the pane clearing site storage; not proven. Recorded as a risk in LAUNCH.md.

### 2026-11-01 (9)
- Lane drag merged (Nipanko confirmed it works). New features paused; Nipanko asked to make it a web app and for a launch plan (deploy, accounts, scale).
- Branch `web/app`: `public/index.html` (Expo's template override: manifest, theme colour, iPhone home-screen tags, no white flash), `manifest.webmanifest` (+ shortcuts to Inbox / Review), Tick app icons for web, iOS and Android (drawn by a script, replaces Expo's template icons), `public/sw.js` + `scripts/precache.js` (`npm run build:web` writes every build file and a version into the worker; old deploys' caches are deleted). Fonts imported per weight (build 11 MB → 5.2 MB). Wide screens: scroll screens, sheets, Inbox and Focus capped and centred. `_headers`: `COEP require-corp` (Safari lacks `credentialless`), nosniff, referrer and permissions policy, long cache for hashed bundles.
- Checked on the web build: installable manifest and icons served, service worker controls the page, 45 files cached after one visit; with the server stopped, the app starts, the database opens, every tab and the Inbox work, and a hard reload on `/review` works. Still cross-origin isolated with require-corp. Not checked: Safari / iPhone (no Safari here).
- Wrote `docs/LAUNCH.md`: Cloudflare Pages, EAS for stores, optional accounts on Supabase (email code + Apple + Google, age gate + parental consent), sync (evaluate PowerSync vs hand-rolled), scaling, security, privacy law (DPDP, GDPR, COPPA), environments, costs, order of work, decisions needed.

### 2026-11-01 (8)
- Mascot merged. Nipanko had no preference, so: branch `timeline/lanes`, drag a card across lanes. `core/timeline/layout.ts` `laneAfterDrag` (half a lane switches, clamps to the board; tested). The lifted card follows the finger on both axes; the drop saves the new time and layer together. 65 tests.
- Not verified in the pane: the browser tool's hold is sometimes shorter than 350 ms (then it counts as a tap), and Nipanko was using the pane at the same time. Time-axis drag was verified on 1 Nov (3). Nipanko tried it by hand: works.

### 2026-11-01 (7)
- Inbox merged. Branch `mascot`: react-native-svg (new dependency). `core/game/mascot.ts` mood rule (2 tests); `features/game/Tick.tsx` drawing with 5 faces, idle bob, jump + squash + cheer face when XP goes up (only after progress has loaded, or it cheered on every screen open). In the Timeline HUD, Focus (focused face while running), level-up card, Settings avatar. 64 tests.
- Checked on the web build: Tick in all four places; undid and redid a task → header Tick went smiling → cheering → smiling. Jump itself not visible (pane asks for reduced motion). Not run on a phone.

### 2026-11-01 (6)
- Jump merged. Branch `inbox`: `inbox` table (migration 0007) + `features/inbox` (data, InboxScreen at `/inbox` as a modal). Header icon with a count badge beside calendar / clock. Plan → add sheet prefilled (`title`, `inbox` route params) → saving removes the item. Focus: "Park a thought" inline field with a "Parked in your Inbox" confirmation.
- Checked on the web build: captured items with Enter, planned "Idea: radial clock view" → task at 12:45–1:10 PM and the badge went 3 → 2; parked "Buy milk" from Focus. Not run on a phone.
- Gotcha: with tabs kept alive (React Activity), a hidden copy of the header can sit in the DOM with old values; read the visible one.
- Left out: web capture bar, natural-language times ("tomorrow 9am"), dragging an inbox item onto the timeline.

### 2026-11-01 (5)
- Pinch zoom merged. Nipanko asked for: mascot + Inbox, a calendar in the corner to jump to a date, and a small clock icon with an iPhone-alarm-style scrolling time picker with sound. Plan: three slices (jump → Inbox → mascot).
- Branch `timeline/jump`: calendar and clock buttons beside the month title. `JumpSheet`: month calendar (`core/time/periods.ts` `monthGrid`, tested incl. DST) and time wheels (`src/ui/Wheel.tsx`: Reanimated + pan, rubber band, spring settle, 3D tilt, mouse wheel on web, adjustable for screen readers). Tick: `src/lib/tick.ts` (expo-audio, new dependency, plays our own generated `assets/sounds/tick.wav`, mixes with music, respects the silent switch, + selection haptic) and `tick.web.ts` (Web Audio click, no file). Jumping also moves the week strip. 62 tests.
- Checked on the web build: calendar → next month → 12 Nov: title November 2026, strip 9–15 Nov; clock wheels via mouse wheel 12:26 → 11:29 PM, Go → timeline around 11:29 PM. Sound not heard (can't in the pane); not run on a phone.
- Left out: looping hour wheel like iOS (ends at 1 and 12).

### 2026-11-01 (4)
- Drag merged. Branch `timeline/pinch`: `core/timeline/scales.ts` `zoomAfterPinch()` (log2 of the pinch, a small wobble stays put; also runs as a worklet; 2 tests). Timeline: two-finger pinch runs alongside the drag (`useSimultaneousGestures`), a centred chip shows the target rung, zoom switches on release. Web: ctrl/⌘ + wheel (how browsers report a trackpad pinch) does the same and stops the page from zooming. 60 tests.
- Checked on the web build with wheel events: Hour → Minutes (chip "Minutes"), then back to Hours. Two-finger pinch can't be tried in the pane (no touch); not run on a phone.
- Left out: continuous zoom between rungs (the engine lays out per rung; needs a live span shared value).

### 2026-11-01 (3)
- Motion polish merged. Branch `timeline/drag`: `core/entries/timing.ts` `reschedule()` (shift, snap the start to the nearest zoom slot, keep the length; 3 tests incl. DST). Cards get a long-press (350 ms) pan that `block`s the timeline's own pan; moving earlier than the hold fails it so the timeline scrolls. The card lifts (scale 1.05), follows the finger along the axis, snaps on release; a tap after a drag doesn't open it; medium haptic on lift (not on web or in calm mode). 58 tests.
- Checked on the web build with mouse drags: a held drag moved "Motion test" from 11:45 to 9:45 (2 h, snapped); a faster drag scrolled the timeline instead; a tap still opens the card.
- Learned: the drop must use the release event's translation, not the last update (a fast drag may send none). Cross-lane moves (change layer by dragging sideways) left out.

### 2026-11-01 (2)
- Slice 8 merged. Branch `motion/polish`: `src/ui/motion.tsx` (`useLoop` for ambient loops that stop with reduce motion; `ProgressFill`, a gradient bar that eases via scaleX with a small overshoot). Clock pill pulse, streak flame flicker, breathing ring on the task happening now, pop when a card is completed; header / Settings / Focus bars now animate.
- Checked on the web build: added and completed a "Motion test" task, XP 15/100 and the bar at exactly 15 %, no console errors. The loops themselves can't be seen in the browser pane (it asks for reduced motion); not run on a phone.
- Left out from DESIGN §2: sheet slide-up (the modal uses the platform's own), badge shine, Journey branches drawing in, mascot (needs react-native-svg).

### 2026-11-01
- Merged `journey/goals` + `ui/pro-look` into main (fast-forward). Branch `layers/settings` (slice 8): layer `icon` column (migration 0006, starter icons backfilled); Settings › Layers: rename, 6 colors (added teal, orange), 12 icons, show/hide, add. Settings › Timeline: direction, week start (Mon/Sun, drives the week strip and Week bar), calm mode (no confetti or haptics). Direction is now saved, so the timeline remembers it. Radios and switches now use `aria-checked`, so screen readers hear the selection on web.
- Checked on the web build: added and renamed a layer (Gaming, teal, controller), it gets its own lane; Sunday week start; direction right; then restored Nipanko's defaults. The browser pane's storage was empty this morning (XP 0, starter layers), not caused by the app.
- Gotchas: the browser pane sometimes doesn't repaint content that grows after load until the window is resized; `expo lint` can hold a stale cache (fix: `npx expo lint --no-cache` once).
- Left out: deleting layers (hide does the job; delete needs a plan for their entries), reordering layers, week-start for the timeline's week ticks (still Monday).

### 2026-10-31 (8) — end of day
- Day summary: slices 4–7 built (XP/levels/streaks, focus + notifications, end-of-day review, Journey goals + badges); 4–6 merged. Then the v0.3 "pro" look, the lime / fonts / Settings / game-juice pass and the endless week strip, all on `ui/pro-look`, waiting for the merge OK.
- Learned (web + Expo Router):
  - expo-router/ui headless tabs: the child of `TabList asChild` needs one flat style (`StyleSheet.flatten`), not an array, or web crashes in production; `TabSlot` never shrinks unless given `flexShrink: 1`.
  - Anything sticking out of an `overflow: hidden` box that holds buttons lets the browser scroll that box sideways when a button takes focus. Clip decorations in their own layer; keep off-screen pages out of focus order.
  - A pan gesture over buttons: the release at the end of a swipe also fires the button's press. Guard with a "swiped" flag set when the gesture activates.
  - Swipe thresholds as a share of width feel too strict on wide screens; cap them (we use min(80 px, ¼ width)).
  - The browser pane asks for reduced motion, so confetti and entrance animations don't show there; the app is right to honour it.
  - Debugging gestures: `scheduleOnRN(console.log, …)` from the worklet, then read the console.

### 2026-10-31 (7)
- Week strip swipes left/right through weeks without end (only 3 weeks rendered; recentres after each swipe). Tapping a day still jumps the timeline; the release at the end of a swipe no longer counts as a tap. Month title follows the shown week; a Today pill returns to this week. Checked on the web build with mouse drags both ways.

### 2026-10-31 (6)
- "Tweak the look" on `ui/pro-look`, from Nipanko's picks: lime accent with a lime → mint gradient for rewards and primary buttons; Space Grotesk + Inter fonts; Ionicons on tabs, cards (tasks wear their layer's icon), the add sheet and the focus screen; System / Light / Dark in a new Settings tab with a profile card (level, XP bar, streak, badges, hours focused); `settings` table (migration 0005).
- Game juice: one Celebrations overlay driven by `core/game/events.ts` (+N XP toast with confetti, level-up card, badge toast, haptics on phones); spring on the check mark; press scale everywhere. Journey, Review and Settings are tabs now, with a large title that stretches on pull and hands over to a compact bar, and staggered section entrances. Focus: display-font timer, gradient progress, glowing dial while running. The tab bar's + adds at the next quarter hour.
- Fixed while checking the web build: the tab bar crashed web (style array passed into expo-router's `Slot`); a long Journey pushed the tab bar off-screen (`TabSlot` never shrinks by default); the timeline's glow blob let the screen slide sideways when a card's check took focus.
- Checked on the web build (desktop and 400×640): all four tabs, dark / light switching, +28 XP toast, scroll hand-over, add sheet at 12:15 AM, focus screen. Not seen: confetti and entrance springs, because the browser pane asks for reduced motion (Windows "Animation effects" off) and the app honours that. Not run on a phone.

### 2026-10-31 (5)
- UI redesign v0.3 "pro" on branch `ui/pro-look` (on top of slice 7), from Nipanko's references (pill timelines, week strips, watch complications, clean cards): new dark/light tokens with hairline edges and coral glow; month title; level chip with glowing XP bar; week strip with entry dots and tap-to-jump; segmented Day/Week/Month/Year complications; outline layer chips; cards with a quick-complete ring; floating tab bar + add button; weights calmed to 600–700. "Back to now" now follows the camera state (works after a day jump). DESIGN.md updated; canvas still shows v0.2.
- Checked on the web build in dark and light.

### 2026-10-31 (4)
- Slice 6 merged. Branch `journey/goals` (slice 7): `milestones` table (separate from entries: not on the timeline); `core/game/badges.ts` (11 badges from streak best, comebacks, focus hours, honest planning, early tasks, fresh starts; all derived); streak now also returns best + comebacks. Journey screen (`/journey`, from the level header): goals (month/year tasks) as branches with milestone stops (add, reach, remove), "+ New goal"; Badges tab with progress. Milestone reached = +50 XP in the header.
- Checked on the web build: create goal, add 2 milestones, reach one (1 of 2, bar), badges with progress, header XP up by 50.
- Left out: git-style multi-branch graph drawing (needs react-native-svg), WOOP fields on goals, unlock celebrations (`badges_unlocked` comes with motion polish), Party badge (Phase 2).

### 2026-10-31 (3)
- Slice 5 merged. Branch `review/day` (slice 6): `core/game/review.ts` summarizeDay (path done/missed/open, focus, XP today, plan vs actual over focused tasks, best moment); `day_logs` table; Review screen (`/review`, from the period bars): tiles, path with neutral gaps + "Tomorrow" for missed items, plan vs actual hint, tomorrow's first task at 9 AM, best moment last, "Close the day" +5 XP (counted in the header).
- Fixed: stray seconds of focus no longer count (gave "100% faster"); serve-web.js no longer crashes while `dist/` is rebuilt.
- Checked on the web build: review renders from real data; closing the day saved.

### 2026-10-31 (2)
- Slice 4 merged. Branch `focus/notifications` (slice 5): `focus_sessions` table; Focus screen (`/focus/[id]`, from "Focus on this" in the sheet): countdown of the planned length, pause/resume, stop, done; time derived from timestamps so reloads/locks don't break it. Calibration +5 XP when focused time is within 20 % of plan. Local notifications (expo-notifications): reminders and task starts for the next 48 h, refreshed when entries change; focus-end alert; none on web.
- Checked on the web build: start, countdown, done → task done, XP 28 and 1-day streak in the header. Notifications not tested (phone only).
- Left out (name for later): park-a-thought / Inbox lane, break suggestion, ring dial (needs react-native-svg).

### 2026-10-31
- Slice 3 merged. Branch `game/progress` (slice 4, smaller version agreed): `core/game/xp.ts` (entry XP, planning-ahead bonus capped 10/day, level curve) and `core/game/streaks.ts` (forgiving streak with freezes), XP derived from entries (no `xp_events` table yet, ARCHITECTURE §5 updated). Mark done / not done in the entry sheet; missed tasks drawn as dashed gaps; Level/XP/streak header.
- Fixed: the timeline's moving layer swallowed taps on web (pointerEvents style is dropped on Animated views; now set as a prop).
- Not verified by me end to end in the browser (automated clicks didn't reach the app while Nipanko was testing in the pane); rules covered by tests.

### 2026-10-30 (8) — end of day
- Day summary: from an idea to a working local timeline app. Docs (architecture, research, clay design, product decisions), interactive design canvas v0.2 (https://claude.ai/artifact/ABND6k1WXFuxPjKUE6JusJ), scaffold, slices 1–3.
- Learned: test the timeline maths in a DST time zone; SQLite on web needs isolation headers and an async open; the React Compiler lint rejects `Date.now()` during render (use a state initializer or `useNow`); a 6-hour tick slot can contain a DST change.
- Proposed a smaller slice 4 (no XP ledger table yet); waiting for Nipanko's OK.

### 2026-10-30 (7)
- Slice 2 merged into main.
- Branch `data/entries` (slice 3): expo-sqlite + Drizzle (layers, entries; migrations in `src/db/migrations`, starter layers seeded by a migration). Tap empty timeline → add sheet (kind, title, when with ‹ › and Time/Day/Week/Month/Year, length, layer, plan sentence); tap a card → edit / delete (two taps); + button adds at the next slot; layer visibility saved. Sample data removed.
- Core: `entries/timing.ts` (entryTiming, nudge, default granularity per zoom); 38 tests.
- Web: output is now a single-page app; SQLite on web needs cross-origin isolation headers (`public/_headers`). `npm run web` can't send them, so use `npm run web:preview` (export + local server with headers). DB is opened async (web worker can't start during a synchronous open).
- Checked on the web build: add, live update, edit, move a day, delete, layer toggles persist. Not yet run on a phone.

### 2026-10-30 (6)
- Scaffold + slice 1 merged into main.
- Branch `ui/timeline-screen` (slice 2): read-only Timeline screen with sample data. Live now-line flowing on the UI thread (Reanimated frame callback), drag with momentum (Gesture Handler 3 `usePanGesture`), Back to now, zoom bar Sec→Year, 4 directions, layer chips, Day/Week/Month/Year bars, past veil, clay theme light + dark, reduce-motion stepping.
- Core: layout options (`buffer`, `pillPx`), label thinning (`labelEvery`, `hasLabel`); 34 tests.
- Checked in the browser (web build): renders, clock ticks, zoom, directions, drag, Back to now, light/dark. Not yet run on a phone.

### 2026-10-30 (5)
- Design docs fast-forwarded into main.
- Branch `scaffold`: Expo SDK 58 app (Router with src/app, placeholder home), jest-expo, ESLint flat config, typecheck/test scripts, static web output. Web export builds.
- Branch `core/time-timeline` (slice 1): `src/core/time` (units, periods) and `src/core/timeline` (scales, viewport, ticks, layout), 30 Jest tests in a DST time zone; IST checked by hand. Fixed a DST bug in 6-hour slots found while writing ticks.
- Gotchas: npm 11 ignores `--dev` (use `--save-dev`); TypeScript 6 needs `"types": ["jest"]` in tsconfig.

### 2026-10-30 (4)
- Decided: minimum age 13; 13–17 with verifiable parental consent, no social features or analytics. Recorded in PRODUCT.md, PLAN.md §5, ARCHITECTURE.md §12.

### 2026-10-30 (3)
- Owner asked for the Bee-Bot "clay" look everywhere, fun animations, all ages incl. Gen Z, milestone gameplay and a leaderboard, smooth on phone and web.
- Canvas v0.2: rebuilt Timeline/Night/Horizontal, Add, Focus, Review in clay style with animations; new Journey (goal branches, milestones, badges), League (weekly league, friends, party) and Web dashboard boards.
- Docs: DESIGN.md rewritten (clay tokens, motion system); RESEARCH.md #21–22 (subgoals, safe leaderboards); PRODUCT.md (who it's for, Journey in MVP, League in Phase 2, age question); ARCHITECTURE.md (milestones + badges data, §11 motion, §12 league backend).

### 2026-10-30 (2)
- Wrote `docs/ARCHITECTURE.md` (layers, folders, data model, one-axis timeline engine with zoom Sec→Year and 4 directions, event-sourced XP, notifications, build order), `docs/RESEARCH.md` (20 findings → mechanics, app comparison, anti-patterns, metrics), `docs/DESIGN.md` (tokens, screens, interactions, accessibility).
- Added the owner's timeline spec, new MVP list and a "what makes it different" draft to PRODUCT.md.
- Built the interactive UI canvas: https://claude.ai/artifact/ABND6k1WXFuxPjKUE6JusJ (live timeline, night, add sheet, focus, review, horizontal).
- Branch `design/timeline-architecture` (docs only; scaffold files left untracked).

### 2026-10-30
- Created project folder, CLAUDE.md, PRODUCT.md draft, PLAN.md. Git repo initialised; files staged, not committed yet.
