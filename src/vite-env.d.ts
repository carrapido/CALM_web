// The panel's settings, read from .env.local. Optional: main.tsx checks them on startup.
// https://vite.dev/guide/env-and-mode#intellisense-for-typescript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  // The CALM API, ending in /api, e.g. http://localhost:3000/api
  readonly VITE_API_URL?: string
}
