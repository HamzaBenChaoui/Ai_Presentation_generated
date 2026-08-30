import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui/Spinner'

/* ------------------------------------------------------------------ */
/*  Layouts                                                            */
/* ------------------------------------------------------------------ */

import AppShell from './layouts/AppShell'
import FullscreenShell from './layouts/FullscreenShell'

/* ------------------------------------------------------------------ */
/*  Pages                                                              */
/* ------------------------------------------------------------------ */

import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import EditorPage from './pages/EditorPage'
import PresentPage from './pages/PresentPage'
import SharedPage from './pages/SharedPage'
import PresentNotesPage from './pages/PresentNotesPage'
import OAuthAuthorizePage from './pages/OAuthAuthorizePage'
import NotFoundPage from './pages/NotFoundPage'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceDetailPage from './pages/WorkspaceDetailPage'
import TemplatesPage from './pages/TemplatesPage'
import AssetsPage from './pages/AssetsPage'
import SettingsPage from './pages/SettingsPage'
import McpPage from './pages/McpPage'

/* ------------------------------------------------------------------ */
/*  Auth guard                                                         */
/* ------------------------------------------------------------------ */

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <Outlet />
}

/* ------------------------------------------------------------------ */
/*  Root redirect                                                      */
/* ------------------------------------------------------------------ */

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomePage />
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },

  /* -- Public marketing pages ---------------------------------------- */
  { path: 'login', element: <LoginPage /> },
  { path: 'signup', element: <SignupPage /> },

  /* -- Authenticated app pages -------------------------------------- */
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'templates', element: <TemplatesPage /> },
          { path: 'assets', element: <AssetsPage /> },
          { path: 'workspaces', element: <WorkspacesPage /> },
          { path: 'workspaces/:id', element: <WorkspaceDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'mcp', element: <McpPage /> },
          { path: 'oauth/authorize', element: <OAuthAuthorizePage /> },
        ],
      },
      {
        element: <FullscreenShell />,
        children: [
          { path: 'editor/:id', element: <EditorPage /> },
          { path: 'present/:id', element: <PresentPage /> },
        ],
      },
    ],
  },

  /* -- Public fullscreen pages --------------------------------------- */
  {
    element: <FullscreenShell />,
    children: [
      { path: 'shared/:token', element: <SharedPage /> },
      { path: 'present-notes', element: <PresentNotesPage /> },
    ],
  },

  /* -- 404 ----------------------------------------------------------- */
  { path: '*', element: <NotFoundPage /> },
])
