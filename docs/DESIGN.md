# TIMELINER — UI design v2 ("arcade")

> **v2 (2 Nov) replaces the "pro" look.** Built from Nipanko's references on the design canvas (collectible card grid, centre-spine timelines, an "h | m" ruler, a bold arcade game menu). Tokens in `src/ui/theme.ts`:
> - Dark: night indigo ground `#121228`, panel `#1E1E3F`, ink `#F4F1FF`, muted `#A39FCB`, lime accent `#C8F25A`, candy `gold` `#FFD15C` (pointer, rewards) and `pop` grape `#8B5CF6` (day markers). Light: cream ground `#FFF3E3`, white panels, ink `#1A1A2E`.
> - **Comic edges:** everything raised has a thick ink outline and a hard drop shadow, both from one `boxShadow` token (`raised`, `raisedSm`, `selected`: a spread ring plus an offset copy). Cards add a 3 px border in their layer colour (open) or ink (done, filled with the layer colour). Halftone dots (`Halftone`, token `dots`) cover the ground of every screen.
> - Type: **Lilita One** (chunky, rounded, arcade) for titles and numbers, **Nunito** 600–800 for everything you read; both OFL, bundled. `F.display` / `F.text|semi|bold` in `src/ui/type.ts`; no negative tracking on Lilita.
> - **Timeline v2:** title = the day under the pointer (TODAY / TOMORROW / weekday, tap = calendar) · level ring + streak flame · Inbox. Tick's line sits in a slim bar. Then one spine down the middle with a two-half ruler ("21 | 00"), lit lime→mint behind now; cards on both sides; a purple day pill at midnight; Tick on the spine at now with a live NOW clock pill. **The pointer** is a fixed glowing line with the exact time (gold; lime with "NOW" while following the clock), the zoom chip on its left (opens View: zoom, layers, direction) and **Add** on its right. No add button in the tab bar any more.
> - Game cues on cards: open cards show their XP ("13:20 · +15 XP"), done cards "Done · +15 XP", next up pulses, an active task breathes, a missed task is a dashed grey card ("Missed, no penalty").
> - **Collectible cards (v2 slice 2):** the badges became a numbered deck of 17 (`core/game/badges.ts`: common → rare → epic → legendary, earned only by real effort: first task, early / late tasks, streaks, focus hours, honest planning, tasks done, levels 5 and 10). Each card is Tick in an outfit (sprout, sun, moon, flame, star, flag, bolt, headphones, clock, trophy, crown) on its own candy colour with an ink outline and a shine sweep (`CollectCard`). Locked cards are dashed with "?", the rule and a progress bar. Journey → Cards shows the grid and the closest next card. A new card plays the **reveal** (`CardReveal`): blue screen, spinning light rays, confetti, the card floating in, "ADD TO COLLECTION" / "See all cards".
> - **Clock:** a setting, 12-hour with AM/PM ("9 PM | 00", "9:05 PM") or 24-hour ("21 | 00", "21:05"), defaulting to the device's habit; in Settings → Timeline and the View sheet.
> - Inbox: one tap deletes, with a 5-second Undo bar (no tap-twice confirm).
> - **Daily quests:** a slim QUESTS strip under the Timeline header (three pips, the next quest, "All done · +20 XP"); tap for the sheet with each quest's progress and the reward. Three a day from a pool of six, picked from the date.

**v0.3 notes (31 Oct – 1 Nov), kept as history:**

> **v0.3 (31 Oct) replaces the clay look in the app.** Inspired by pill timelines, week strips, watch complications and clean card UIs: dark near-black with hairline edges and a glowing lime accent (gamers / tech), light warm paper with white cards. Tokens live in `src/ui/theme.ts`:
> - Dark: ground `#0D0E12`, panel `#17181E`, ink `#F2F3F5`, muted `#9A9CA6`, accent lime `#C8F25A` (dark text on it), gradient lime → mint `#5EE6C8`, glow `0 0 14px` lime.
> - Light: ground `#ECE9E3`, panel `#FFFFFF`, ink `#15161A`, muted `#62656F`, accent `#C6EE3E` as a fill; lime is too pale to read on paper, so accent *text and lines* use `accentText` deep lime `#4C7608` (5:1 on white).
> - Gradient (`gradient` token) is for rewards and primary actions only: XP bars, the add button, "Close the day", "Done", earned badges, the best-moment card.
> - Edges are inset 1 px shadows in the elevation tokens, so one `boxShadow` gives border + depth.
> - Layer colors: Work `#F5C542`, Study `#7C9CF5`, Health `#6CC070`, Life `#F28A8A`, all with dark text.
> - Type: **Lexend** 600–700 for titles and numbers (level, timer, stats; made for reading ease, very clear digits), **Inter** 500–700 for everything else, bundled with `expo-font` (OFL). Use `fontFamily` from `F` in `src/ui/type.ts`, never `fontWeight`. Tabular numbers; small caps-style labels with letter spacing.
> - Icons: Ionicons (`@expo/vector-icons`), filled when active and outline when not. Task cards wear their layer's icon (Work briefcase, Study book, Health barbell, Life home); todo, note and reminder wear `KIND_ICONS`. No emoji in the UI.
> - Appearance: System / Light / Dark in Settings (stored in the `settings` table). System follows the phone.
> - Settings also holds Layers (rename, 6 colors, 12 icons, show/hide, add) and Timeline options: direction, week start (Mon/Sun), calm mode (no confetti or vibration; XP and level news stay).
> - **Branch timeline (1 Nov):** one straight trunk beside the time labels is time itself: lit (lime glow) behind now, dim ahead, endless in both directions; Tick stands on it at now. Each timed entry branches off the trunk in its layer's colour to a round node (tap = complete; done = filled + check, next up = pulsing ring, missed = dashed and quiet, never red) with the title and time beside it and a thin bar for its length. Month / year goals show a flag on the trunk. Lanes (layers) stay, so drag across lanes still works. On phones the title uses the short month and Tick moves from the level chip to the trunk.
> - **Decluttered Timeline (1 Nov):** only three control rows above the timeline: title (tap = date picker, which also has *Pick a time*) + Inbox + level chip; week strip; zoom + a **View** button (sheet: layers on/off, which way time runs, link to edit layers). The Day/Week/Month/Year bars moved to the top of Review. The timeline gets about 70% of a phone screen.
> - Timeline screen (before 1 Nov): month title with the year in accent · level chip (gradient XP bar, flame streak) · week strip with entry dots that swipes through weeks without end (tap a day to jump; the title follows the shown week, a Today pill comes back) · Day/Week/Month/Year as 10-segment complications · segmented zoom · outline layer chips · cards with a quick-complete ring.
> - Floating tab bar on every tab screen: Timeline, Journey, Review, Settings, with the gradient add button beside it (adds a task at the next quarter hour). Journey, Review and Settings are scrolling screens with a large title that stretches on pull-down and hands over to a compact bar, and sections that slide in one after another.
> - Motion polish (1 Nov): `useLoop` and `ProgressFill` in `src/ui/motion.tsx`. Clock pill pulses (1.8 s), streak flame flickers (1.6 s), the active task's ring breathes (2 s), a completed card pops (1 → 1.08 → 0.97 → 1), XP and focus bars ease in with a small overshoot (scaleX). All loops stop with reduce motion.
> - Game juice: "+N XP" toast with a confetti burst on every gain, a level-up card that springs in, a "Badge unlocked" toast, a spring on the check mark, haptics on phones, and a scale-down on press everywhere. Confetti is off with reduced motion.
> The design canvas below still shows v0.2 clay; the sections after this note describe v0.2 and remain the reference for motion and screen content.

# v0.2 ("clay")

**Interactive canvas:** https://claude.ai/artifact/ABND6k1WXFuxPjKUE6JusJ (private; press Play on a board to use it).
Boards: Timeline (vertical, live) · Night · Add · Focus · Review · Journey (milestones + badges) · League (leaderboard) · Horizontal · Web dashboard.

The canvas prototype is a throwaway design file, not app code. The real components follow `ARCHITECTURE.md`.

## 1. Visual language
- **Look: soft 3D "clay"** (main reference: the Bee-Bot board). Warm sand ground, cream panels that look pressed out of clay, chunky rounded tiles, sticky notes, a purple "selected" state, cute mascots.
- **For everyone, fun for Gen Z:** playful but never childish. Big friendly numbers, stickers and mascots, streak flame, confetti; the same screens stay calm and readable for older users (calm mode turns the extras down).
- **Fonts:** Fredoka (titles, numbers, levels) + Nunito 700–900 (everything else). Free Google Fonts (OFL); bundle with `expo-font`.
- **No emoji in UI.** Simple stroke icons and mascot art.

### Color tokens
| Token | Light | Night |
|---|---|---|
| ground | `#E9DCC9` | `#211B36` |
| panel (raised clay) | `#F7F0E5` | `#2E2650` |
| tray (pressed-in surface) | `#FCF8F2` | `#362D5C` |
| ink | `#3B2F28` | `#F5F0FF` |
| muted (only on panel / tray) | `#73635A` | `#C3B8E6` |
| chip | `#EFE5D6` | `#3E3468` |
| accent (selected, now-line) | `#6A55D8` | `#B7A6FF` |
| action (big + button, CTA) | `#F07A2E` | `#F07A2E` |

### Clay recipe (the whole look is 3 shadows)
- **Raised:** `0 8px 18px rgba(110,80,50,.18)` + inner top highlight `inset 0 2px 0 rgba(255,255,255,.8)` + inner bottom shade `inset 0 -3px 0 rgba(110,80,50,.10)`.
- **Pressed-in tray:** `inset 0 3px 10px rgba(110,80,50,.14)`.
- **Selected:** accent fill + raised shadow tinted purple. On press everything sinks 2 px and scales to 96 %.
- Radii: tiles 18–22, panels 24–28, chips full pill.

### Layer colors (fill / text / strong line)
Work `#F8DE84 / #4A3A00 / #D9A520` · Study `#CDBDF4 / #2F2160 / #8C73E0` · Health `#B9D79C / #24410E / #6E9E45` · Life `#F5AE97 / #5A1D0E / #E0735C`. Text on every fill stays ≥ 4.5 : 1.

### Mascot: "Tick"
An orange clay blob with a sprout. It rides the now-line, walks the day's path in Focus, jumps on completions and cheers in the web activity feed. Other players appear as colored blob variants. Final art later in Rive (PLAN.md).
**Built 1 Nov (v1, SVG):** `features/game/Tick.tsx` (react-native-svg, our own drawing). Moods from `core/game/mascot.ts`: happy (default, also after a missed day: never sad), proud (3+ done today), sleepy (11 PM–6 AM), focused (focus running), cheer (1.4 s after any XP gain, with a jump + squash). Idle bob 2.4 s. Placed in the Timeline HUD, Focus, the level-up card and the Settings avatar. Not yet: riding the now-line, walking the path, Rive.

### Entry kinds and states
Unchanged from v0.1: Task (timer, a block), Todo (checkbox pill), Note (pencil pill), Reminder (bell pill). Planned = pastel clay; Active = breathing purple ring + progress bar; Done = check, faded; Skipped = dashed neutral gap; Past = soft veil.

## 2. Motion system
Motion must feel **juicy but cheap**: only `transform` and `opacity` animate, so it stays 60 fps on low-end Android and on the web.

| Moment | Animation | Duration / curve |
|---|---|---|
| Any press | sink 2 px, scale 0.96 | 120 ms ease |
| Card completed | pop (1 → 1.08 → 0.97 → 1) + toast drops in + 8-piece confetti + mascot jump + haptic | 450 ms; toast 320 ms overshoot |
| Level up | dim + card scales in with overshoot + mascot bounces + confetti | 500 ms, auto-stays until tapped |
| Now-line | flows continuously; clock pill pulses | pulse 1.8 s loop |
| Active task | ring "breathes" | 2 s loop |
| Mascot idle | bob 3 px | 2.4 s loop |
| Streak flame | flicker | 1.6 s loop |
| Zoom change | timeline content fades/scales in | 350 ms |
| Sheets | slide up with slight overshoot | 340 ms |
| Lists (league, feed, badges) | stagger rise / slide, 50–60 ms apart | 400 ms each |
| Progress bars, XP | width eases with a tiny overshoot | 600–1200 ms |
| Journey graph | branches draw in, future stays dashed | 700–800 ms |
| Break | breathing circle (4 s in / 4 s out) | 8 s loop |
| Badges | shine sweep across unlocked coins | 3.2 s loop, staggered |

- **Reduce motion** (system setting) turns all loops and confetti off; the now-line steps once a second.
- **Calm mode** (in-app) keeps motion but removes confetti, sounds and league prompts.

## 3. Screens
1. **Timeline (home).** Greeting + date · HUD (mascot with level badge, XP bar, streak flame, league rank chip) · Day/Week/Month/Year bars (tap → Review) · zoom toolbar (Sec → Year) · layer chips · timeline tray (lane headers, ticks, lanes, live now-line, Tick) · dock: Timeline, Focus, big +, Journey, League.
2. **Add sheet.** Kind tiles, title, time scale, length, layer, reminder, treat, WOOP fields for month/year goals; the plan shown as a tilted sticky note.
3. **Focus.** Clay ring countdown, today's path with Tick walking, treat, park-a-thought into Inbox, confetti on Done, then a breathing break.
4. **Review.** Count-up stat tiles, path with gaps, plan vs. actual, tomorrow's first task (sticky), ends on the best moment.
5. **Journey.** Git-style graph: your life is the trunk, each goal is a branch, milestones are stops, finished goals merge back. Tap a stop for details; "Mark reached" celebrates. Badges tab: streak (3/7/14/30/66 days), focus hours, honest planner, early bird, comeback, fresh start, party.
6. **League.** Weekly league (podium + list), Friends (cheer), Party (co-op quest). Rules in `RESEARCH.md` #16, #22.
7. **Web dashboard.** Bee-Bot layout: goals sidebar · tool bar · sticky notes (quests, up next) + "now playing" card · stat tiles · the same live timeline in horizontal lanes · quick-capture bar · live activity feed · dock of clay tiles. Wraps into one column on a phone-width browser.

## 4. Interactions
| Gesture | Result |
|---|---|
| Tap empty spot on timeline | Add sheet at that time and lane |
| Tap card | Card actions (prototype: complete / undo) |
| Drag / scroll | Travel in time; "Back to now" returns to live follow |
| Inbox icon (top corner, count badge) | `/inbox` modal: capture field (Enter adds and stays ready), list newest first; Plan opens the add sheet with the title at the next quarter hour and clears the item on save; delete takes two taps. Focus mode has "Park a thought" that saves without leaving the timer. |
| Calendar / clock icons (top corner) | Calendar: month grid (week start from Settings), tap a day → the timeline jumps there (9 AM, or now for today); Today button. Clock: iPhone-alarm-style wheels (hour, minute, AM/PM) with 3D tilt, momentum, a soft tick and selection haptic per notch (no sound in calm mode); jumps to that time on the day in view. |
| Pinch (web: ctrl/⌘ + scroll, trackpad pinch) | Step the zoom ladder: each doubling of finger distance = one rung. A chip shows the rung you'll land on; it switches on release. Continuous zoom between rungs is later. |
| Long-press card (350 ms), drag | Reschedule along the time axis, and sideways into another lane to change its layer (half a lane is enough); snaps to the zoom's slot, keeps the length. Moving before the hold ends scrolls the timeline instead. Moments only; whole days/weeks use the sheet's ‹ › |
| Web: type in the capture bar | Goes to Inbox; natural-language time parsing later |

## 5. Accessibility
- Every card is a button with a full label ("Task, Code review, 2:00–2:30 PM, skipped").
- Touch targets ≥ 44 px; system font scaling up to 130 % without clipping.
- Reduce motion respected everywhere (§2).
- Color is never the only signal: icons, text and position come with it.
- The + button gives a no-gesture path to add anything.

## 6. Where the references went
| Reference | Taken |
|---|---|
| Bee-Bot board (clay panels, purple selected tool, sticky notes, git-branch progress, activity feed, chunky dock, mascots) | The whole v0.2 look; Journey graph; web dashboard layout; live activity; dock |
| Purple vertical timeline | Night theme, pill entries, kind icons |
| "Intelly" dashboard | Now-line + clock pill, past veil, pastel stat tiles |
| Classic alternating timeline | Single-layer view = centered spine; tags |
