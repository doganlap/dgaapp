import { useState, useEffect } from 'react'
import api from '../api'
import { useLocale } from '../context/LocaleContext'

function Users() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [stats, setStats] = useState({
    admins: 0,
    regionalManagers: 0,
    programDirectors: 0,
    financialControllers: 0,
    total: 0
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/dga/users')
      const userData = response.data.data || []
      setUsers(userData)
      
      // Calculate stats from real data
      const statsCalc = {
        admins: userData.filter(u => u.role === 'DGA Admin').length,
        regionalManagers: userData.filter(u => u.role === 'Regional Manager').length,
        programDirectors: userData.filter(u => u.role === 'Program Director').length,
        financialControllers: userData.filter(u => u.role === 'Financial Controller').length,
        total: userData.length
      }
      setStats(statsCalc)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = search === '' || 
      user.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === '' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'إدارة المستخدمين' : 'User Management'}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `${stats.total} مستخدم عبر جميع الجهات الحكومية` : `${stats.total} users across all government entities`}</p>
        </div>
        <button className="bg-dga-green text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
          {isAr ? '+ إضافة مستخدم' : '+ Add User'}
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { role: isAr ? 'مدراء الهيئة' : 'DGA Admins', count: stats.admins, color: 'bg-red-500' },
          { role: isAr ? 'المدراء الإقليميون' : 'Regional Managers', count: stats.regionalManagers, color: 'bg-blue-500' },
          { role: isAr ? 'مدراء البرامج' : 'Program Directors', count: stats.programDirectors, color: 'bg-green-500' },
          { role: isAr ? 'المدراء الماليون' : 'Financial Controllers', count: stats.financialControllers, color: 'bg-yellow-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6">
            <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <span className="text-white text-2xl">👤</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.count}</h3>
            <p className="text-gray-600 text-sm mt-1">{stat.role}</p>
          </div>
        ))}
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{isAr ? 'المستخدمون النشطون' : 'Active Users'}</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={isAr ? 'ابحث عن المستخدمين...' : 'Search users...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{isAr ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="DGA Admin">{isAr ? 'مدير الهيئة' : 'DGA Admin'}</option>
              <option value="Regional Manager">{isAr ? 'مدير إقليمي' : 'Regional Manager'}</option>
              <option value="Program Director">{isAr ? 'مدير برنامج' : 'Program Director'}</option>
              <option value="Financial Controller">{isAr ? 'مدير مالي' : 'Financial Controller'}</option>
              <option value="Compliance Auditor">{isAr ? 'مدقق امتثال' : 'Compliance Auditor'}</option>
              <option value="Analytics Lead">{isAr ? 'قائد التحليلات' : 'Analytics Lead'}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'الجهة' : 'Entity'}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'الدور' : 'Role'}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'المنطقة' : 'Region'}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    {isAr ? 'لا يوجد مستخدمون' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.slice(0, 50).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-gray-900">{user.name_en || user.name || 'N/A'}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.entity_name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.region || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'Active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-primary-600 hover:text-primary-800 font-semibold text-sm">
                      {isAr ? 'إدارة' : 'Manage'}
                    </button>
                  </td>
                </tr>
              )))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {filteredUsers.length > 50 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            {isAr ? `عرض أول 50 من ${filteredUsers.length} مستخدم` : `Showing first 50 of ${filteredUsers.length} users`}
          </div>
        )}
      </div>
    </div>
  )
}

export default Users
