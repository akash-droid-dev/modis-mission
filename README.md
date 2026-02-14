# Modi's Mission — Cross-Platform Recording App

A production-ready web + mobile application where users record video messages through a mirror-style camera interface. Recordings are uploaded to Supabase and managed through a secured admin panel.

---

## Architecture

```
modis-mission/
├── web/                    # Next.js 14 (App Router) — Web App + Admin Panel
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # User-facing mirror recording page
│   │   │   ├── admin/page.tsx     # Admin panel (login + recordings grid)
│   │   │   ├── api/auth/route.ts  # Admin authentication endpoint
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── globals.css        # Global styles
│   │   ├── hooks/
│   │   │   └── useRecorder.ts     # MediaRecorder hook
│   │   └── lib/
│   │       └── supabase.ts        # Supabase client + upload/fetch helpers
│   ├── public/
│   │   └── brand-cover.jpg        # Brand image
│   ├── .env.local.example
│   ├── package.json
│   └── tailwind.config.js
│
├── mobile/                 # React Native (Expo) — Mobile App
│   ├── App.tsx                    # Main app with camera recording
│   ├── src/lib/supabase.ts        # Mobile Supabase client
│   ├── assets/brand-cover.jpg     # Brand image
│   ├── app.json                   # Expo config
│   └── package.json
│
├── shared/
│   └── constants.ts               # Shared types and constants
│
├── supabase-setup.sql             # Database + storage setup script
└── README.md
```

**Backend**: Supabase (PostgreSQL + Object Storage)

---

## Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- **Supabase account** (free tier at [supabase.com](https://supabase.com))
- **For mobile**: Expo CLI (`npm install -g expo-cli`), Android Studio / Xcode

---

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name and region
3. Note your **Project URL** and **anon public key** from **Settings → API**

### 1.2 Run Database Setup
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the entire contents of `supabase-setup.sql`
3. Click **Run**

This creates:
- `recordings` table with all metadata columns
- Row-level security policies
- Storage bucket named `recordings`
- Storage access policies

### 1.3 Verify Storage Bucket
1. Go to **Storage** in Supabase dashboard
2. Confirm a `recordings` bucket exists and is set to **Public**
3. If not created by SQL, create it manually:
   - Click **New Bucket** → name: `recordings` → toggle **Public** → Create

---

## Step 2: Web App Setup (Next.js)

```bash
cd web

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

### 2.1 Configure `.env.local`
Edit `web/.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

ADMIN_USERNAME=admin
ADMIN_PASSWORD=ModiMission@2026
```

### 2.2 Run Web App

```bash
npm run dev
```

- **User interface**: [http://localhost:3000](http://localhost:3000)
- **Admin panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 2.3 Admin Login Credentials
- **Username**: `admin`
- **Password**: `ModiMission@2026`

(Change these in `.env.local` for production)

---

## Step 3: Mobile App Setup (Expo)

```bash
cd mobile

# Install dependencies
npm install
```

### 3.1 Configure Supabase Credentials
Edit `mobile/src/lib/supabase.ts` and replace:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';     // ← Your URL
const SUPABASE_ANON_KEY = 'your-anon-key-here';              // ← Your key
```

### 3.2 Run on Device/Emulator

```bash
# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator (Mac only)
npx expo start --ios
```

### 3.3 Physical Device
1. Install **Expo Go** from App Store / Play Store
2. Scan the QR code from the terminal
3. Note: Camera recording requires a physical device (not emulator)

---

## Features

### User Interface
- **Mirror Camera**: Front camera with horizontal flip (mirror effect)
- **Record Button**: Bottom-right overlay with state changes (idle → recording → uploading → success/error)
- **Live Timer**: Elapsed time display during recording with progress bar
- **Max Duration**: 120 seconds (configurable in `shared/constants.ts`)
- **Brand Image**: Responsive placement — side panel on desktop, centered card on mobile
- **Consent Modal**: Privacy-friendly permission request before camera access
- **Auto-Upload**: Starts automatically when recording stops
- **Progress Indicator**: Visual upload progress with percentage
- **Duplicate Prevention**: Blocks re-upload while one is in progress

### Admin Panel
- **Protected Access**: Username/password authentication
- **Statistics Dashboard**: Total recordings, web/mobile counts, total duration
- **Recordings Grid**: Responsive card layout with:
  - Video thumbnail preview
  - Timestamp and duration
  - File size and device type badge
  - Inline play button (opens modal player)
  - Delete button with confirmation
- **Video Playback**: In-page modal player with streaming
- **Visual Consistency**: Matches the main app's saffron + dark theme

### Technical
- **Web**: MediaRecorder API with WebM/VP9 codec fallback chain
- **Mobile**: Expo Camera with native video recording
- **Storage**: Supabase Storage (S3-compatible) with public URLs
- **Database**: PostgreSQL via Supabase with RLS policies
- **Metadata**: Timestamp, device type, duration, file size, user agent

---

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Max recording duration | `shared/constants.ts` | 120 seconds |
| Admin username | `web/.env.local` | `admin` |
| Admin password | `web/.env.local` | `ModiMission@2026` |
| Video bitrate (web) | `web/src/hooks/useRecorder.ts` | 2.5 Mbps |
| Supabase project | `.env.local` / `supabase.ts` | — |

---

## Production Deployment

### Web (Vercel)
```bash
cd web
npx vercel --prod
```
Set environment variables in Vercel dashboard.

### Mobile (EAS Build)
```bash
cd mobile
npx eas build --platform all
```

### Security Checklist
- [ ] Change admin credentials in environment variables
- [ ] Use proper JWT authentication (replace simple token)
- [ ] Enable Supabase RLS for authenticated-only delete
- [ ] Set up CORS policies on Supabase
- [ ] Add rate limiting on upload endpoint
- [ ] Enable Supabase Storage signed URLs for private playback

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Mobile Frontend | React Native + Expo |
| Backend/DB | Supabase (PostgreSQL) |
| Storage | Supabase Storage (S3-compatible) |
| Auth | Simple token auth (upgrade to Supabase Auth for prod) |
| Video Recording (Web) | MediaRecorder API |
| Video Recording (Mobile) | expo-camera |

---

## Troubleshooting

**Camera not working on web?**
- Ensure you're on HTTPS or localhost
- Check browser permissions (camera + microphone)
- Try Chrome or Edge (best MediaRecorder support)

**Upload failing?**
- Verify Supabase URL and anon key
- Check that the `recordings` storage bucket exists and is public
- Verify storage policies allow anonymous uploads

**Mobile camera blank?**
- Camera preview requires a physical device, not emulator
- Ensure camera permissions are granted in device settings

**Admin panel won't load recordings?**
- Check Supabase `recordings` table has SELECT policy enabled
- Verify the database table was created via SQL setup script
