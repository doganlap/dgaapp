import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useLocale } from '../context/LocaleContext'

function Layout() {
  const { dir, locale } = useLocale()
  const isAr = locale === 'ar'
  return (
    <div className="flex h-screen bg-gray-50" dir={dir}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto p-6 ${isAr ? 'text-right' : 'text-left'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
