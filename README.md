# Modi's Mission — Cross-Platform Recording App

A production-ready web + mobile experience where supporters record mirror-style video messages. Recordings upload straight to Supabase Storage + Postgres and can be reviewed/deleted from a polished admin dashboard. The repo now includes an automated GitHub Pages deployment so the web app is live at **https://akash-droid-dev.github.io/modis-mission/** (static demo – wire it to your Supabase project to make it fully functional).

---

## Project Layout

```
modis-mission/
├── web/                    # Next.js 14 (App Router) — Web App + Admin Panel
│   ├── public/             # Brand assets
│   ├── src/
│   │   ├── app/            # Pages, layouts and global styles
│   │   ├── hooks/          # MediaRecorder hook
│   │   └── lib/            # Supabase helpers
│   ├── .env.local.example  # Copy → .env.local and fill credentials
│   ├── next.config.js      # Static export + GitHub Pages basePath logic
│   └── package.json
│
├── mobile/                 # React Native (Expo)
│   ├── App.tsx             # Mirror camera + upload flow
│   └── src/lib/supabase.ts # Supabase client for mobile
│
├── shared/                 # Shared constants/types
├── supabase-setup.sql      # DB + Storage schema/policies
└── .github/workflows/      # GitHub Pages deployment pipeline
```

**Backend**: Supabase (PostgreSQL + Storage). No custom server is required after moving auth to the client for the demo build. For production, switch to secure Supabase Auth or edge functions.

---

## 1. Supabase Bootstrapping

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your **Project URL** + **anon public key** from **Settings → API**.
3. In the Supabase dashboard → **SQL Editor**, paste the contents of `supabase-setup.sql` and click **Run**. This creates:
   - `recordings` table with metadata columns
   - Row-level security policies
   - Public `recordings` storage bucket + policies
4. Confirm the `recordings` bucket exists under **Storage** (make it Public if the SQL didn’t).

---

## 2. Web App (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase + demo admin credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=ModiMission@2026
```

> ⚠️ Admin credentials are **client-side** for the static Pages build. Replace with real auth (Supabase Auth, Clerk, etc.) before production.

### Local development

```bash
npm run dev
```

- User recorder: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

### Production build (static export)

```bash
npm run build   # outputs to web/out thanks to output: 'export'
```

The Next.js config automatically switches to the correct `basePath` when running in GitHub Actions so the static site works under `/modis-mission`.

---

## 3. Mobile App (Expo)

```bash
cd mobile
npm install
```

Update `mobile/src/lib/supabase.ts` with the same Supabase URL + anon key, then run:

```bash
npx expo start          # start dev server
npx expo start --ios    # iOS simulator
npx expo start --android# Android emulator
```

Use a physical device for reliable camera access.

---

## 4. GitHub Pages Deployment

The repo already contains `.github/workflows/deploy.yml` which builds the web app and publishes the static export to **GitHub Pages**. Steps to keep it working:

1. **Repo variables** → In GitHub: `Settings → Secrets and variables → Actions → Variables` add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_USERNAME`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
2. Push to `main` (or run the workflow manually). The pipeline:
   - Installs dependencies inside `web`
   - Runs `npm run build` (static export)
   - Uploads `web/out` as the Pages artifact
   - Deploys via `actions/deploy-pages`
3. Live URL: **https://akash-droid-dev.github.io/modis-mission/**

> Tip: if you fork/rename the repo, the workflow automatically infers the new `basePath` from `GITHUB_REPOSITORY`.

---

## 5. Feature Highlights

### User Recorder
- Mirror-mode camera preview with onboarding consent modal
- Floating record button with timer + max duration (default 120 seconds)
- Upload overlay showing progress / success / error states
- Automatic upload to Supabase Storage + metadata insert into Postgres
- Responsive layout with saffron/dark theming

### Admin Dashboard
- Client-side credential gate (storage in `sessionStorage`)
- Stats row (total uploads, device mix, cumulative duration)
- Grid of video cards with inline playback + delete actions
- Modal video player and quick device/duration badges

### Under the Hood
- `useRecorder` hook wraps `MediaRecorder` with graceful fallbacks
- `Supabase` helper centralizes upload/list/delete logic
- Shared constants exported for both web + mobile targets
- Static export friendly: `next/image` runs in unoptimized mode, basePath and assetPrefix switch automatically inside GitHub Actions

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| Camera prompt never appears | Ensure you accepted the consent modal, run on HTTPS/localhost, and check browser permissions. |
| Upload fails immediately | Double-check Supabase credentials + ensure the `recordings` bucket is public. |
| Admin dashboard empty | Confirm RLS policies allow `select` for anon key users. |
| GitHub Pages shows broken links | Wait for the workflow to finish, or ensure you didn’t disable repository variables (the build still succeeds but the app can’t talk to Supabase). |
| Need real authentication | Replace the demo check in `web/src/app/admin/page.tsx` with Supabase Auth + serverless edge routes. |

---

## 7. Next Steps

- Harden auth (Supabase Auth, Clerk, Lucia, etc.)
- Swap Supabase Storage public URLs for signed URLs
- Add rate limiting to uploads (Cloudflare Turnstile or Supabase Functions)
- Wire the Expo app to Supabase Auth for mobile recordings

Have fun capturing messages for the campaign! 🎥🇮🇳
