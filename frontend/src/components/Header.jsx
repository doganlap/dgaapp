import { useAuth } from '../context/AuthContext'
import { FiBell, FiLogOut, FiUser } from 'react-icons/fi'

function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-800">
            مرحبًا بك، {user?.full_name?.split(' ')[0] || 'المستخدم'}
          </h2>
          <p className="text-sm text-gray-600">
            {user?.role?.replace('_', ' ').toUpperCase()} | منطقة {user?.region}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <FiBell className="text-xl" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <FiUser className="text-gray-600" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FiLogOut />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
