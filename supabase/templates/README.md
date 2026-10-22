# Supabase recovery email

`password-recovery.html` is the branded password recovery template for Supabase Auth.

For the hosted production project, open **Authentication → Emails → Templates → Reset Password** and set:

- **Subject:** `Reset your Eagle Elites password`
- **Body:** the contents of `password-recovery.html`

Keep `{{ .ConfirmationURL }}` unchanged. It contains Supabase's one-time verification URL and preserves the redirect URL supplied by the app.

In **Authentication → URL Configuration**, the production Site URL should point to the production app. Add the exact recovery callback URLs below to the redirect allow list, plus the corresponding localhost URLs when developing locally:

- `https://eagle-elites-liard.vercel.app/auth/reset-password`
- `https://eagle-elites-liard.vercel.app/admin/reset-password`
- `https://eagle-elites-liard.vercel.app/driver/reset-password`
- `http://localhost:3000/**`
- `http://127.0.0.1:3000/**`

The hosted dashboard settings are separate from files committed to this repository; updating this HTML file alone does not change the production email template.
