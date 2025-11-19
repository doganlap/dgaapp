import { useState, useEffect } from 'react'
import api from '../../api'
import { useLocale } from '../../context/LocaleContext'
import { FiShield, FiCheckCircle, FiXCircle, FiClock, FiPlus, FiFilter } from 'react-icons/fi'
import DataTable from '../../components/DataTable'

function Compliance() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [compliance, setCompliance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompliance()
  }, [])

  const fetchCompliance = async () => {
    try {
      const response = await api.get('/grc/compliance')
      setCompliance(response.data.data.compliance || [])
    } catch (error) {
      console.error('Error fetching compliance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Compliant': return <FiCheckCircle className="text-green-500" />
      case 'Non-Compliant': return <FiXCircle className="text-red-500" />
      case 'In Progress': return <FiClock className="text-yellow-500" />
      default: return <FiShield className="text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Compliant': return 'bg-green-100 text-green-800'
      case 'Non-Compliant': return 'bg-red-100 text-red-800'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
            {isAr ? 'إدارة الامتثال' : 'Compliance Management'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'تتبع ومراقبة الامتثال للمعايير واللوائح' : 'Track and monitor compliance with standards and regulations'}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-dga-green text-white rounded-lg hover:bg-green-600">
          <FiPlus />
          <span>{isAr ? 'إضافة سجل امتثال' : 'Add Compliance Record'}</span>
        </button>
      </div>

      {/* Interactive Compliance Table */}
      <DataTable
        data={compliance}
        columns={[
          {
            key: 'standard_name',
            label: isAr ? 'المعيار' : 'Standard',
            sortable: true,
            filterable: true,
            render: (value) => (
              <div className="flex items-center">
                <FiShield className="text-blue-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
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
              <div className="flex items-center">
                {getStatusIcon(value)}
                <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(value)}`}>
                  {value}
                </span>
              </div>
            )
          },
          {
            key: 'audit_date',
            label: isAr ? 'تاريخ التدقيق' : 'Audit Date',
            sortable: true,
            filterable: false,
            render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
          },
          {
            key: 'notes',
            label: isAr ? 'ملاحظات' : 'Notes',
            sortable: false,
            filterable: false,
            render: (value) => value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '-'
          }
        ]}
        pageSize={25}
        searchable={true}
        exportable={true}
        emptyMessage={isAr ? 'لا توجد سجلات امتثال' : 'No compliance records found'}
        loading={loading}
      />
    </div>
  )
}

export default Compliance

