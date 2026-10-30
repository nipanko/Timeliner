# TIMELINER — Build & Launch Plan

## 1. Stack (recommended)

**One TypeScript codebase → Android + iOS + Web dashboard.**

| Layer | Choice | Why | Cost |
|---|---|---|---|
| App framework | **Expo (React Native) + TypeScript + Expo Router** | Same code runs on Android, iOS and web. Native notifications, widgets, in-app purchases. Claude Code is very strong in TypeScript. | Free |
| iOS builds without a Mac | **EAS Build** (Expo cloud) | Builds and uploads iOS apps from Windows | Free tier (limited builds/month) |
| Game layer | **react-native-reanimated + @shopify/react-native-skia** (later **Rive** for character animation) | Smooth 60fps animation of the timeline world inside a normal app | Free |
| Local data | **expo-sqlite** (+ Drizzle ORM) | Offline-first; works without login | Free |
| Backend (Phase 2) | **Supabase**: Auth, Postgres, Row Level Security, Edge Functions | No server to run; free tier | Free → $25/mo when big |
| Web dashboard | Same Expo app built for web, hosted on **Cloudflare Pages** | Commercial use allowed on the free plan (Vercel's free Hobby plan forbids commercial use) | Free |
| Subscriptions (mobile) | **RevenueCat** + Google Play Billing / Apple IAP | Handles receipts, Pro status, trials | Free until $2.5k/month revenue |
| Payments (web) | **Lemon Squeezy / Paddle** (merchant of record) or **Razorpay** for India | MoR handles global sales tax | % per sale only |
| Crash reports | **Sentry** (free dev plan) | | Free |
| Product analytics | **PostHog** (free 1M events/mo), anonymous events only | | Free |
| Code + CI | **GitHub** private repo + **GitHub Actions** | Tests on every push | Free |
| Landing page + legal pages | Static page on Cloudflare Pages | | Free |

### Why not Godot for this one?
Godot is great for games, but TIMELINER is an **app first, game second**: text input, lists, notifications, widgets, calendar, subscriptions, accessibility, web dashboard. Godot makes those painful, and iOS export needs a Mac. Keep Godot for Tried Indie *games*. If the game layer later needs more than Skia/Rive can do, the art can still be made in my usual tools.

## 2. Unavoidable costs
| Item | Cost | When |
|---|---|---|
| Google Play developer account | **$25 one-time** | Phase 3 |
| Apple Developer Program | **$99/year** | Phase 4, only when Android shows traction |
| Domain (e.g., timeliner.app / .in) | ~₹800–2,000/year | Phase 0 (check availability) |
| Trademark "TIMELINER" (class 9 + 42), as individual | ~₹4,500 per class e-filing | Before public launch, **after** a conflict search |
| Everything else | free tiers | |

**Year-one total: roughly ₹12,000–20,000**, most of it Apple + trademark, which can wait.

## 3. Working model with Claude Code
1. **Spec first.** Every feature starts as a short section in `docs/PRODUCT.md` (what + acceptance criteria). Claude builds only what's written.
2. **Small vertical slices.** One feature at a time, end-to-end (UI → logic → storage → test), each on its own git branch.
3. **Loop per slice:** ask Claude to plan → approve → Claude implements + writes tests → run the app on my phone (Expo Go / dev build) → `/code-review` → commit → merge.
4. **Logic separate from UI.** Game rules (XP, streaks, levels) are pure TypeScript functions in `src/core/`, unit-tested with Jest. UI only displays them.
5. **Main always works.** CI runs typecheck + lint + tests on every push.
6. **Weekly:** use the app myself every day; write what annoyed me in `docs/FEEDBACK.md`; next week's slices come from that.

## 4. Roadmap
| Phase | Goal | Done when |
|---|---|---|
| **0. Concept & validation** (2 weeks) | Finalise PRODUCT.md, check name/trademark/domain, landing page + waitlist | 50+ waitlist signups or strong feedback from 10 people |
| **1. Local MVP** (4–6 weeks) | MVP features, offline, Android dev build on my phone | I use it daily for 2 weeks |
| **2. Accounts + sync + web dashboard** (3–4 weeks) | Supabase auth, sync, RLS, web build on Cloudflare Pages | Same data on phone and web |
| **3. Android launch** | RevenueCat Pro, legal pages, Play Store listing. ⚠️ New personal Play accounts must run a **closed test with 12+ testers for 14 days** before production. | Live on Play Store, first paying user |
| **4. iOS** | Apple account, TestFlight, App Store review | Live on App Store |
| **5. Grow** | Widgets, calendar import, co-op, worlds/themes | MRR growing month on month |

## 5. "Production-grade" checklist (what serious apps do, at free cost)
- Separate **dev** and **prod** Supabase projects. Secrets never in git (`.env`, EAS secrets).
- **Row Level Security** on every table; a user can only read their own rows.
- Database migrations in git (`supabase/migrations`).
- Backups: free Supabase has no point-in-time restore → weekly `pg_dump` via GitHub Action. Free projects **pause after ~1 week of inactivity**, so keep prod active or upgrade when there are real users.
- Sentry crash reporting + release tags; fix crashes before features.
- Over-the-air JS updates with **EAS Update** for quick fixes (store rules still apply for native changes).
- Accessibility: font scaling, screen-reader labels, colour contrast.
- Privacy: collect the minimum. Account deletion in-app (both stores require it). Privacy policy + terms + refund policy. Minimum age 13. Ages 13–17 need verifiable parental consent (DPDP Act: under 18 = child), and get no social features, tracking or targeted ads. Play Console target audience: 13+ (no under-13 group, so no Families programme).
- Version + changelog for every release.

## 6. Next steps (in order)
1. ☐ Fill the `[ ]` items in `docs/PRODUCT.md` (who it's for, what makes it different)
2. ☐ Check "TIMELINER" on Play Store, App Store and IP India trademark search; buy domain
3. ☐ Create private GitHub repo, push this folder
4. ☐ Ask Claude Code: "scaffold the Expo app per docs/PLAN.md"
5. ☐ Landing page + waitlist
