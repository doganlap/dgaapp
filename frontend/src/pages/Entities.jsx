import { useState, useEffect } from 'react'
import { entityAPI } from '../api'
import { FiSearch, FiFilter, FiPlus, FiMapPin } from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'

function Entities() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadEntities()
  }, [regionFilter, statusFilter])

  const loadEntities = async () => {
    try {
      setLoading(true)
      const params = {}
      if (regionFilter) params.region = regionFilter
      if (statusFilter) params.status = statusFilter
      
      const response = await entityAPI.getAll(params)
      setEntities(response.data.data)
    } catch (error) {
      console.error('Failed to load entities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntities = entities.filter(entity =>
    (entity.entity_name_en || entity.entity_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (entity.entity_code || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'الجهات الحكومية' : 'Government Entities'}</h1>
          <p className="text-gray-600 mt-1">{isAr ? `${entities.length} جهة عبر 5 مناطق` : `${entities.length} entities across 5 regions`}</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <FiPlus /> {isAr ? 'إضافة جهة' : 'Add Entity'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isAr ? 'ابحث عن الجهات...' : 'Search entities...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{isAr ? 'جميع المناطق' : 'All Regions'}</option>
            <option value="Central">{isAr ? 'الوسطى' : 'Central'}</option>
            <option value="Western">{isAr ? 'الغربية' : 'Western'}</option>
            <option value="Eastern">{isAr ? 'الشرقية' : 'Eastern'}</option>
            <option value="Northern">{isAr ? 'الشمالية' : 'Northern'}</option>
            <option value="Southern">{isAr ? 'الجنوبية' : 'Southern'}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{isAr ? 'جميع الحالات' : 'All Status'}</option>
            <option value="Active">{isAr ? 'نشطة' : 'Active'}</option>
            <option value="Inactive">{isAr ? 'متوقفة' : 'Inactive'}</option>
            <option value="Under Review">{isAr ? 'تحت المراجعة' : 'Under Review'}</option>
          </select>
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntities.map((entity) => (
            <div key={entity.entity_id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{isAr ? (entity.entity_name_ar || entity.entity_name || entity.entity_name_en) : (entity.entity_name_en || entity.entity_name)}</h3>
                  <p className="text-sm text-gray-600 mt-1">{entity.entity_code}</p>
                </div>
                <span className={`badge ${entity.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                  {entity.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiMapPin className="text-primary-500" />
                  <span>{entity.location_city}, {entity.region}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">{isAr ? 'النوع:' : 'Type:'}</span>
                  <span className="font-medium text-gray-900">{entity.entity_type}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">{isAr ? 'القطاع:' : 'Sector:'}</span>
                  <span className="font-medium text-gray-900">{entity.sector}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">{isAr ? 'البرامج النشطة:' : 'Active Programs:'}</span>
                  <span className="font-bold text-primary-600">{entity.active_programs}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-gray-600">{isAr ? 'الميزانية:' : 'Budget:'}</span>
                  <span className="font-bold text-green-600">
                    {isAr ? 'ريال' : 'SAR'} {(entity.total_budget / 1000000).toFixed(1)}{isAr ? 'م' : 'M'}
                  </span>
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                {isAr ? 'عرض التفاصيل' : 'View Details'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredEntities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{isAr ? 'لا توجد جهات' : 'No entities found'}</p>
        </div>
      )}
    </div>
  )
}

export default Entities
