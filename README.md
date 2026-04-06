# Pixel Town Control

2.5D pixel-style city scene scaffold for `Netlify + Firebase`.

## Included in this first scaffold

- Next.js App Router structure
- SVG-based city scene for the homepage
- Firestore-backed actor status flow
- Minimal admin page at `/admin`
- Telegram webhook entry at `/api/telegram/webhook`

## Environment variables

Copy `.env.example` to `.env.local` and fill in Firebase and Telegram values.

For admin login, also:

- Enable `Google` sign-in in Firebase Authentication
- Add allowed admin emails to `ADMIN_EMAILS`
- Set Firebase Admin SDK credentials for server-side token verification

## Firebase console checklist

1. In `Authentication`, enable `Google` sign-in.
2. In `Firestore Database`, create the database in production or test mode.
3. Publish the rules from [`firestore.rules`](/Users/davidhu/Documents/funyweb/firestore.rules).
4. Create document `actors/main-character` if you want to seed manually, or let the app create it on first write.

Suggested seed:

```json
{
  "id": "main-character",
  "name": "D-exHor",
  "status": "working",
  "location": "office",
  "updatedAt": "2026-04-04T00:00:00.000Z",
  "updatedBy": "system"
}
```

## Commands

```bash
npm install
npm run dev
```

## Telegram setup

1. Create a bot with BotFather and copy the bot token into `TELEGRAM_BOT_TOKEN`.
2. Add your Telegram numeric user id to `TELEGRAM_ADMIN_IDS`.
3. Point the webhook to `/api/telegram/webhook`.
4. Supported commands:
   `/start`, `/help`, `/status`, `/work`, `/working`, `/office`, `/home`, `/walk`, `/commute`, `/goinghome`, `/clean`, `/cleaning`, `/sweep`
   Bot 也會顯示按鈕選單，可直接點選 `工作中`、`回家中`、`打掃中`、`/status`

## Suggested next steps

1. Add Firestore security rules and seed the `actors/main-character` document.
2. Replace placeholder Telegram webhook with reply handling.
3. Expand the SVG scene into modular building and NPC components.
