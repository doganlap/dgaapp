import { useState, useEffect } from 'react'
import { programAPI } from '../api'
import { FiSearch, FiCalendar } from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'

function Programs() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      const response = await programAPI.getAll()
      setPrograms(response.data.data)
    } catch (error) {
      console.error('Failed to load programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrograms = programs.filter(program =>
    program.program_name.toLowerCase().includes(search.toLowerCase()) ||
    program.program_code.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (status) => {
    const colors = {
      'Planning': 'badge-warning',
      'In Progress': 'badge-info',
      'On Hold': 'badge-danger',
      'Completed': 'badge-success',
      'Cancelled': 'badge-danger'
    }
    return colors[status] || 'badge-info'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'Critical': 'text-red-600 bg-red-50',
      'High': 'text-orange-600 bg-orange-50',
      'Medium': 'text-blue-600 bg-blue-50',
      'Low': 'text-gray-600 bg-gray-50'
    }
    return colors[priority] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'برامج التحول الرقمي' : 'Digital Transformation Programs'}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `${programs.length} برنامج على مستوى المملكة` : `${programs.length} programs nationwide`}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث عن البرامج...' : 'Search programs...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Programs Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'البرنامج' : 'Program'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'النوع' : 'Type'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'الأولوية' : 'Priority'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'الميزانية' : 'Budget'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'التقدم' : 'Progress'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'الجدول الزمني' : 'Timeline'}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isAr ? 'حالة سير العمل' : 'Workflow Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPrograms.map((program) => (
                  <tr key={program.program_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{program.program_name}</p>
                        <p className="text-sm text-gray-600">{program.program_code}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{program.program_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getStatusColor(program.status)}`}>
                        {program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${getPriorityColor(program.priority)}`}>
                        {program.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {isAr ? 'ريال' : 'SAR'} {(program.allocated_budget / 1000000).toFixed(1)}{isAr ? 'م' : 'M'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {isAr ? 'المصروف:' : 'Spent:'} {((program.spent_budget / program.allocated_budget) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${program.completion_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-12">
                          {program.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <FiCalendar className="text-gray-400" />
                        <span>{new Date(program.start_date).getFullYear()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-info">{isAr ? 'المتابعة الذاتية مفعلة' : 'Autonomous Follow-up Active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPrograms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{isAr ? 'لا توجد برامج' : 'No programs found'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Programs
