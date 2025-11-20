import { useState, useEffect } from 'react'
import { comprehensiveGrcAPI } from '../../api'
import DataTable from '../../components/DataTable'
import { FiShield, FiPlus, FiFilter, FiMapPin } from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function Regulators() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [regulators, setRegulators] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    regulator_type: '',
    jurisdiction: '',
    is_active: ''
  })

  useEffect(() => {
    fetchRegulators()
  }, [filters])

  const fetchRegulators = async () => {
    try {
      setLoading(true)
      const params = { ...filters }
      const response = await comprehensiveGrcAPI.getAllRegulators(params)
      setRegulators(response.data.data || [])
    } catch (error) {
      console.error('Error fetching regulators:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      header: isAr ? 'الكود' : 'Code',
      accessor: 'regulator_code',
      sortable: true,
    },
    {
      header: isAr ? 'الاسم (إنجليزي)' : 'Name (EN)',
      accessor: 'regulator_name_en',
      sortable: true,
      render: (row) => (
        <div className="font-medium text-gray-900">{row.regulator_name_en}</div>
      )
    },
    {
      header: isAr ? 'الاسم (عربي)' : 'Name (AR)',
      accessor: 'regulator_name_ar',
      sortable: true,
      render: (row) => (
        <div className="text-sm text-gray-700">{row.regulator_name_ar}</div>
      )
    },
    {
      header: isAr ? 'النوع' : 'Type',
      accessor: 'regulator_type',
      sortable: true,
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {row.regulator_type}
        </span>
      )
    },
    {
      header: isAr ? 'الصلاحية' : 'Jurisdiction',
      accessor: 'jurisdiction',
      sortable: true,
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          {row.jurisdiction}
        </span>
      )
    },
    {
      header: isAr ? 'الحالة' : 'Status',
      accessor: 'is_active',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          row.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
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
            {isAr ? 'إدارة الجهات التنظيمية' : 'Regulators Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'إدارة 50+ جهة تنظيمية في المملكة العربية السعودية' : 'Manage 50+ regulatory authorities in Saudi Arabia'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dga-green text-white rounded-lg hover:bg-green-600">
          <FiPlus />
          <span>{isAr ? 'إضافة جهة تنظيمية' : 'Add Regulator'}</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <FiFilter className="text-gray-500" />
          <select
            name="regulator_type"
            value={filters.regulator_type}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الأنواع' : 'All Types'}</option>
            <option value="Government Authority">{isAr ? 'هيئة حكومية' : 'Government Authority'}</option>
            <option value="Ministry">{isAr ? 'وزارة' : 'Ministry'}</option>
            <option value="Commission">{isAr ? 'لجنة' : 'Commission'}</option>
            <option value="Center">{isAr ? 'مركز' : 'Center'}</option>
            <option value="Agency">{isAr ? 'وكالة' : 'Agency'}</option>
          </select>
          <select
            name="jurisdiction"
            value={filters.jurisdiction}
            onChange={handleFilterChange}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">{isAr ? 'جميع الصلاحيات' : 'All Jurisdictions'}</option>
            <option value="National">{isAr ? 'وطني' : 'National'}</option>
            <option value="Regional">{isAr ? 'إقليمي' : 'Regional'}</option>
            <option value="Sector-Specific">{isAr ? 'قطاعي' : 'Sector-Specific'}</option>
            <option value="Cross-Sector">{isAr ? 'عبر القطاعات' : 'Cross-Sector'}</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={regulators}
        loading={loading}
        isAr={isAr}
        emptyMessage={isAr ? 'لا توجد جهات تنظيمية' : 'No regulators found'}
        rowKey="regulator_id"
        exportFileName="regulators"
      />
    </div>
  )
}

export default Regulators

