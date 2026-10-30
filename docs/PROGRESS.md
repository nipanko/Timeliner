# TIMELINER — Progress

Claude reads this first in every session and updates it at the end. Newest entry on top.

## Now
- **Phase:** 1, local MVP (started 30 Oct). Phase 0 leftovers stay with Nipanko: name check, domain, landing page.
- **Where the code is:** `main` has scaffold + slices 1–6. Slice 7 is on branch `journey/goals` (checked out), not merged. 53 tests, typecheck and lint green.
- **Resume with:** Nipanko tries Journey (tap the level header), then says merge; next slice 8 = layer management + settings (rename/recolor/add layers, direction, week start, calm mode). After that, slice 9 = motion polish (fonts, icons, mascot, celebrations).
- **Still open from slices 2–3:** drag a card to reschedule; pinch zoom; fonts (Fredoka/Nunito); icons + mascot (needs react-native-svg); windowed DB query once entries reach thousands (`shortcut:` in `features/entries/data.ts`).
- **Decisions made:** layers = lanes; 4 directions (radial later); phones stay portrait, horizontal is a direction setting; minimum age 13 with parental consent for 13–17; web = single-page app with isolation headers.
- **Nipanko's to-dos:** confirm "what makes it different" (PRODUCT.md); check the name (Play Store, App Store, IP India); buy domain; create the private GitHub repo so CI can run.
- **Blocked on:** —

## Session log
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
