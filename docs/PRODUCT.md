# TIMELINER — Product

> Draft. Nipanko fills in / corrects. Claude: never invent features beyond this file; ask.

## One-liner (draft)
Your day is a **timeline you play**. Plan it as blocks, live it as a run: finishing blocks moves your character forward through a world. Streaks build your world, and skipped blocks leave visible gaps.

## Who it's for
- [ ] Primary user: _(students? indie devs? remote workers? me first)_
- Me (Nipanko): I plan game-dev days, study time, and Storybook/Tried Indie work.

## Core loop (draft)
1. **Plan:** drag tasks onto today's timeline (time blocks).
2. **Play:** start a block → focus timer → complete it → the character advances, earns XP and loot.
3. **Review:** end of day "run summary": what got done, streak, world growth.
4. **Grow:** over weeks the timeline becomes a visible world or map of your life's work.

## The timeline (Nipanko's spec, 30 Oct 2026)
- The main screen is a **timeline with dates and times** that keeps **moving like a clock, down to the second**, with progress bars.
- The user picks a moment on it (a second, minute, hour, day, week, month or year) and adds a **note, todo, reminder or task** there.
- **Layers** the user chooses and shows/hides. *Assumed: one lane per area of life (Work, Study, Health…), like git branches. Confirm.*
- Works **vertical, horizontal or any direction**. *Assumed: down, up, right, left now; a round clock view later. Confirm.*
- Plus the common productivity features, in the game style.
- How it's built: `ARCHITECTURE.md`. How it looks: `DESIGN.md`. Why the game rules: `RESEARCH.md`.

## MVP features (v0.1, local only)
- [ ] One continuous timeline, zoom Sec → Year, live now-line that flows like a clock
- [ ] Directions: vertical (down / up) and horizontal (right / left)
- [ ] Layers as lanes: create, color, show / hide
- [ ] Entries: task (time block), todo, note, reminder. Tap a time to add; edit, move, delete
- [ ] Day / week / month / year progress bars; progress bar on the active task
- [ ] Focus timer per task + notification when done; reminders as notifications
- [ ] Character moves along the timeline; XP + level (rules in ARCHITECTURE.md §5)
- [ ] Forgiving daily streak (freezes) + end-of-day review
- [ ] Works offline, data stored on device

## Later (not in MVP)
- Accounts + sync across phone and web (Supabase)
- Web dashboard: weekly/monthly stats, plan the week on a big screen
- **Pro** subscription: unlimited history, themes/worlds, sync, stats
- Calendar import, home-screen widgets, co-op "party" timelines with friends
- Round "clock" view of the timeline, recurring entries, subtasks, search, priorities/tags
- Inbox lane for quick capture ("park a thought" in focus mode)

## What makes it different
- [ ] _Draft from 30 Oct chat, confirm or rewrite:_ Planners like Structured show one day; habit RPGs like Habitica are lists that punish misses. TIMELINER is **one live timeline from seconds to years**, in parallel layers and any direction, with a **forgiving** game layer built on productivity research.

## Business
- Free app + **Pro** (monthly / yearly / lifetime). No ads.
- Owner: Tried Indie. Tax & GST → vault note `Tried Indie - Compliance`.
