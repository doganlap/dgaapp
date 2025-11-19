import { useState, useEffect } from 'react'
import api from '../../api'
import { useLocale } from '../../context/LocaleContext'
import { FiAlertTriangle, FiPlus, FiFilter } from 'react-icons/fi'
import DataTable from '../../components/DataTable'

function Risks() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRisks()
  }, [])

  const fetchRisks = async () => {
    try {
      const response = await api.get('/grc/risks')
      setRisks(response.data.data.risks || [])
    } catch (error) {
      console.error('Error fetching risks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevelColor = (severity) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800 border-red-300'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAr ? 'إدارة المخاطر' : 'Risk Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'تتبع وإدارة المخاطر التنظيمية' : 'Track and manage organizational risks'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dga-green text-white rounded-lg hover:bg-green-600">
          <FiPlus />
          <span>{isAr ? 'إضافة مخاطرة' : 'Add Risk'}</span>
        </button>
      </div>

      {/* Interactive Risks Table */}
      <DataTable
        data={risks}
        columns={[
          {
            key: 'risk_description',
            label: isAr ? 'وصف المخاطرة' : 'Risk Description',
            sortable: true,
            filterable: false,
            render: (value, item) => (
              <div className="flex items-center">
                <FiAlertTriangle className="text-red-500 mr-2" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{value?.substring(0, 60) || 'No description'}</div>
                  {item.mitigation_plan && (
                    <div className="text-sm text-gray-500">{item.mitigation_plan.substring(0, 50)}...</div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'severity',
            label: isAr ? 'المستوى' : 'Severity',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskLevelColor(value)}`}>
                {value}
              </span>
            )
          },
          {
            key: 'entity_name_en',
            label: isAr ? 'الجهة' : 'Entity',
            sortable: true,
            filterable: true,
            render: (value, item) => (
              <span>{isAr ? item.entity_name_ar : value}</span>
            )
          },
          {
            key: 'status',
            label: isAr ? 'الحالة' : 'Status',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                {value}
              </span>
            )
          },
          {
            key: 'created_at',
            label: isAr ? 'تاريخ الإنشاء' : 'Created Date',
            sortable: true,
            filterable: false,
            render: (value) => value ? new Date(value).toLocaleDateString() : '-'
          }
        ]}
        pageSize={25}
        searchable={true}
        exportable={true}
        emptyMessage={isAr ? 'لا توجد مخاطر' : 'No risks found'}
        loading={loading}
      />
    </div>
  )
}

export default Risks

