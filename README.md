# Study Routine

A private weekly study-routine website.

## What it does

- Login/signup with Supabase Auth.
- One main dashboard.
- Seven day pages: Sunday through Saturday.
- Weekly routine items repeat automatically every week.
- Routine can be changed by adding/removing items.
- End-of-day study logs are stored separately and appended by date; each log records the total hours studied that day.
- Each user's data is protected with Supabase Row Level Security.
- GitHub Actions deploys the Vite site to GitHub Pages.

## Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase.sql`.
3. Copy the project's URL and anon/public key.
4. For local development, copy `.env.example` to `.env` and fill them in.
5. Run:
   ```bash
   npm install
   npm run dev
   ```
6. For GitHub Pages, add repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. In GitHub repository Settings → Pages, choose **GitHub Actions** as the build/deployment source.
8. Push to the `main` branch.

## Important privacy point

GitHub Pages itself is static hosting. The private data is NOT stored in GitHub. Authentication and database storage are handled by Supabase, and Row Level Security ensures a signed-in user can only access their own rows.

The browser receives only the Supabase anon/public key. Never put a Supabase service-role key in this website or GitHub repository.
