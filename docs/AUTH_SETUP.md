# Auth Setup Guide

## Supabase Configuration

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Security:** Never commit `SUPABASE_SERVICE_ROLE_KEY` or show it in screenshots. It bypasses RLS and must be kept secret.

Use `NEXT_PUBLIC_APP_URL` (or `NEXT_PUBLIC_SITE_URL` as fallback) for OAuth and magic link redirects. Must match your Site URL in Supabase.

### 2. Supabase Auth URL Configuration (Required)

**Supabase Dashboard → Authentication → URL Configuration**

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |
| **Redirect URLs** | Add each of these (one per line): |
| | `http://localhost:3000/auth/callback` |
| | `http://localhost:3000/auth/callback?next=*` |
| | `https://yourdomain.com/auth/callback` (production) |
| | `https://yourdomain.com/auth/callback?next=*` (production) |

The app redirects to `/auth/callback?next=/onboarding`; Supabase must allow this URL pattern.

### 3. Google OAuth

1. **Supabase Dashboard** → Authentication → Providers → **Google**
2. Enable Google
3. **Google Cloud Console** → [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
4. Create OAuth 2.0 Client ID (Web application)
5. **Authorized redirect URIs:** Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret into Supabase Google provider settings

### 4. Apple OAuth

1. **Supabase Dashboard** → Authentication → Providers → **Apple**
2. Enable Apple
3. Requires **Apple Developer account** ($99/yr)
4. Create a **Sign in with Apple** service ID in App ID configuration
5. Create a **Services ID** and configure redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. Create a **Key** for Sign in with Apple, download the `.p8` file
7. In Supabase: enter Services ID, Secret Key (from .p8), Key ID, Team ID, Bundle ID

### 5. Email Magic Link (Fallback)

1. **Supabase Dashboard** → Authentication → Providers → **Email**
2. Enable Email provider (enabled by default)
3. Magic link sign-in works without extra config
4. **Email templates** (optional): Customize "Magic Link" in Authentication → Email Templates

### 6. Supabase Provider Setup Checklist

- [ ] **Site URL** set to your app URL (dev or prod)
- [ ] **Redirect URLs** include `http://localhost:3000/auth/callback` and `https://yourdomain.com/auth/callback`
- [ ] **Google** provider enabled with Client ID and Secret
- [ ] **Apple** provider enabled (Services ID, Key, Team ID, Bundle ID)
- [ ] **Email** provider enabled (for magic link)
- [ ] `NEXT_PUBLIC_APP_URL` (or `NEXT_PUBLIC_SITE_URL`) in `.env.local` matches Site URL

## Auth Flow

1. **Unauthenticated** → Access to `/`, `/pricing`, `/faq`, `/legal/*`, `/login`, `/signup`
2. **Sign in** → Google, Apple, or **Email magic link** → Redirect to `/auth/callback` → Exchange code → Sync profile → Redirect to `/onboarding` (new users) or `/dashboard` (returning)
3. **Onboarding** → Select track, target date, study minutes, study mode → Save → Redirect to `/dashboard`
4. **Authenticated** → Access to `/dashboard`, `/study`, `/practice`, `/notebook`, `/flashcards`, `/ai-tutor`
5. **Admin** → Access to `/admin` (requires `user_admin_roles` entry)

New users default to the **Free plan** (no subscription). Profile is created via `handle_new_user` trigger on signup.

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
│       ├── url.ts         # getAuthBaseUrl, getAuthCallbackUrl
│       ├── admin.ts       # isAdmin
│       ├── require-auth.ts
│       └── require-admin.ts
├── components/
│   └── auth/
│       ├── GoogleButton.tsx
│       ├── AppleButton.tsx
│       ├── MagicLinkForm.tsx
│       ├── LoginForm.tsx
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
