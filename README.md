# Slide AI — Frontend

The web frontend for **Slide AI**, an AI-powered presentation generator.
Built with React 19, TypeScript, and Vite.

The UI is a marketing/landing experience (hero, generator card, recent
presentations, features strip) plus a real authentication layer
(Sign In / Sign Up / Sign Out) wired to the Slide AI backend.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 7** dev server with HMR
- Theme + Auth React Contexts (`src/context/`)
- Typed fetch client (`src/lib/api.ts`) talking to the backend's `/api/v1`

## Getting started

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` (or the next free port).
It proxies `/api/**` to the running backend on `http://localhost:8000`
(see `vite.config.ts`), so no absolute URLs or CORS setup are needed locally.

To run the full app you also need the backend running:

```bash
# in the slide-ai-backend repo
uvicorn app.main:app --port 8000
```

## Available scripts

| Script           | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the Vite dev server            |
| `npm run build`  | Type-check (`tsc -b`) and build      |
| `npm run preview`| Preview the production build         |
| `npm run lint`   | Run ESLint                           |

## Project structure

```
src/
  components/        UI components (Navbar, AuthModal, HeroSection, …)
  context/           React contexts (ThemeContext, AuthContext)
  lib/api.ts         Typed backend API client
  App.tsx            App composition root
  main.tsx           Entry point (wraps app in providers)
```

## Authentication

- `AuthContext` (`src/context/AuthContext.tsx`) holds the current user and
  access token, persisted in `localStorage` so a refresh keeps the session.
  On mount it validates any stored token against `GET /api/v1/auth/me`.
- `AuthModal` (`src/components/AuthModal.tsx`) provides the Sign In / Sign Up
  form and connects to the backend through `AuthContext`.
- `Navbar` shows real auth state: **Sign in** / **Get started free** when
  signed out, and the user's name + **Sign out** when signed in.

## Backend

This frontend is paired with the `slide-ai-backend` repository
(FastAPI + Supabase). The backend is the source of truth for identity and
AI generation.

- **Backend (FastAPI + Supabase):** https://github.com/zakaria0n/slide-ai-backend
