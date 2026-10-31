# TIMELINER — Product

> Draft. Nipanko fills in / corrects. Claude: never invent features beyond this file; ask.

## One-liner (draft)
Your day is a **timeline you play**. Plan it as blocks, live it as a run: finishing blocks moves your character forward through a world. Streaks build your world, and skipped blocks leave visible gaps.

## Who it's for
- [x] **Everyone** who plans their time, with a look and game layer made to feel fun for **Gen Z** (Nipanko, 30 Oct). Calm mode for people who want less game.
- [x] **Minimum age 13** (Nipanko, 30 Oct). Ages 13–17 need verifiable parental consent (India's DPDP Act counts everyone under 18 as a child). For 13–17: no League, Friends or Party; no analytics or behaviour tracking; no ads. Details: ARCHITECTURE.md §12, PLAN.md §5. *Check the exact consent method against the DPDP Rules before Phase 2. This note is not legal advice.*
- Me (Nipanko): I plan game-dev days, study time, and Storybook/Tried Indie work.

## Core loop (draft)
1. **Plan:** drag tasks onto today's timeline (time blocks).
2. **Play:** start a block → focus timer → complete it → the character advances, earns XP and loot.
3. **Review:** end of day "run summary": what got done, streak, world growth.
4. **Grow:** over weeks the timeline becomes a visible world or map of your life's work.

## The timeline (Nipanko's spec, 30 Oct 2026)
- The main screen is a **timeline with dates and times** that keeps **moving like a clock, down to the second**, with progress bars.
- The user picks a moment on it (a second, minute, hour, day, week, month or year) and adds a **note, todo, reminder or task** there.
- **Layers** the user chooses and shows/hides: one lane per area of life (Work, Study, Health…), like git branches. *(Confirmed 30 Oct.)*
- Works **vertical, horizontal or any direction**: down, up, right, left in the MVP; a round clock view later. *(Confirmed 30 Oct.)*
- Plus the common productivity features, in the game style.
- How it's built: `ARCHITECTURE.md`. How it looks: `DESIGN.md`. Why the game rules: `RESEARCH.md`.

## MVP features (v0.1, local only)
- [ ] One continuous timeline, zoom Sec → Year, live now-line that flows like a clock
- [x] Directions: vertical (down / up) and horizontal (right / left)
- [x] Layers as lanes: create, color, show / hide
- [ ] Entries: task (time block), todo, note, reminder. Tap a time to add; edit, move, delete
- [ ] Day / week / month / year progress bars; progress bar on the active task
- [ ] Focus timer per task + notification when done; reminders as notifications
- [ ] Character moves along the timeline; XP + level (rules in ARCHITECTURE.md §5)
- [ ] Forgiving daily streak (freezes) + end-of-day review
- [ ] **Journey:** goals as branches with milestone stops; badges (streaks, focus hours, honest planner, comeback…)
- [ ] **Clay look + smooth, fun animations** on phone and web (DESIGN.md §1–2); calm mode and reduce-motion respected
- [ ] Works offline, data stored on device

## Later (not in MVP)
- Accounts + sync across phone and web (Supabase)
- Web dashboard: weekly/monthly stats, plan the week on a big screen
- **Pro** subscription: unlimited history, themes/worlds, sync, stats
- **League (Phase 2, needs accounts):** weekly leagues of similar players, friends + cheers, co-op party quests. Rules in RESEARCH.md #16, #22.
- Calendar import, home-screen widgets
- Round "clock" view of the timeline, recurring entries, subtasks, search, priorities/tags
- Inbox lane for quick capture ("park a thought" in focus mode)

## What makes it different
- [ ] _Draft from 30 Oct chat, confirm or rewrite:_ Planners like Structured show one day; habit RPGs like Habitica are lists that punish misses. TIMELINER is **one live timeline from seconds to years**, in parallel layers and any direction, with a **forgiving** game layer built on productivity research.

## Business
- Free app + **Pro** (monthly / yearly / lifetime). No ads.
- Owner: Tried Indie. Tax & GST → vault note `Tried Indie - Compliance`.
