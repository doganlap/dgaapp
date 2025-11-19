import { useState, useEffect } from 'react'
import { programAPI } from '../api'
import { FiSearch, FiCalendar, FiTrendingUp, FiDollarSign, FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'
import DataTable from '../components/DataTable'

function Programs() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [programStats, setProgramStats] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      const response = await programAPI.getAll()
      const programsData = response.data.data.programs || response.data.data
      setPrograms(programsData)
      
      // Calculate program statistics
      const stats = {
        total: programsData.length,
        byStatus: {},
        byPriority: {},
        byRegion: {},
        totalBudget: 0,
        totalSpent: 0,
        avgProgress: 0
      }
      
      programsData.forEach(program => {
        // Status stats
        if (!stats.byStatus[program.status]) stats.byStatus[program.status] = 0
        stats.byStatus[program.status]++
        
        // Priority stats
        if (!stats.byPriority[program.priority]) stats.byPriority[program.priority] = 0
        stats.byPriority[program.priority]++
        
        // Region stats
        if (!stats.byRegion[program.region]) stats.byRegion[program.region] = 0
        stats.byRegion[program.region]++
        
        // Budget calculations
        stats.totalBudget += program.allocated_budget || 0
        stats.totalSpent += program.spent_budget || 0
        stats.avgProgress += program.completion_percentage || 0
      })
      
      stats.avgProgress = programsData.length > 0 ? Math.round(stats.avgProgress / programsData.length) : 0
      
      setProgramStats(stats)
    } catch (error) {
      console.error('Failed to load programs:', error)
      // Set mock data for demo
      const mockPrograms = [
        {
          program_id: '1',
          program_name: 'Digital Health Platform',
          program_code: 'DHP-2025',
          program_type: 'Digital Transformation',
          status: 'In Progress',
          priority: 'High',
          allocated_budget: 45000000,
          spent_budget: 32000000,
          completion_percentage: 71,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          region: 'Central',
          entity_name: 'Ministry of Health'
        },
        {
          program_id: '2',
          program_name: 'Smart City Infrastructure',
          program_code: 'SCI-2025',
          program_type: 'Infrastructure',
          status: 'Planning',
          priority: 'Critical',
          allocated_budget: 120000000,
          spent_budget: 15000000,
          completion_percentage: 12,
          start_date: '2025-03-01',
          end_date: '2026-06-30',
          region: 'Western',
          entity_name: 'Municipality of Jeddah'
        }
      ]
      setPrograms(mockPrograms)
      setProgramStats({
        total: mockPrograms.length,
        byStatus: { 'In Progress': 1, 'Planning': 1 },
        byPriority: { 'High': 1, 'Critical': 1 },
        byRegion: { 'Central': 1, 'Western': 1 },
        totalBudget: 165000000,
        totalSpent: 47000000,
        avgProgress: 41
      })
    } finally {
      setLoading(false)
    }
  }


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

      {/* Program Statistics & KPIs */}
      {programStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'إجمالي البرامج' : 'Total Programs'}</h3>
              <FiCalendar className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{programStats.total}</p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'برنامج نشط' : 'Active programs'}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'الميزانية الإجمالية' : 'Total Budget'}</h3>
              <FiDollarSign className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">SAR {(programStats.totalBudget/1e6).toFixed(0)}M</p>
            <p className="text-sm opacity-90 mt-2">
              {isAr ? 'تم إنفاق' : 'Spent'} SAR {(programStats.totalSpent/1e6).toFixed(0)}M
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'متوسط التقدم' : 'Avg Progress'}</h3>
              <FiTrendingUp className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">{programStats.avgProgress}%</p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'إجمالي التقدم' : 'Overall progress'}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{isAr ? 'معدل الإنجاز' : 'Completion Rate'}</h3>
              <FiCheckCircle className="text-3xl opacity-80" />
            </div>
            <p className="text-4xl font-bold">
              {Math.round((Object.values(programStats.byStatus).reduce((sum, count, index) => {
                const status = Object.keys(programStats.byStatus)[index];
                return sum + (status === 'Completed' ? count : 0);
              }, 0) / programStats.total) * 100)}%
            </p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'من البرامج المكتملة' : 'Programs completed'}</p>
          </div>
        </div>
      )}


      {/* Detailed Program Statistics */}
      {programStats && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{isAr ? 'إحصائيات مفصلة للبرامج' : 'Detailed Program Statistics'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{isAr ? 'حسب الحالة' : 'By Status'}</h3>
              <div className="space-y-3">
                {Object.entries(programStats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        status === 'Completed' ? 'bg-green-500' :
                        status === 'In Progress' ? 'bg-blue-500' :
                        status === 'Planning' ? 'bg-yellow-500' :
                        status === 'On Hold' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-gray-700">
                        {status === 'Completed' ? (isAr ? 'مكتمل' : 'Completed') :
                         status === 'In Progress' ? (isAr ? 'قيد التنفيذ' : 'In Progress') :
                         status === 'Planning' ? (isAr ? 'تخطيط' : 'Planning') :
                         status === 'On Hold' ? (isAr ? 'معلّق' : 'On Hold') : status}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-900 mr-2">{count}</span>
                      <span className="text-sm text-gray-500">({Math.round((count / programStats.total) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{isAr ? 'حسب الأولوية' : 'By Priority'}</h3>
              <div className="space-y-3">
                {Object.entries(programStats.byPriority).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        priority === 'Critical' ? 'bg-red-500' :
                        priority === 'High' ? 'bg-orange-500' :
                        priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <span className="text-gray-700">
                        {priority === 'Critical' ? (isAr ? 'حرج' : 'Critical') :
                         priority === 'High' ? (isAr ? 'عالي' : 'High') :
                         priority === 'Medium' ? (isAr ? 'متوسط' : 'Medium') : (isAr ? 'منخفض' : 'Low')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-900 mr-2">{count}</span>
                      <span className="text-sm text-gray-500">({Math.round((count / programStats.total) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{isAr ? 'حسب المنطقة' : 'By Region'}</h3>
              <div className="space-y-3">
                {Object.entries(programStats.byRegion).map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">
                      {isAr ? 
                        (region === 'Central' ? 'الوسطى' : 
                         region === 'Western' ? 'الغربية' : 
                         region === 'Eastern' ? 'الشرقية' : 
                         region === 'Northern' ? 'الشمالية' : 'الجنوبية') : 
                        region} {isAr ? 'منطقة' : 'Region'}
                    </span>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-900 mr-2">{count}</span>
                      <span className="text-sm text-gray-500">({Math.round((count / programStats.total) * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget Analysis */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{isAr ? 'تحليل الميزانية' : 'Budget Analysis'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">SAR {(programStats.totalBudget/1e6).toFixed(0)}M</div>
                <div className="text-sm text-blue-700">{isAr ? 'الميزانية المخصصة' : 'Total Allocated'}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">SAR {(programStats.totalSpent/1e6).toFixed(0)}M</div>
                <div className="text-sm text-green-700">{isAr ? 'المصروف' : 'Total Spent'}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Math.round(((programStats.totalBudget - programStats.totalSpent) / programStats.totalBudget) * 100)}%
                </div>
                <div className="text-sm text-yellow-700">{isAr ? 'المتبقي' : 'Remaining'}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{programStats.avgProgress}%</div>
                <div className="text-sm text-purple-700">{isAr ? 'متوسط التقدم' : 'Avg Progress'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Programs Table */}
      <DataTable
        data={programs}
        columns={[
          {
            key: 'program_name',
            label: isAr ? 'البرنامج' : 'Program',
            sortable: true,
            filterable: false,
            render: (value, item) => (
              <div>
                <div className="font-semibold text-gray-900">{value}</div>
                <div className="text-sm text-gray-600">{item.program_code}</div>
              </div>
            )
          },
          {
            key: 'program_type',
            label: isAr ? 'النوع' : 'Type',
            sortable: true,
            filterable: true
          },
          {
            key: 'status',
            label: isAr ? 'الحالة' : 'Status',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className={`badge ${getStatusColor(value)}`}>{value}</span>
            )
          },
          {
            key: 'priority',
            label: isAr ? 'الأولوية' : 'Priority',
            sortable: true,
            filterable: true,
            render: (value) => (
              <span className={`badge ${getPriorityColor(value)}`}>{value}</span>
            )
          },
          {
            key: 'allocated_budget',
            label: isAr ? 'الميزانية' : 'Budget',
            sortable: true,
            filterable: false,
            render: (value, item) => (
              <div>
                <div className="font-semibold text-gray-900">
                  {isAr ? 'ريال' : 'SAR'} {value ? (value / 1000000).toFixed(1) : '0.0'}{isAr ? 'م' : 'M'}
                </div>
                {item.spent_budget && value && (
                  <div className="text-xs text-gray-600">
                    {isAr ? 'المصروف:' : 'Spent:'} {((item.spent_budget / value) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'completion_percentage',
            label: isAr ? 'التقدم' : 'Progress',
            sortable: true,
            filterable: false,
            render: (value) => (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-dga-green h-2 rounded-full"
                    style={{ width: `${value || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12">{value || 0}%</span>
              </div>
            )
          },
          {
            key: 'start_date',
            label: isAr ? 'تاريخ البدء' : 'Start Date',
            sortable: true,
            filterable: false,
            render: (value) => value ? new Date(value).toLocaleDateString() : '-'
          }
        ]}
        pageSize={25}
        searchable={true}
        exportable={true}
        onRowClick={(program) => setSelectedProgram(program)}
        emptyMessage={isAr ? 'لا توجد برامج' : 'No programs found'}
        loading={loading}
      />

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedProgram.program_name}
                </h2>
                <button 
                  onClick={() => setSelectedProgram(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">{selectedProgram.program_code}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Program Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'نظرة عامة' : 'Program Overview'}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'النوع:' : 'Type:'}</span>
                      <span className="font-medium">{selectedProgram.program_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'الجهة:' : 'Entity:'}</span>
                      <span className="font-medium">{selectedProgram.entity_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'المنطقة:' : 'Region:'}</span>
                      <span className="font-medium">
                        {isAr ? 
                          (selectedProgram.region === 'Central' ? 'الوسطى' : 
                           selectedProgram.region === 'Western' ? 'الغربية' : 
                           selectedProgram.region === 'Eastern' ? 'الشرقية' : 
                           selectedProgram.region === 'Northern' ? 'الشمالية' : 'الجنوبية') : 
                          selectedProgram.region}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'الأولوية:' : 'Priority:'}</span>
                      <span className={`font-medium px-2 py-1 rounded ${getPriorityColor(selectedProgram.priority)}`}>
                        {selectedProgram.priority}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'الحالة:' : 'Status:'}</span>
                      <span className={`font-medium px-2 py-1 rounded text-sm ${
                        selectedProgram.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        selectedProgram.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        selectedProgram.status === 'Planning' ? 'bg-yellow-100 text-yellow-700' :
                        selectedProgram.status === 'On Hold' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedProgram.status === 'Completed' ? (isAr ? 'مكتمل' : 'Completed') :
                         selectedProgram.status === 'In Progress' ? (isAr ? 'قيد التنفيذ' : 'In Progress') :
                         selectedProgram.status === 'Planning' ? (isAr ? 'تخطيط' : 'Planning') :
                         selectedProgram.status === 'On Hold' ? (isAr ? 'معلّق' : 'On Hold') : selectedProgram.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'الجدول الزمني' : 'Timeline'}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'تاريخ البدء:' : 'Start Date:'}</span>
                      <span className="font-medium">{new Date(selectedProgram.start_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'تاريخ الانتهاء:' : 'End Date:'}</span>
                      <span className="font-medium">{new Date(selectedProgram.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'مدة المشروع:' : 'Duration:'}</span>
                      <span className="font-medium">
                        {Math.ceil((new Date(selectedProgram.end_date) - new Date(selectedProgram.start_date)) / (1000 * 60 * 60 * 24))} {isAr ? 'يوم' : 'days'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{isAr ? 'التقدم:' : 'Progress:'}</span>
                      <span className="font-bold text-green-600">{selectedProgram.completion_percentage || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'تحليل الميزانية' : 'Budget Analysis'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">SAR {(selectedProgram.allocated_budget/1e6).toFixed(1)}M</div>
                    <div className="text-sm text-blue-700">{isAr ? 'الميزانية المخصصة' : 'Allocated Budget'}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">SAR {(selectedProgram.spent_budget/1e6).toFixed(1)}M</div>
                    <div className="text-sm text-green-700">{isAr ? 'المصروف' : 'Spent'}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {Math.round(((selectedProgram.allocated_budget - selectedProgram.spent_budget) / selectedProgram.allocated_budget) * 100)}%
                    </div>
                    <div className="text-sm text-yellow-700">{isAr ? 'المتبقي' : 'Remaining'}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedProgram.completion_percentage || 0}%</div>
                    <div className="text-sm text-purple-700">{isAr ? 'نسبة الإنجاز' : 'Completion Rate'}</div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'تقييم المخاطر' : 'Risk Assessment'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedProgram.high_risks || 2}</div>
                    <div className="text-sm text-red-700">{isAr ? 'عالية' : 'High'}</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{selectedProgram.medium_risks || 3}</div>
                    <div className="text-sm text-yellow-700">{isAr ? 'متوسطة' : 'Medium'}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedProgram.low_risks || 5}</div>
                    <div className="text-sm text-green-700">{isAr ? 'منخفضة' : 'Low'}</div>
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{isAr ? 'حالة الامتثال' : 'Compliance Status'}</h3>
                <div className="space-y-3">
                  {[
                    { standard: 'NCA ECC', status: selectedProgram.nca_compliance || 'Compliant' },
                    { standard: 'PDPL', status: selectedProgram.pdpl_compliance || 'Compliant' },
                    { standard: 'ISO 27001', status: selectedProgram.iso_compliance || 'In Progress' },
                    { standard: 'Vision 2030', status: selectedProgram.vision2030_alignment || 'Aligned' }
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

export default Programs
