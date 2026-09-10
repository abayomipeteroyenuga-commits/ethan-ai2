# Activate ETHAN AI Sign-In

The authentication code is already implemented in v7.1. You only need your Supabase project values.

1. Create/open your Supabase project.
2. In Supabase, find the project API settings. Copy:
   - Project URL
   - Publishable key (or legacy anon key)
3. Open `config.js` and paste them into `supabaseUrl` and `supabaseAnonKey`.
4. Do **not** paste a `service_role` key anywhere in this app or GitHub.
5. In Authentication settings, ensure Email provider is enabled.
6. Set your Site URL to your deployed ETHAN AI address, for example `https://search.ethandigitalacademy.org`.
7. Add the same deployed URL to allowed Redirect URLs so email confirmation/password reset can return to ETHAN AI.
8. Deploy to Vercel. Then test in this order: Create account → confirm email if required → Sign in → refresh page (session should persist) → Sign out → Forgot password.

## Local testing
The UI opens from `index.html`, but email confirmation/reset flows work best after deployment because Supabase redirect URLs need an HTTP/HTTPS address.
