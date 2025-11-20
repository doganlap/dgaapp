import { useState, useEffect } from 'react'
import { comprehensiveGrcAPI } from '../../api'
import DataTable from '../../components/DataTable'
import { FiFileText, FiPlus, FiFilter, FiShield } from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function Frameworks() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [frameworks, setFrameworks] = useState([])
  const [regulators, setRegulators] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    regulator_id: '',
    framework_type: '',
    compliance_level: ''
  })

  useEffect(() => {
    fetchRegulators()
    fetchFrameworks()
  }, [filters])

  const fetchRegulators = async () => {
    try {
      const response = await comprehensiveGrcAPI.getAllRegulators()
      setRegulators(response.data.data || [])
    } catch (error) {
      console.error('Error fetching regulators:', error)
    }
  }

  const fetchFrameworks = async () => {
    try {
      setLoading(true)
      const params = { ...filters }
      const response = await comprehensiveGrcAPI.getAllFrameworks(params)
      setFrameworks(response.data.data || [])
    } catch (error) {
      console.error('Error fetching frameworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      header: isAr ? 'الكود' : 'Code',
      accessor: 'framework_code',
      sortable: true,
    },
    {
      header: isAr ? 'الاسم (إنجليزي)' : 'Name (EN)',
      accessor: 'framework_name_en',
      sortable: true,
      render: (row) => (
        <div className="font-medium text-gray-900">{row.framework_name_en}</div>
      )
    },
    {
      header: isAr ? 'الجهة التنظيمية' : 'Regulator',
      accessor: 'regulator_name_en',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-700">{row.regulator_name_en}</div>
      )
    },
    {
      header: isAr ? 'النوع' : 'Type',
      accessor: 'framework_type',
      sortable: true,
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          {row.framework_type}
        </span>
      )
    },
    {
      header: isAr ? 'مستوى الامتثال' : 'Compliance Level',
      accessor: 'compliance_level',
      sortable: true,
      render: (row) => {
        const colors = {
          'Mandatory': 'bg-red-100 text-red-800',
          'Recommended': 'bg-yellow-100 text-yellow-800',
          'Optional': 'bg-blue-100 text-blue-800',
          'Conditional': 'bg-gray-100 text-gray-800'
        }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[row.compliance_level] || 'bg-gray-100 text-gray-800'}`}>
            {row.compliance_level}
          </span>
        )
      }
    },
    {
      header: isAr ? 'تاريخ السريان' : 'Effective Date',
      accessor: 'effective_date',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-700">
          {row.effective_date ? new Date(row.effective_date).toLocaleDateString() : '-'}
        </div>
      )
    }
  ]

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAr ? 'إدارة الأطر والقواعد' : 'Frameworks & Rules Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'إدارة الأطر التنظيمية والقواعد والمعايير' : 'Manage regulatory frameworks, rules, and standards'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dga-green text-white rounded-lg hover:bg-green-600">
          <FiPlus />
          <span>{isAr ? 'إضافة إطار' : 'Add Framework'}</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <FiFilter className="text-gray-500" />
          <select
            name="regulator_id"
            value={filters.regulator_id}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الجهات التنظيمية' : 'All Regulators'}</option>
            {regulators.map(reg => (
              <option key={reg.regulator_id} value={reg.regulator_id}>
                {isAr ? reg.regulator_name_ar : reg.regulator_name_en}
              </option>
            ))}
          </select>
          <select
            name="framework_type"
            value={filters.framework_type}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            <option value="Law">{isAr ? 'قانون' : 'Law'}</option>
            <option value="Regulation">{isAr ? 'تنظيم' : 'Regulation'}</option>
            <option value="Standard">{isAr ? 'معيار' : 'Standard'}</option>
            <option value="Guideline">{isAr ? 'إرشاد' : 'Guideline'}</option>
            <option value="Policy">{isAr ? 'سياسة' : 'Policy'}</option>
          </select>
          <select
            name="compliance_level"
            value={filters.compliance_level}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع المستويات' : 'All Levels'}</option>
            <option value="Mandatory">{isAr ? 'إلزامي' : 'Mandatory'}</option>
            <option value="Recommended">{isAr ? 'موصى به' : 'Recommended'}</option>
            <option value="Optional">{isAr ? 'اختياري' : 'Optional'}</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={frameworks}
        loading={loading}
        isAr={isAr}
        emptyMessage={isAr ? 'لا توجد أطر' : 'No frameworks found'}
        rowKey="framework_id"
        exportFileName="frameworks"
      />
    </div>
  )
}

export default Frameworks

