import { useState, useEffect } from 'react'
import api from '../api'
import { useLocale } from '../context/LocaleContext'
import DataTable from '../components/DataTable'

function Users() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
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

      {/* Interactive Users Table */}
      <DataTable
        data={users}
        columns={[
          {
            key: 'name_en',
            label: isAr ? 'المستخدم' : 'User',
            sortable: true,
            filterable: false,
            render: (value, item) => (
              <div>
                <div className="font-semibold text-gray-900">{value || item.name || 'N/A'}</div>
                <div className="text-sm text-gray-600">{item.email}</div>
              </div>
            )
          },
          {
            key: 'entity_name',
            label: isAr ? 'الجهة' : 'Entity',
            sortable: true,
            filterable: true
          },
          {
            key: 'role',
            label: isAr ? 'الدور' : 'Role',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                {value}
              </span>
            )
          },
          {
            key: 'region',
            label: isAr ? 'المنطقة' : 'Region',
            sortable: true,
            filterable: true
          },
          {
            key: 'status',
            label: isAr ? 'الحالة' : 'Status',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                value === 'Active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {value}
              </span>
            )
          }
        ]}
        pageSize={25}
        searchable={true}
        exportable={true}
        emptyMessage={isAr ? 'لا يوجد مستخدمون' : 'No users found'}
        loading={loading}
      />
    </div>
  )
}

export default Users
