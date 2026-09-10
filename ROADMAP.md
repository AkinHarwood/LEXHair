# Internal Messaging App — Architecture & Roadmap

**For:** 15–25 staff internal team messaging (channels, DMs, file sharing, search, admin panel)
**Owner:** Sir Akin
**Built by:** Claude, end to end

## Stack

- **Backend:** Node.js + Express + Socket.IO (real-time), Prisma ORM, SQLite for development (drop-in swap to Postgres for production).
- **Frontend:** Expo (React Native + React Native Web) — one codebase that runs as a web app today and as real installable iOS/Android apps later via the same code.
- **Auth:** Invite-only. Admin invites a staff member by email → they get a one-time invite link → set their own password. JWT session tokens after that.
- **Files:** Uploaded to server disk (swappable for S3-compatible storage later), served through authenticated endpoints, previewed inline in chat.
- **Search:** Full-text search over message history via SQL.

## Why this stack

- One codebase (Expo) covers the web app now and native mobile apps later without a rewrite — satisfies "web now, native mobile too" without double the work.
- Socket.IO gives instant message delivery without heavier infrastructure (no separate message broker needed at this scale).
- SQLite in development means zero setup friction; production deploy swaps in Postgres with one config change (Prisma handles both).
- Self-hosted file storage keeps costs at zero for 15–25 staff; can move to S3/R2 later if storage grows.

## Phases

1. **Backend core** — schema, invite-only auth, channels/DMs, real-time messaging, file upload, search, admin APIs.
2. **Frontend (web-first)** — login/invite acceptance, channel + DM chat UI, file sharing, search, admin panel. Runs in any browser immediately — this is the fastest path to something your team can actually use.
3. **Local end-to-end test** — script through every flow (invite → login → message → file → search → admin) before anything ships.
4. **Deployment** — containerized and ready for a cloud host (e.g. Railway or Render). Actually going live needs a hosting account in your name (free/low-cost tier is enough for this team size) — I'll prepare everything so connecting that account is the only manual step left.
5. **Native mobile apps** — same Expo codebase built for iOS and Android via EAS Build. Internal testing (via Expo Go / ad-hoc install) needs no store accounts. Publishing to the App Store and Google Play needs your own Apple Developer account (~$99/year) and Google Play Console account (~$25 one-time) — I'll guide you through that when we get there.

## What "admin panel" means here

A screen visible only to admins (you, and anyone you designate) to:
- Invite new staff by email, revoke invites, deactivate departed staff
- Create/rename/archive channels, manage channel membership
- No code or hosting-dashboard access required for day-to-day admin work

## Status

Tracked live in the task list for this session. This document will be updated as decisions are made (e.g. final hosting provider) and kept in the project for continuity across sessions.
