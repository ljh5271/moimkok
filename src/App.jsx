import { Link, Outlet, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import CreateEventPage from './pages/CreateEventPage.jsx'
import EventCreatedPage from './pages/EventCreatedPage.jsx'
import VotePage from './pages/VotePage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-14 max-w-xl items-center px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded text-lg font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          {/* '콕' 찍은 점 하나가 로고 */}
          <span aria-hidden className="size-2.5 rounded-full bg-mark ring-2 ring-mark-deep/40" />
          모임콕
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<CreateEventPage />} />
        <Route path="/e/:eventId/created" element={<EventCreatedPage />} />
        <Route path="/e/:eventId/admin" element={<AdminPage />} />
        <Route path="/e/:eventId" element={<VotePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
