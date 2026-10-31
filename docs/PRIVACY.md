# TIMELINER Privacy Policy (DRAFT)

> **Draft for review, not yet published. Not legal advice.** Written on 1 Nov 2026 from what the app actually does (checked in the code), to be reviewed by a lawyer familiar with India's Digital Personal Data Protection Act 2023 (DPDP Act) before it goes live. Items in **[brackets]** must be filled in; the checklist at the end lists what has to be true before publishing.

**Effective date:** [date of publication]
**Last updated:** [date]

## 1. Who we are

TIMELINER is made by **Tried Indie**, a sole proprietorship of **[legal name]**, based in **[city, state], India**. In this policy, "we" means Tried Indie.

Contact for anything about your data, including complaints (our Grievance Officer): **[name], [privacy@your-domain]**. We reply within **[30]** days.

## 2. The short version

- **Without an account, your data never leaves your device.** Your timeline, tasks, notes, XP and settings are stored in your browser or on your phone. We can't see them.
- **An account is optional.** If you create one, we store your email, your birth year and a copy of your timeline so we can back it up and sync it between your devices.
- **No ads. We never sell or rent your data.** No tracking across other apps or websites.
- **Children:** accounts are for people aged 13 and over. People aged 13 to 17 need a parent's or guardian's consent, and we never use analytics or advertising on their accounts.
- **You're in control:** you can download all your data, correct it, and delete your account at any time.

## 3. Using TIMELINER without an account

Everything you create (entries, layers, goals, milestones, focus sessions, review history, inbox notes and settings) is stored **only on your device**:

- on the **web**, in your browser's storage for the TIMELINER site;
- in the **phone app**, in the app's own storage on your phone.

We don't receive this data. Clearing your browser's site data or uninstalling the app deletes it. **Settings → Your data → Export a backup** saves a copy as a file you keep.

**Reminders** are scheduled by your phone itself. Their content isn't sent to us or to any notification service.

## 4. When you create an account

Accounts are optional and give you a backup and sync between your devices.

| What we collect | Why | Stored where |
|---|---|---|
| Email address | To send your sign-in codes and essential account messages | Supabase (our database provider) |
| Birth year | To apply our age rules (section 7) | Supabase |
| Parent's or guardian's email and their consent record (13–17 only) | To ask for and record consent (section 7) | Supabase |
| Nickname (optional) | Shown in the app | Supabase |
| A copy of your TIMELINER data: titles and times of your entries, layers, goals, milestones, focus sessions, review history, inbox notes and app settings | Backup and sync between your devices | Supabase |
| Technical sign-in data: IP address, device or browser type, sign-in times | To keep your account secure and stop abuse | Supabase |

We ask only for what the feature needs. We don't ask for your name, phone number, contacts, location or photos.

**Legal basis:** we process this data **with your consent** when you create an account and choose to sync, and to provide the service you asked for. You can withdraw consent at any time by deleting your account (section 9).

## 5. Who processes data for us

We use a small number of service providers who process data only on our instructions:

| Provider | What they do | Data involved | Location |
|---|---|---|---|
| **Cloudflare** | Hosts the website | IP address and basic request data in short-lived logs | Global network |
| **Supabase** | Accounts and the synced copy of your data | Everything in section 4 | **[Mumbai, India (ap-south-1)]** |
| **Resend** | Sends sign-in codes and parental-consent emails | Email addresses, email content | **[United States]** |
| **Apple App Store / Google Play** | Distribute the phone app | Governed by their own privacy policies | — |

We don't use advertising networks, data brokers or third-party analytics. **[If we add privacy-friendly, anonymous usage statistics later, they'll be opt-in, never for under-18s, and this policy will be updated first.]**

We may disclose data if Indian law requires it (for example, a valid court order).

## 6. How we protect it

- All connections use HTTPS.
- **No passwords:** you sign in with a one-time code sent to your email, so there's no password for us to store or for you to reuse.
- **Database rules** make sure each account can read only its own data. This is enforced on the server, not only in the app.
- People aged 13 to 17 can't sync until a parent has confirmed.
- Only Tried Indie has administrative access, protected by two-factor authentication.

No system is perfectly secure. If a breach affects your personal data, we'll tell you and the Data Protection Board of India as the law requires.

## 7. Children and teenagers

- **Under 13:** no account can be created. The app still works fully on the device, and nothing is sent to us.
- **13 to 17:** an account needs **verifiable consent from a parent or guardian**. We email the parent a link to confirm. Until they do, the account doesn't sync, and the app keeps working on the device. Parents can contact us (section 1) to see or delete their child's data or to withdraw consent.
- For anyone under 18 we **never** use tracking, behavioural monitoring, targeted advertising or analytics, as the DPDP Act requires.
- We ask only for the **birth year**. To stay on the safe side, we assume this year's birthday hasn't happened yet.

## 8. How long we keep data

- **On your device:** until you delete it, clear the site data or uninstall the app.
- **Account data:** while your account exists. When you delete your account, we delete your profile and synced data within **[30]** days. Copies in our provider's routine backups are overwritten within **[the backup retention period]**.
- **Technical sign-in logs:** kept by our providers for a short time, typically **[up to 90 days]**.
- **A parent's consent record:** kept as long as the teen's account exists, plus **[the period the law requires]**.

## 9. Your rights

Under the DPDP Act (and, if you're in the EU or UK, the GDPR), you can:

- **access** your data: Settings → Your data → Export a backup gives you everything on your device as a file; contact us for your account data;
- **correct** it: edit anything in the app, or contact us;
- **delete** it: delete your account in the app (**[Settings → Account → Delete account]**) or contact us;
- **withdraw consent:** deleting your account withdraws it;
- **nominate** someone to exercise these rights for you if you die or can no longer act yourself (DPDP Act);
- **complain:** to us first (section 1). If you're not satisfied, in India you can complain to the **Data Protection Board of India**; in the EU or UK, to your local data protection authority.

We may ask you to confirm you own the account before we act on a request.

## 10. International transfers

Your synced data is stored in **[India]**. Some providers (for example the email service) may process data outside India. We use providers that protect personal data to the standard the DPDP Act requires, and we don't transfer data to any country the Government of India has restricted.

## 11. Changes to this policy

If we change this policy, we'll update the date at the top. If a change affects how we use your data, we'll tell you in the app before it takes effect and, where the law requires, ask for your consent again.

---

## Before publishing (checklist, delete this section from the public version)

These must be true when the policy goes live:

- [ ] Fill in every **[bracketed]** item: legal name, address, Grievance Officer, contact email on your own domain, dates.
- [ ] **Build "Delete account"** in Settings (Apple requires it too). It must delete the profile, the synced rows and the sign-in record.
- [ ] **Build the parental consent flow** (step 4 of accounts) before any 13–17 account can exist; until then, the app could temporarily limit accounts to 18+.
- [ ] Confirm the Supabase region (Mumbai) and Resend's data region and terms; sign their data processing agreements.
- [ ] Check the backup retention period in your Supabase plan and fill it into section 8.
- [ ] Have a lawyer familiar with the DPDP Act 2023 and its Rules review this text, especially sections 4, 7, 8 and 9 (consent wording, children's data, retention, the "nominate" right, cross-border transfer).
- [ ] Publish it at a stable address (for example `/privacy` on the website), link it from Settings and the sign-in screen, and use that link in the App Store and Google Play listings.
- [ ] Write the matching **Terms of Use** (a separate document).
- [ ] If analytics or crash reporting are added later (LAUNCH.md §6), update sections 2, 5 and 7 first.
