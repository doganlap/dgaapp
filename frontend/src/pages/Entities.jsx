import { useState, useEffect } from 'react'
import { entityAPI } from '../api'
import { FiSearch, FiFilter, FiPlus, FiMapPin, FiBarChart2, FiTrendingUp, FiDollarSign, FiBriefcase, FiDatabase } from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'
import DataTable from '../components/DataTable'

function Entities() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [entityStats, setEntityStats] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState(null)

  useEffect(() => {
    loadEntities()
  }, [])

  const loadEntities = async () => {
    try {
      setLoading(true)
      const response = await entityAPI.getAll()
      const entitiesData = response.data.data.entities || response.data.data
      setEntities(entitiesData)
      
      // Calculate entity statistics
      const stats = {
        total: entitiesData.length,
        byRegion: {},
        byStatus: {},
        byType: {},
        activeCount: 0
      }
      
      entitiesData.forEach(entity => {
        // Region stats
        if (!stats.byRegion[entity.region]) stats.byRegion[entity.region] = 0
        stats.byRegion[entity.region]++
        
        // Status stats
        if (!stats.byStatus[entity.status]) stats.byStatus[entity.status] = 0
        stats.byStatus[entity.status]++
        
        // Type stats
        if (!stats.byType[entity.entity_type]) stats.byType[entity.entity_type] = 0
        stats.byType[entity.entity_type]++
        
        // Active count
        if (entity.status === 'Active') stats.activeCount++
      })
      
      setEntityStats(stats)
    } catch (error) {
      console.error('Failed to load entities:', error)
      // Set mock data for demo
      const mockEntities = [
        {
          entity_id: '1',
          entity_name_en: 'Ministry of Health',
          entity_name_ar: 'وزارة الصحة',
          entity_code: 'MOH',
          entity_type: 'Ministry',
          region: 'Central',
          sector: 'Health',
          status: 'Active',
          location_city: 'Riyadh',
          active_programs: 12,
          total_budget: 2500000000
        },
        {
          entity_id: '2',
          entity_name_en: 'Municipality of Jeddah',
          entity_name_ar: 'أمانة جدة',
          entity_code: 'JEDDAH',
          entity_type: 'Municipality',
          region: 'Western',
          sector: 'Urban Development',
          status: 'Active',
          location_city: 'Jeddah',
          active_programs: 8,
          total_budget: 1800000000
        }
      ]
      setEntities(mockEntities)
      setEntityStats({
        total: mockEntities.length,
        byRegion: { Central: 1, Western: 1 },
        byStatus: { Active: 2 },
        byType: { Ministry: 1, Municipality: 1 },
        activeCount: 2
      })
    } finally {
      setLoading(false)
    }
  }


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

      {/* Entity Statistics & Indicators */}
      {entityStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'إجمالي الجهات' : 'Total Entities'}</h3>
              <FiDatabase className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{entityStats.total}</p>
            <p className="text-sm opacity-90 mt-2">{entityStats.activeCount} {isAr ? 'نشطة' : 'Active'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'المناطق' : 'Regions'}</h3>
              <FiMapPin className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{Object.keys(entityStats.byRegion).length}</p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'منطقة نشطة' : 'Active Regions'}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'أنواع الجهات' : 'Entity Types'}</h3>
              <FiBriefcase className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{Object.keys(entityStats.byType).length}</p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'نوع مختلف' : 'Different Types'}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'معدل النشاط' : 'Activity Rate'}</h3>
              <FiTrendingUp className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{Math.round((entityStats.activeCount / entityStats.total) * 100)}%</p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'من الجهات نشطة' : 'Of entities active'}</p>
          </div>
        </div>
      )}

      {/* Regional Distribution Chart */}
      {entityStats && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'توزيع الجهات حسب المنطقة' : 'Entity Distribution by Region'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(entityStats.byRegion).map(([region, count]) => (
              <div key={region} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-600">{count}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {isAr ? 
                    (region === 'Central' ? 'الوسطى' : 
                     region === 'Western' ? 'الغربية' : 
                     region === 'Eastern' ? 'الشرقية' : 
                     region === 'Northern' ? 'الشمالية' : 'الجنوبية') : 
                    region} {isAr ? 'منطقة' : 'Region'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${(count / entityStats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Statistics Table */}
      {entityStats && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'إحصائيات مفصلة' : 'Detailed Statistics'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Entity Types */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{isAr ? 'حسب النوع' : 'By Type'}</h3>
              <div className="space-y-2">
                {Object.entries(entityStats.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">{type}</span>
                    <span className="font-semibold text-primary-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{isAr ? 'حسب الحالة' : 'By Status'}</h3>
              <div className="space-y-2">
                {Object.entries(entityStats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">
                      {status === 'Active' ? (isAr ? 'نشطة' : 'Active') :
                       status === 'Inactive' ? (isAr ? 'غير نشطة' : 'Inactive') :
                       status === 'Under Review' ? (isAr ? 'تحت المراجعة' : 'Under Review') : status}
                    </span>
                    <span className={`font-semibold ${
                      status === 'Active' ? 'text-green-600' :
                      status === 'Inactive' ? 'text-red-600' : 'text-yellow-600'
                    }`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Indicators */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{isAr ? 'مؤشرات الأداء' : 'Performance Indicators'}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{isAr ? 'نسبة النشاط' : 'Activity Rate'}</span>
                  <span className="font-semibold text-green-600">{Math.round((entityStats.activeCount / entityStats.total) * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{isAr ? 'متوسط البرامج' : 'Avg Programs'}</span>
                  <span className="font-semibold text-blue-600">
                    {entities.length > 0 ? Math.round(entities.reduce((sum, e) => sum + (e.active_programs || 0), 0) / entities.length) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{isAr ? 'المناطق المغطاة' : 'Regions Covered'}</span>
                  <span className="font-semibold text-purple-600">{Object.keys(entityStats.byRegion).length}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


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

              <button 
                onClick={() => setSelectedEntity(entity)}
                className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
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

      {/* Entity Detail Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isAr ? (selectedEntity.entity_name_ar || selectedEntity.entity_name_en) : selectedEntity.entity_name_en}
                </h2>
                <button 
                  onClick={() => setSelectedEntity(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">{selectedEntity.entity_code}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'المعلومات الأساسية' : 'Basic Information'}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'النوع:' : 'Type:'}</span>
                      <span className="font-medium">{selectedEntity.entity_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'القطاع:' : 'Sector:'}</span>
                      <span className="font-medium">{selectedEntity.sector}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'المنطقة:' : 'Region:'}</span>
                      <span className="font-medium">
                        {isAr ? 
                          (selectedEntity.region === 'Central' ? 'الوسطى' : 
                           selectedEntity.region === 'Western' ? 'الغربية' : 
                           selectedEntity.region === 'Eastern' ? 'الشرقية' : 
                           selectedEntity.region === 'Northern' ? 'الشمالية' : 'الجنوبية') : 
                          selectedEntity.region}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'المدينة:' : 'City:'}</span>
                      <span className="font-medium">{selectedEntity.location_city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'الحالة:' : 'Status:'}</span>
                      <span className={`font-medium ${
                        selectedEntity.status === 'Active' ? 'text-green-600' :
                        selectedEntity.status === 'Inactive' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {selectedEntity.status === 'Active' ? (isAr ? 'نشطة' : 'Active') :
                         selectedEntity.status === 'Inactive' ? (isAr ? 'غير نشطة' : 'Inactive') :
                         (isAr ? 'تحت المراجعة' : 'Under Review')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'مؤشرات الأداء' : 'Performance Indicators'}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'البرامج النشطة:' : 'Active Programs:'}</span>
                      <span className="font-bold text-blue-600">{selectedEntity.active_programs || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'إجمالي الميزانية:' : 'Total Budget:'}</span>
                      <span className="font-bold text-green-600">SAR {(selectedEntity.total_budget / 1e6).toFixed(1)}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'نسبة الإنجاز:' : 'Completion Rate:'}</span>
                      <span className="font-bold text-purple-600">{selectedEntity.completion_rate || 87}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'مؤشر النضج الرقمي:' : 'Digital Maturity Index:'}</span>
                      <span className="font-bold text-orange-600">{selectedEntity.digital_maturity_score || 75}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Programs Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'نظرة عامة على البرامج' : 'Programs Overview'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedEntity.active_programs || 0}</div>
                    <div className="text-sm text-blue-700">{isAr ? 'نشطة' : 'Active'}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{selectedEntity.planned_programs || 3}</div>
                    <div className="text-sm text-yellow-700">{isAr ? 'مخططة' : 'Planned'}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedEntity.completed_programs || 5}</div>
                    <div className="text-sm text-green-700">{isAr ? 'مكتملة' : 'Completed'}</div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'تقييم المخاطر' : 'Risk Assessment'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedEntity.high_risks || 1}</div>
                    <div className="text-sm text-red-700">{isAr ? 'عالية' : 'High'}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{selectedEntity.medium_risks || 2}</div>
                    <div className="text-sm text-yellow-700">{isAr ? 'متوسطة' : 'Medium'}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedEntity.low_risks || 3}</div>
                    <div className="text-sm text-green-700">{isAr ? 'منخفضة' : 'Low'}</div>
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'حالة الامتثال' : 'Compliance Status'}</h3>
                <div className="space-y-3">
                  {[
                    { standard: 'NCA ECC', status: selectedEntity.nca_compliance || 'Compliant' },
                    { standard: 'PDPL', status: selectedEntity.pdpl_compliance || 'Compliant' },
                    { standard: 'ISO 27001', status: selectedEntity.iso_compliance || 'In Progress' },
                    { standard: 'Vision 2030', status: selectedEntity.vision2030_alignment || 'Aligned' }
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-700">{item.standard}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.status === 'Compliant' || item.status === 'Aligned' ? 'bg-green-100 text-green-700' :
                        item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Entities
