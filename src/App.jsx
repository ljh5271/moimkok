import { Link, Outlet, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import CreateEventPage from './pages/CreateEventPage.jsx'
import EventCreatedPage from './pages/EventCreatedPage.jsx'
import VotePage from './pages/VotePage.jsx'
import VoteDonePage from './pages/VoteDonePage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center px-5">
          <Link
            to="/"
            className="rounded-lg text-[19px] font-extrabold tracking-[-0.03em] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            모임콕
          </Link>
        </div>
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
        <Route path="/e/:eventId/done" element={<VoteDonePage />} />
        <Route path="/e/:eventId" element={<VotePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
