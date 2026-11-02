# TIMELINER: launch plan (web, stores, accounts, scale)

Written 1 Nov 2026. How TIMELINER goes from "runs on my laptop" to a standard, scalable product.
Prices and limits below are from memory: **check them on each provider's pricing page before paying.**

## 0. Where we are

- **Local-first app.** Everything (entries, XP, settings) lives in SQLite on the device: on phones via expo-sqlite, on the web in the browser's private storage (OPFS) through a web worker. No server, no account, works offline.
- **Web app ready (1 Nov):**
  - `npm run build:web` produces `dist/`;
  - installable (manifest + Tick icons), fully offline after the first visit (service worker precaches every file of the build);
  - deep links work on refresh; wide screens keep a readable column;
  - security headers are in `public/_headers`.
- **Why local-first is the right base for scale:** the app never waits for a server, the server only stores backups/sync (small, cheap), and the web version is static files on a CDN (scales to millions for ~free).

## 1. Put the web app online (Phase 1.5, now)

**Host: Cloudflare Pages.**
- Free tier and a global CDN.
- It honours `_headers`, which the on-device database needs (cross-origin isolation).
- It serves the app for any path, which our single-page routing needs.
- Branch previews come built in.

Steps (Nipanko does the account parts; I prepare the rest):
1. **GitHub private repo** (already on your to-do list), push `main`.
2. **Cloudflare account →** Workers & Pages → Create → Pages → connect the repo.
   - Build command: `npm run build:web` (Cloudflare installs the dependencies from `package-lock.json` itself)
   - Output folder: `dist`
   - Environment variable: `NODE_VERSION = 22`
3. Every push to `main` deploys to production. Every other branch gets its own preview URL: that is our **staging**.
4. **Domain** (when bought) → Cloudflare DNS → Pages custom domain. HTTPS is automatic.
5. **Test on real browsers before sharing the link:**
   - Chrome, Edge, Firefox;
   - Safari on Mac and **iPhone (confirmed working 1 Nov)**. We switched to `COEP: require-corp` because Safari doesn't support `credentialless`; confirm the database starts there.
6. **CI (GitHub Actions):** typecheck + lint + tests + `build:web` on every pull request. `main` only merges green (CLAUDE.md rule).

What web users get at this stage: the full app, private to their browser.
- Clearing site data deletes it. **Settings › Your data** (built 1 Nov) exports a backup file and restores one: the file is fully validated, and the current data is downloaded first. That's the bridge until accounts exist.
- The page asks the browser for persistent storage (granted to installed or frequently used sites), so it isn't evicted when space runs low.
- **Resolved:** the test browser's data was found reset twice on 31 Oct / 1 Nov. Cause found on 1 Nov: the Claude browser pane wipes all its storage (database and localStorage) when it is closed and reopened. Not an app bug. Real-world note: expo-sqlite's browser storage can be open in one tab at a time (the app retries once, then explains).

## 2. Phones: App Store and Google Play (Phase 2a)

- **Build and ship with EAS (Expo Application Services):**
  - `eas build` makes the iOS/Android binaries in the cloud (no Mac needed);
  - `eas submit` uploads them;
  - `eas update` pushes JS-only fixes over the air without a store review.
- **Accounts needed (Nipanko):**
  - Apple Developer Program (≈ $99/year; individual or organisation: as a sole proprietor, individual is simplest);
  - Google Play Console (≈ $25 once).
- **Channels:** `development` (your phone), `preview` (TestFlight + Play internal testing for friends), `production`.
- **Store paperwork:**
  - privacy "nutrition label" (Apple) and Data safety form (Google);
  - screenshots, icon (Tick is ready), age rating;
  - support URL and privacy policy URL.
- **Before the first store build:** run it on your phone (nothing since slice 2 has run on a device): notifications, haptics, sounds, gestures.

## 3. Accounts (Phase 2b)

**Principle: the account is optional.** The app keeps working without one. An account adds: backup, sync across phone + web, and (later) the League.

**Provider: Supabase** (already the planned stack). It gives Postgres + Auth + Storage + Edge Functions in one place, has an EU region, and is open source, so we can self-host later if needed.

**Sign-in methods:**
- email one-time code (no passwords to leak or reset);
- **Sign in with Apple** (Apple requires it if we offer Google sign-in on iOS);
- Google;
- passkeys later.

**Age (decided 30 Oct):**
- Ask the birth year at sign-up.
- Under 13: no account (the app still works locally).
- 13–17: verifiable parental consent before the account is active (consent email to a parent with a confirm link, stored with a timestamp); no social features, no analytics.
- This also matches India's DPDP Act, which treats under-18s as children: parental consent, no tracking, no targeted ads.

**What an account stores:** nickname, mascot colour, birth year, consent record. No real name, no contacts, no location.

**Rights built in from day one:** in-app account deletion (Apple requires it), data export, and "delete my cloud copy but keep my phone data".

**First sign-in:** the local data is uploaded and merged. Every row already has a UUID, so phone + web data merge without clashes.

## 4. Sync (Phase 2b, with accounts)

**Model:** the device stays the source of speed; the server keeps a copy.
- Each table gets `userId`, `updatedAt` and `deletedAt`.
- Deletes become soft deletes (tombstones), so a delete on one device reaches the others.
- Conflicts: last write wins per row, by server time. Fine for a personal planner.

**Two ways to build it:**
- **A. A sync engine (recommended to evaluate first): PowerSync.** It is made for "SQLite on device + Supabase Postgres", handles offline queues, retries and partial sync, and has a free tier. Less code for us to get wrong.
- **B. Hand-rolled:**
  - push: send rows changed since the last sync;
  - pull: fetch rows with `updatedAt > cursor`;
  - an Edge Function in between.
  
  Cheaper in money, more code and edge cases (clock skew, partial failures).

**Security:** Postgres **Row Level Security** on every table (`userId = auth.uid()`). The app only ever holds the public anon key, and the service key lives only in Edge Functions.

**Prep we can do any time (no server needed):**
- add `updatedAt` to the tables that lack it (`focus_sessions`, `day_logs`, `milestones`, `inbox`, `settings`) and soft-delete everywhere;
- a JSON export/import;
- one `sync` module boundary in `src/db`.

## 5. Making it powerful and scalable

| Concern | Plan |
|---|---|
| Web traffic | Static files on Cloudflare's CDN; content-hashed bundles cached for a year (`_headers`). Effectively unlimited. |
| Server load | Only sync + auth. A user's data is kilobytes; sync is a few small requests a day. Index `(userId, updatedAt)` on every table. |
| Database | Supabase Postgres with its connection pooler. Upgrade compute when needed; read replicas only if leaderboards get heavy. |
| League (Phase 2c) | Never computed live: a weekly scheduled job (pg_cron / Edge Function) groups players into leagues of ~20–30 by level and writes the standings; the app reads one small row. Score = focus XP with a daily cap (RESEARCH.md #22). |
| Push notifications | Today: local notifications only. Later: Expo Push service from Edge Functions (league results, a parent's consent). |
| Email | Transactional only (sign-in codes, parental consent) via a provider like Resend or Postmark. No marketing email to minors. |
| Media | None yet. If avatars arrive: Supabase Storage with `Cross-Origin-Resource-Policy` set (needed under our COEP). |
| Performance | The timeline already runs on the UI thread. Next: the windowed DB query once someone has thousands of entries (`shortcut:` in `features/entries/data.ts`). |

## 6. Safety, privacy and quality

- **Errors:** Sentry for crash/error reports, with personal content scrubbed (no entry titles in reports). Free tier to start.
- **Analytics:** anonymous only, opt-in, none for minors (CLAUDE.md).
  - Cookie-less, privacy-friendly: Cloudflare Web Analytics for the website; PostHog (EU cloud) for in-app events.
  - Counts like "completed a task", never the task's text.
- **Legal pages** before the public launch:
  - Privacy Policy (draft: `docs/PRIVACY.md`, 1 Nov) and Terms;
  - a "What we store" page in plain English;
  - a contact for data requests.
  
  Laws in scope: India's DPDP Act (home market), GDPR (EU users), COPPA (we block under-13 accounts).
- **Secrets:** never in git. `.env` locally, Cloudflare/EAS environment secrets for builds, Supabase keys server-side only.
- **Accounts hygiene (Nipanko):** 2-factor login on GitHub, Cloudflare, Supabase, Apple, Google, and the domain registrar. Use one shared business email for all of them.
- **Backups:**
  - Supabase daily backups (point-in-time recovery is a paid add-on: worth it at real user numbers);
  - users can always export their own data.
- **Dependencies:** Dependabot alerts on GitHub; keep Expo on a supported SDK (upgrade once a year).
- **Reviews:** one feature per branch, CI green, preview URL checked, then merge (our current loop).

## 7. Environments

| | Web | Phone | Database |
|---|---|---|---|
| Development | `npm run web:preview` on :8090 | Expo dev build on your phone | Local SQLite (+ Supabase local via CLI, later) |
| Staging | Cloudflare preview URL per branch | EAS `preview` channel (TestFlight / Play internal) | Separate Supabase project "timeliner-staging" |
| Production | your domain | Store builds, EAS `production` channel | Supabase project "timeliner-prod" (region near most users: Mumbai for India) |

## 8. Rough costs (verify before paying)

| Item | Start | At a few thousand active users |
|---|---|---|
| Domain | ≈ ₹800–1,500 / year | same |
| Cloudflare Pages | free | free |
| Apple Developer | ≈ $99 / year | same |
| Google Play | ≈ $25 once | – |
| Supabase | free tier (projects pause after a week idle: fine for staging) | Pro ≈ $25 / month + usage |
| Sentry, email, analytics | free tiers | small monthly fees |

The GST/tax treatment of these goes in the Second Brain notes (`03 Tried Indie/SaaS/TIMELINER.md`).

## 9. Order of work

1. **Now:** web online on a Cloudflare preview URL; test Safari/iPhone; privacy policy draft. (GitHub CI workflow and Export/Import: done 1 Nov.)
2. **Phone run:** dev build on your phone; fix what only shows on devices.
3. **Phase 2a:** EAS builds → TestFlight / Play internal for friends; store listings.
4. **Phase 2b:** Supabase project, sign-in (email code, Apple, Google), age gate + parental consent, sync (evaluate PowerSync first), account deletion.
5. **Public launch:** domain, legal pages, store release, Sentry + opt-in analytics.
6. **Phase 2c:** League (opt-in, nickname + Tick only), push notifications.

## 10. Decisions and accounts needed from Nipanko

- Create: GitHub private repo, Cloudflare account, (later) Supabase, Apple Developer, Google Play Console, business email with 2-factor everywhere.
- Choose: the domain, and the name check (already on the to-do list).
- Confirm: sync approach (PowerSync vs hand-rolled), sign-in methods (email code + Apple + Google suggested), and the main database region (Mumbai suggested).

## 11. Version 1 release plan (decided 2 Nov)

Nipanko's choices: **web first, Android right after; accounts + sync in v1; full QA pass + fixes; a beta with friends before announcing.**

### Nipanko's steps (accounts can't be tested until 1–6 are done)
1. **Domain:** finish the name check, buy the domain, add it to Cloudflare (DNS).
2. **Email sender (Resend):** create an account, add the domain, add the DNS records Resend shows (in Cloudflare DNS), wait for "Verified".
3. **Supabase → Authentication → SMTP settings:** turn on custom SMTP with Resend (host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `TIMELINER <hello@your-domain>`). The key stays in Supabase only; never paste it in chat or in the repo.
4. **Supabase → Authentication → Email templates → Magic link:** replace the body with the code template Claude provides (shows `{{ .Token }}`, the 6-digit code, instead of a link).
5. **Supabase → SQL editor:** run the migration files Claude points to (profiles, sync tables, completions).
6. **Supabase → Authentication → URL configuration:** Site URL = `https://your-domain`; add the Cloudflare preview URL as a redirect URL.
7. **Cloudflare Pages → Settings → Environment variables (production + preview):** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (the *publishable* key only), then connect the custom domain.
8. **Legal details:** your legal name / business name, a contact email and postal address for the privacy policy (the `[brackets]` in `docs/PRIVACY.md`).
9. **For Android right after:** Google Play Console account (≈ $25), an Android phone for the first device run, and 12+ testers for Google's 14-day closed test.

### Claude's steps
1. **Full QA pass** of every screen at phone and desktop size; fix what it finds (branch `release/v1-qa`).
2. **Accounts + sync onto today's app:** bring `accounts/auth` and `sync/engine` up to date with main, add `completions` to sync, **Delete account** (stores require it), parental consent for 13–17, test against Supabase once steps 1–7 are done.
3. **Legal pages in the app:** Privacy (from `docs/PRIVACY.md`), Terms of Use, "What we store", linked from Settings and the sign-in screen.
4. **Version 1.0.0:** version shown in Settings → About, a short changelog.
5. **Beta kit:** a one-page test checklist and an in-app "Send feedback" link for 5–10 friends.
6. **Android:** EAS config (`eas.json`, app ids), a development build for Nipanko's phone, fix device-only issues, then a Play internal test.
