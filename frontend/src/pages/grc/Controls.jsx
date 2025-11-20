import { useState, useEffect } from 'react'
import { comprehensiveGrcAPI } from '../../api'
import DataTable from '../../components/DataTable'
import { FiCheckSquare, FiPlus, FiFilter } from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function Controls() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [controls, setControls] = useState([])
  const [frameworks, setFrameworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    framework_id: '',
    control_type: '',
    control_category: ''
  })

  useEffect(() => {
    fetchFrameworks()
    fetchControls()
  }, [filters])

  const fetchFrameworks = async () => {
    try {
      const response = await comprehensiveGrcAPI.getAllFrameworks()
      setFrameworks(response.data.data || [])
    } catch (error) {
      console.error('Error fetching frameworks:', error)
    }
  }

  const fetchControls = async () => {
    try {
      setLoading(true)
      const params = { ...filters }
      const response = await comprehensiveGrcAPI.getAllControls(params)
      setControls(response.data.data || [])
    } catch (error) {
      console.error('Error fetching controls:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      header: isAr ? 'الكود' : 'Code',
      accessor: 'control_code',
      sortable: true,
    },
    {
      header: isAr ? 'الاسم (إنجليزي)' : 'Name (EN)',
      accessor: 'control_name_en',
      sortable: true,
      render: (row) => (
        <div className="font-medium text-gray-900">{row.control_name_en}</div>
      )
    },
    {
      header: isAr ? 'الإطار' : 'Framework',
      accessor: 'framework_name_en',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-700">{row.framework_name_en}</div>
      )
    },
    {
      header: isAr ? 'النوع' : 'Type',
      accessor: 'control_type',
      sortable: true,
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {row.control_type}
        </span>
      )
    },
    {
      header: isAr ? 'الفئة' : 'Category',
      accessor: 'control_category',
      sortable: true,
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          {row.control_category}
        </span>
      )
    },
    {
      header: isAr ? 'الأولوية' : 'Priority',
      accessor: 'priority',
      sortable: true,
      render: (row) => {
        const colors = {
          'Critical': 'bg-red-100 text-red-800',
          'High': 'bg-orange-100 text-orange-800',
          'Medium': 'bg-yellow-100 text-yellow-800',
          'Low': 'bg-blue-100 text-blue-800'
        }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[row.priority] || 'bg-gray-100 text-gray-800'}`}>
            {row.priority}
          </span>
        )
      }
    },
    {
      header: isAr ? 'إلزامي' : 'Mandatory',
      accessor: 'is_mandatory',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          row.is_mandatory ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.is_mandatory ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
        </span>
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
            {isAr ? 'إدارة الضوابط' : 'Controls Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'إدارة الضوابط من الأطر التنظيمية' : 'Manage controls from regulatory frameworks'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dga-green text-white rounded-lg hover:bg-green-600">
          <FiPlus />
          <span>{isAr ? 'إضافة ضابط' : 'Add Control'}</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <FiFilter className="text-gray-500" />
          <select
            name="framework_id"
            value={filters.framework_id}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الأطر' : 'All Frameworks'}</option>
            {frameworks.map(fw => (
              <option key={fw.framework_id} value={fw.framework_id}>
                {isAr ? fw.framework_name_ar : fw.framework_name_en}
              </option>
            ))}
          </select>
          <select
            name="control_type"
            value={filters.control_type}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            <option value="Preventive">{isAr ? 'وقائي' : 'Preventive'}</option>
            <option value="Detective">{isAr ? 'كشف' : 'Detective'}</option>
            <option value="Corrective">{isAr ? 'تصحيحي' : 'Corrective'}</option>
            <option value="Technical">{isAr ? 'تقني' : 'Technical'}</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={controls}
        loading={loading}
        isAr={isAr}
        emptyMessage={isAr ? 'لا توجد ضوابط' : 'No controls found'}
        rowKey="control_id"
        exportFileName="controls"
      />
    </div>
  )
}

export default Controls

