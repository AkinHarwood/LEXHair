# Team Chat — Internal Messaging App

Built for a 15–25 person team: channels, direct messages, group messages, file sharing, search, @mentions, and an admin panel for managing staff and channels. One codebase (Expo) runs as a web app today and as real iOS/Android apps later.

## What's here

```
messaging-app/
  server/     Node.js + Express + Socket.IO + SQLite backend (also serves the built web app)
  app/        Expo (React Native + Web) frontend — the app your team actually uses
  Dockerfile  Builds and runs the whole thing as one container
  ROADMAP.md  Architecture notes and phased plan
```

## Running it locally

You'll need Node.js 22 or newer.

**1. Start the backend**

```
cd server
npm install
cp .env.example .env   # if .env isn't already there — see "Environment variables" below
npm run seed            # creates the first admin account + a #general channel
npm run dev              # starts the API + realtime server on port 4000
```

The seed step prints the admin login (email/password) to the terminal — that's how you get your first account. Change the password after logging in for the first time (there's no "change password" screen yet — see Known limitations).

**2. Build and serve the web app**

```
cd app
npm install
npx expo export --platform web
```

That produces `app/dist`. The backend automatically serves it (from `server/src/index.js`) — so once both steps above are done, open **http://localhost:4000** in a browser and you're in.

For active frontend development instead of a one-off build, run `npx expo start --web` from `app/` (hot reload, but talks to the backend on whatever `EXPO_PUBLIC_API_URL` is set to in `app/.env`).

## Environment variables

`server/.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_PATH` | Where the SQLite file lives (defaults to `server/data/app.db`) |
| `JWT_SECRET` | **Change this before deploying** — any long random string |
| `PORT` | Port the server listens on (default 4000) |
| `CORS_ORIGIN` | Set to your web app's URL in production (default `*`) |
| `APP_URL` | The public URL staff will open — used to build invite links |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Used once, by `npm run seed`, to create the first admin account |

`app/.env`:

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | The backend's URL. Set this to your deployed backend URL before running `expo export` for production. |

## Deploying it for real

The backend and web app ship as a single container (see `Dockerfile`) — one deploy target, one URL.

1. Push this project to a Git repository (GitHub is easiest).
2. Create an account on a host that deploys from a Dockerfile — **Railway** or **Render** both work well and have a free/low-cost tier that's plenty for 15–25 people. (This account needs to be in your name — Claude can't create it for you, but can walk through the steps once you have it.)
3. Point the host at this repo, tell it to build with the included `Dockerfile`.
4. Set the environment variables above on the host (especially `JWT_SECRET`, `APP_URL` — set this to the URL the host gives you — and the `ADMIN_*` ones for the first deploy).
5. Attach a persistent volume/disk to `/srv/server/data` and `/srv/server/uploads` — without this, restarting the server would wipe your messages and files. Both Railway and Render support this.
6. Deploy. On first boot, run the seed step once (most hosts let you run a one-off command against the deployed container) to create your admin account.
7. Visit the URL the host gives you, log in with the admin account, and start inviting staff from the admin panel (⚙️ icon).

Once it's live, update `app/.env`'s `EXPO_PUBLIC_API_URL` to that URL and re-run `npx expo export --platform web` — or better, just rebuild the container, since the Dockerfile does this step automatically from whatever `EXPO_PUBLIC_API_URL` is set to at build time.

## Native mobile apps (iOS/Android)

The web app and the future mobile apps are the *same* Expo codebase — nothing needs to be rebuilt from scratch.

- **Internal testing (no store accounts needed):** run `npx expo start` from `app/` and open it in the free **Expo Go** app on any phone, or build an internal APK/IPA with `eas build --profile preview` (requires a free Expo account).
- **Publishing to the App Store / Google Play:** requires your own Apple Developer account (~$99/year) and Google Play Console account (~$25 one-time). Once you have those, `eas build` + `eas submit` (via the `eas-cli` package) handle the rest. Happy to walk through this step by step when you're ready to publish.

## Known limitations (fine for now, worth knowing)

- **No "forgot password" or "change password" flow yet** — an admin can deactivate/reactivate accounts, but a password reset currently means re-inviting the person. Easy to add when needed.
- **No email sending** — invite links are generated and shown to the admin to share manually (copy/paste, WhatsApp, etc.) rather than emailed automatically. Adding email delivery (e.g. via Resend or SendGrid) is a small addition later.
- **Search** is a straightforward substring search over recent message history — fine at this team size; would want a proper full-text index if the team or history grows a lot.
- **File storage** is on the server's own disk — fine for this team size; would move to S3-style storage if attachment volume grows large.
- **SQLite** is the database — simple and zero-setup; swappable for Postgres later if needed (the queries are plain SQL, not tied to SQLite-only syntax anywhere that matters).

## What's built and tested

Every core flow has been run end-to-end (invite → accept → login → channel & DM messaging in real time → @mentions with notifications → file upload/preview → search → admin staff/channel management) against a live instance of this exact code, including a full browser-driven test simulating two separate staff members messaging each other.
