# Auth Setup Guide

## Supabase Configuration

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. OAuth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (or your production URL)
- **Redirect URLs:** Add:
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/auth/callback` (production)

### 3. Google OAuth

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
4. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

### 4. Apple OAuth

1. Supabase Dashboard → Authentication → Providers → Apple
2. Enable Apple
3. Requires Apple Developer account ($99/yr)
4. Create a Sign in with Apple service ID
5. Configure redirect URI and keys in Supabase

## Auth Flow

1. **Unauthenticated** → Access to `/`, `/pricing`, `/faq`, `/legal/*`, `/login`, `/signup`
2. **Sign in** → Google or Apple → Redirect to `/auth/callback` → Exchange code → Redirect to `/onboarding`
3. **Onboarding** → Select track, target date, study minutes, study mode → Save → Redirect to `/dashboard`
4. **Authenticated** → Access to `/dashboard`, `/study`, `/practice`, `/notebook`, `/flashcards`, `/ai-tutor`
5. **Admin** → Access to `/admin` (requires `user_admin_roles` entry)

## File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   └── middleware.ts   # Session refresh
│   └── auth/
│       ├── session.ts     # getSessionUser
│       ├── profile.ts     # getProfile, syncProfileFromAuth, completeOnboarding
│       ├── admin.ts       # isAdmin
│       ├── require-auth.ts
│       └── require-admin.ts
├── components/
│   └── auth/
│       ├── GoogleButton.tsx
│       ├── AppleButton.tsx
│       └── SignOutButton.tsx
├── app/
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── onboarding/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── OnboardingForm.tsx
│   ├── api/onboarding/route.ts
│   └── (app)/
│       ├── layout.tsx     # Protected layout, onboarding check
│       ├── dashboard/
│       ├── admin/layout.tsx  # Admin guard
│       └── ...
└── middleware.ts
```

## Database

Run migrations including `20250306000016_profile_onboarding.sql` for onboarding columns.

Seed `exam_tracks` and `admin_roles` before enabling onboarding (see `supabase/seed.sql`).
