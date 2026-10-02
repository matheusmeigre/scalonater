import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useLocation,
} from 'react-router'
import { useSettings } from '@/engine/store/settingsStore'
import { Announcer } from '@/ui/Announcer'
import { PwaPrompt } from './PwaPrompt'
import { SettingsDialog } from './SettingsDialog'
import { GameHub } from './screens/GameHub'
import { ManualScreen } from './screens/ManualScreen'
import { MapScreen } from './screens/MapScreen'
import { NotFound } from './screens/NotFound'
import { PlayScreen } from './screens/PlayScreen'
import { ResultScreen } from './screens/ResultScreen'

/** Ao trocar de tela, o foco vai para o título (leitores de tela anunciam a nova tela). */
function FocusOnNavigate() {
  const { pathname } = useLocation()
  useEffect(() => {
    const h = document.querySelector<HTMLElement>('[data-screen-title]')
    if (h) {
      h.tabIndex = -1
      h.focus({ preventScroll: true })
    }
  }, [pathname])
  return null
}

function RootLayout() {
  const reduceMotion = useSettings((s) => s.reduceMotion)
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <ScrollRestoration />
      <FocusOnNavigate />
      <Outlet />
      <SettingsDialog />
      <PwaPrompt />
      <Announcer />
    </MotionConfig>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <MapScreen /> },
      { path: '/manual', element: <ManualScreen /> },
      { path: '/jogo/:gameId', element: <GameHub /> },
      { path: '/jogo/:gameId/:phaseId', element: <PlayScreen /> },
      { path: '/jogo/:gameId/:phaseId/resultado', element: <ResultScreen /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
