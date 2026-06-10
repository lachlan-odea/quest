# ⚔️🍺 Quest for the Buck

A mobile-first, DnD-style party game for a **bucks night / weekend**. Players roll
fantasy character stats, receive **secret quests**, join teams, **battle** each
other with dice, earn **XP**, and spend it on **upgrades** in the shop. One person
runs the night as the **Game Master (admin)**.

Built with **React + TypeScript + Vite + Tailwind CSS** and **Firebase**
(Anonymous Auth, Cloud Firestore, Hosting).

---

## ✨ Features

**Players**
- Join an event with a short code, pick a funny fantasy class
- Roll a character sheet (4d6 drop lowest) with a dice animation — once only
- View D&D-style stats & modifiers, buffs/debuffs, inventory and titles
- See **only their own** hidden quests; submit proof notes
- Challenge other players to dice battles; win XP, losers get funny debuffs
- Spend XP in the upgrade shop (stat boosts, perks, titles, debuff cleanses)
- Leaderboard (players & teams), team page, and a live activity feed

**Game Master (admin)**
- Create/manage an event, share/regenerate the join code
- Add/edit/remove players, reset a player's roll
- Create teams, randomise or hand-edit membership
- Create hidden quests, assign them, mark complete (awards XP) or failed
- Award/remove XP with quick buttons
- View battle history, cancel stuck battles
- Tune game balance (XP curve, battle rewards, cooldown) and **reset the game**

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase (see below), then:
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
#   ...fill in your Firebase web config values in .env

# 3. Run the dev server (exposed on your LAN so phones can connect)
npm run dev
```

Open the printed `http://<your-ip>:5173` URL on your phone (same Wi-Fi) to test
the mobile experience.

---

## 🔥 Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication** → Get started → **Sign-in method** → enable **Anonymous**.
3. **Firestore Database** → Create database → start in *production* mode
   (the included rules secure it).
4. **Project settings → General → Your apps** → add a **Web app** and copy the
   config into your `.env`:

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

5. Install the Firebase CLI and log in:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # select your project, alias it "default"
   ```

6. Deploy the security rules and indexes:

   ```bash
   npm run deploy:rules
   ```

---

## 🌱 Seeding data

Two options:

- **In-app (recommended for the real night):** Host a new event and tick
  *"Seed example quests, upgrades & teams"*, or hit the **🌱 Seed** button on the
  admin dashboard.
- **Script (for demos):** with `.env` configured, run:

  ```bash
  npm run seed
  ```

  This creates a demo event (join code `DEMO1`) with mock players, teams,
  quests and the shop, and prints the admin PIN.

> The seed script signs in anonymously and writes as that user (it becomes the
> event admin). Some Firestore rule setups may require you to relax rules
> temporarily, or run against the emulator, depending on your project config.

---

## 🧱 Project structure

```
src/
├── types/             # All TypeScript interfaces (the Firestore data model)
├── lib/
│   ├── firebase.ts    # Firebase modular SDK init (+ emulator wiring)
│   ├── dice.ts        # 4d6-drop-lowest, modifiers, d20 battle rolls
│   ├── classes.ts     # Funny fantasy character classes
│   ├── seedData.ts    # Quest / upgrade / team / debuff templates
│   └── utils.ts       # cn(), join codes, level maths, time-ago, shuffle…
├── services/          # One file per collection — all Firestore access
│   ├── authService.ts
│   ├── eventService.ts
│   ├── playerService.ts
│   ├── questService.ts
│   ├── battleService.ts
│   ├── upgradeService.ts
│   ├── teamService.ts
│   └── activityService.ts
├── hooks/             # useAuth, useEvent, usePlayer, useLeaderboard,
│                      # useQuests, useBattle, useActivity
├── context/
│   └── GameContext.tsx# Auth + joined event + player, persisted to localStorage
├── components/        # ui primitives, Layout, Guards, Dice, StatSheet
└── pages/             # Player pages + pages/admin/* (Game Master)
```

### Data model (Firestore collections)

`events`, `players`, `teams`, `quests`, `battles`, `upgrades`, `activityLog` —
each document stores its own `id` and (except `events`) an `eventId`. See
[`src/types/index.ts`](src/types/index.ts) for the full interfaces. Timestamps
are epoch milliseconds for simplicity.

### Game mechanics

- **Stats:** `4d6 drop lowest` per ability; modifier = `floor((score - 10) / 2)`.
- **Battles:** each side rolls `d20 + stat modifier`; higher total wins (ties go
  to the defender). Winner earns XP; loser gets a random temporary debuff.
  A per-player cooldown (`battleCooldownSeconds`) prevents spam.
- **XP & levels:** `level = floor(xp / xpPerLevel) + 1`. Available XP =
  `xp - spentXp`.
- **Quests:** difficulty → XP reward; admin marks complete to award it.

---

## 🔐 Security rules & limitations (read this!)

The included [`firestore.rules`](firestore.rules) implement an **MVP-friendly**
model:

- Everything requires an authenticated (anonymous is fine) user.
- **Admins** are the uids listed in `event.adminUids`. The event creator is the
  first admin; others elevate by entering the **admin PIN**.
- **Players** can read public game data and write **their own** player document.
- **Hidden quests** are only readable by the assigned player or an admin —
  this is enforced server-side (the one hard privacy guarantee).
- Activity log entries are append-only.

**Known limitations & how to harden:**

1. **PIN is client-checked.** The admin PIN gates the *UI*; the rules let a
   signed-in user append their own uid to `adminUids`. For friends on a night
   out this is fine. **Harden:** move admin elevation to a Cloud Function that
   verifies the PIN server-side and sets a **custom auth claim**
   (`admin: true`), then check `request.auth.token.admin` in the rules instead
   of the `adminUids` array. Also stop returning `adminPin` to clients.
2. **Players can write their own `xp`.** Battles and shop purchases update XP
   client-side so the night stays fast and offline-tolerant. A determined player
   could cheat. **Harden:** block client writes to `xp`/`spentXp`/`level`/
   `stats` in the rules and perform all XP changes from **Cloud Functions**
   (quest completion, battle resolution, purchases), validated server-side.
3. **No field-level validation** of arbitrary writes beyond ownership. Add
   `request.resource.data` shape checks per collection for production.

These trade-offs are intentional for a one-weekend party MVP — the comments in
`firestore.rules` point at each one.

---

## ☁️ Deploy to Firebase Hosting

```bash
# Build the app and deploy hosting + rules + indexes
npm run deploy

# Or individually:
npm run build
npm run deploy:hosting
npm run deploy:rules
```

`firebase.json` configures Hosting to serve `dist/` as an SPA (all routes →
`index.html`).

### Local emulators (optional)

```bash
firebase emulators:start          # Firestore :8080, Auth :9099
# In .env: VITE_USE_EMULATORS=true
```

---

## 🐙 Deploy to GitHub Pages (automatic)

A workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
builds and publishes to GitHub Pages on every push to `main`. Hosting is static
only — the app still talks to your Firebase project from the browser.

**One-time setup:**

1. **Repo → Settings → Pages → Build and deployment → Source = "GitHub Actions".**
2. **Firebase Console → Authentication → Settings → Authorized domains → Add
   domain** and add your Pages domain (e.g. `lachlan-odea.github.io`).
   Without this, anonymous sign-in is blocked on the live site and nothing
   loads.
3. Make sure your Firestore **rules are deployed** (see above) — Pages hosts the
   UI but Firestore still enforces access.

The app is then live at `https://<user>.github.io/<repo>/` (for this repo,
`https://lachlan-odea.github.io/quest/`).

> How it works: the build sets Vite's `base` to `/<repo>/` so assets resolve
> under the subpath, React Router uses a matching `basename`, and a `404.html`
> copy of `index.html` provides SPA fallback for deep links / refreshes.
>
> Firebase config for the CI build comes from the committed
> [`.env.production`](.env.production) (a Firebase web key is not a secret — see
> the comments in that file). If you'd rather not commit it, delete that file
> and instead add the `VITE_FIREBASE_*` values as repo **Variables**
> (Settings → Secrets and variables → Actions → Variables) and reference them in
> the workflow's build `env`.

---

## 📱 Tips for the night

- Each phone = one anonymous user = one player. Tell everyone to **add the site
  to their home screen**.
- The Game Master should keep the admin dashboard open to assign quests and
  approve completions.
- Keep the **join code** visible (or AirDrop/screenshot it). Use **🔄 New Code**
  if it leaks beyond the group.
- Battles are quick and tap-friendly — big buttons by design for use out and
  about.

---

## 🛠️ Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite dev server (LAN-exposed) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run seed` | Seed a demo event (needs `.env`) |
| `npm run deploy` | Build + deploy everything |
| `npm run deploy:rules` | Deploy Firestore rules + indexes only |

---

## 🔮 Ideas to extend

- Cloud Functions to make XP tamper-proof (see hardening above)
- Push notifications for incoming battle challenges
- Photo proof uploads via Firebase Storage
- Team quests with shared rewards
- A "groom protection" objective and end-of-night awards ceremony

Have a cracking night. 🍻
