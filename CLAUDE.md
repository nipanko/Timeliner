# TIMELINER — instructions for Claude Code

Game-based productivity app owned by **Tried Indie** (Nipanko's sole proprietorship). Not related to Storybook Interactive: never copy code, assets or data between them.

- **Start of every session:** read `docs/PROGRESS.md` first, then tell me in 2–3 lines where we left off and what's next. **End of every session** (or when I say "save progress"): update its "Now" section, add a dated log entry, and commit.
- Read `docs/PRODUCT.md` (what to build) and `docs/PLAN.md` (stack, phases, working model) before any work.
- Build only what PRODUCT.md specifies for the current phase. If something is unclear, ask.
- Stack: Expo (React Native) + TypeScript (strict) + Expo Router; expo-sqlite + Drizzle locally; Supabase later. Prefer Expo SDK modules over third-party packages; don't add a dependency for a few lines.
- Game rules (XP, levels, streaks, timeline math) live as pure functions in `src/core/` with Jest tests. UI components never hold game logic.
- One feature per git branch; commit small. Keep `main` green (typecheck, lint, tests).
- No secrets in git. Use `.env` (gitignored) and EAS secrets.
- Privacy by default: minimal data, no tracking of personal content, anonymous analytics only.
- The owner is learning TypeScript/React Native (comes from Godot). Explain new concepts briefly in simple English, mapping them to Godot ideas when helpful.
- Business notes (tax, GST, decisions) live in the Second Brain vault at `D:\Claude\Second Brain\03 Tried Indie\`. Update `SaaS/TIMELINER.md` there when a phase completes.
