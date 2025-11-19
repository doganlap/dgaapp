import { useState, useEffect } from 'react'
import api from '../../api'
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock,
  FiTrendingUp,
  FiShield,
  FiBarChart2
} from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function GRCDashboard() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [dashboardData, setDashboardData] = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchInsights()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/grc/dashboard')
      setDashboardData(response.data.data)
    } catch (error) {
      console.error('Error fetching GRC dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await api.get('/grc/dashboard/insights')
      setInsights(response.data.data)
    } catch (error) {
      console.error('Error fetching insights:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  const { riskSummary, complianceSummary, recentRisks, recentCompliance, complianceByStandard } = dashboardData || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAr ? 'لوحة تحكم الحوكمة والمخاطر والامتثال' : 'GRC Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isAr ? 'نظرة شاملة على المخاطر والامتثال والحوكمة' : 'Comprehensive view of Risk, Compliance & Governance'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Risk Summary */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isAr ? 'إجمالي المخاطر' : 'Total Risks'}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {riskSummary?.total_risks || 0}
              </p>
            </div>
            <FiAlertTriangle className="text-4xl text-red-500" />
          </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">{isAr ? 'عالية' : 'High'}</span>
                <span className="font-semibold">{riskSummary?.high_risks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600">{isAr ? 'متوسطة' : 'Medium'}</span>
                <span className="font-semibold">{riskSummary?.medium_risks || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">{isAr ? 'منخفضة' : 'Low'}</span>
                <span className="font-semibold">{riskSummary?.low_risks || 0}</span>
              </div>
            </div>
        </div>

        {/* Compliance Summary */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isAr ? 'سجلات الامتثال' : 'Compliance Records'}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {complianceSummary?.total_records || 0}
              </p>
            </div>
            <FiShield className="text-4xl text-green-500" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">{isAr ? 'متوافق' : 'Compliant'}</span>
              <span className="font-semibold">{complianceSummary?.compliant || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">{isAr ? 'غير متوافق' : 'Non-Compliant'}</span>
              <span className="font-semibold">{complianceSummary?.non_compliant || 0}</span>
            </div>
          </div>
        </div>

        {/* Risk Status */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isAr ? 'المخاطر المفتوحة' : 'Open Risks'}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {riskSummary?.total_risks || 0}
              </p>
            </div>
            <FiBarChart2 className="text-4xl text-yellow-500" />
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{isAr ? 'معدل الامتثال' : 'Compliance Rate'}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {complianceSummary?.compliant && complianceSummary?.total_records
                  ? ((complianceSummary.compliant / complianceSummary.total_records) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
            <FiTrendingUp className="text-4xl text-blue-500" />
          </div>
        </div>
      </div>

      {/* Recent Risks & Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Risks */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'المخاطر الأخيرة' : 'Recent Risks'}
            </h2>
          </div>
          <div className="p-6">
            {recentRisks && recentRisks.length > 0 ? (
              <div className="space-y-4">
                {recentRisks.map((risk) => (
                  <div key={risk.risk_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{risk.risk_description?.substring(0, 60) || 'No description'}</p>
                      {risk.mitigation_plan && (
                        <p className="text-sm text-gray-600 mt-1">{risk.mitigation_plan.substring(0, 50)}...</p>
                      )}
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        risk.severity === 'High' ? 'bg-red-100 text-red-800' :
                        risk.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{isAr ? 'لا توجد مخاطر حديثة' : 'No recent risks'}</p>
            )}
          </div>
        </div>

        {/* Recent Compliance Issues */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'مشاكل الامتثال الأخيرة' : 'Recent Compliance Issues'}
            </h2>
          </div>
          <div className="p-6">
            {recentCompliance && recentCompliance.length > 0 ? (
              <div className="space-y-4">
                {recentCompliance.map((compliance) => (
                  <div key={compliance.compliance_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{compliance.standard_name}</p>
                      <p className="text-sm text-gray-600 mt-1">{compliance.notes}</p>
                    </div>
                    <div className="ml-4">
                      <FiXCircle className="text-red-500 text-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">{isAr ? 'لا توجد مشاكل امتثال حديثة' : 'No recent compliance issues'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Compliance by Standard */}
      {complianceByStandard && complianceByStandard.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'الامتثال حسب المعيار' : 'Compliance by Standard'}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {complianceByStandard.map((item) => (
                <div key={item.standard_name} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{item.standard_name}</p>
                  <p className="text-2xl font-bold text-gray-700 mt-2">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights && insights.recommendations && insights.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'التوصيات والرؤى' : 'Recommendations & Insights'}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {insights.recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start">
                    <FiClock className="text-blue-500 mt-1 mr-3" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{rec.message}</p>
                      <p className="text-sm text-gray-600 mt-1">{rec.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GRCDashboard

