# Google sign-in setup

The portal's Google buttons use Supabase OAuth and return through the app's
`/auth/callback` route. The callback checks the account role before sending a
person to the student, admin, or driver area.

## Supabase and Google Cloud

1. In Google Cloud Console, create a **Web application** OAuth client.
2. In Supabase, open **Authentication → Providers → Google**, enable Google,
   and enter the Google client ID and client secret.
3. Copy the callback URL displayed by Supabase and add it to the Google OAuth
   client's **Authorized redirect URIs**. This is the Supabase Auth callback;
   it is different from the app callback below.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the
   production site and allow these redirects:
   - `https://eagle-elites-liard.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` for local development
5. Add the production domain and `http://localhost:3000` as Google **Authorized
   JavaScript origins** if using Google Identity Services settings that request
   origins.

The app still needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel for each environment where sign-in
should work. The Google client secret belongs in Supabase, not in browser code
or a `NEXT_PUBLIC_` Vercel variable.

## Account access

- Students can use Google from sign-in or create-account screens.
- Admin and driver screens also offer Google, but the callback only grants
  access when the signed-in Google identity already has the corresponding
  admin record or active driver account.
- Email and password sign-in remains available for all account types.
