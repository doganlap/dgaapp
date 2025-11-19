import { useState, useEffect } from 'react'
import api from '../../api'
import { useLocale } from '../../context/LocaleContext'
import { FiTrendingUp, FiAlertCircle, FiCheckCircle, FiBarChart2, FiTarget } from 'react-icons/fi'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

function Insights() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [insights, setInsights] = useState(null)
  const [riskPredictions, setRiskPredictions] = useState(null)
  const [complianceTrends, setComplianceTrends] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllInsights()
  }, [])

  const fetchAllInsights = async () => {
    try {
      const [insightsRes, predictionsRes, trendsRes] = await Promise.all([
        api.get('/grc/dashboard/insights'),
        api.get('/grc/insights/risk-predictions'),
        api.get('/grc/insights/compliance-trends')
      ])
      
      setInsights(insightsRes.data.data)
      setRiskPredictions(predictionsRes.data.data)
      setComplianceTrends(trendsRes.data.data)
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  // Chart data for risk trends
  const riskTrendsData = insights?.riskTrends ? {
    labels: insights.riskTrends.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [{
      label: isAr ? 'عدد المخاطر' : 'Number of Risks',
      data: insights.riskTrends.map(t => t.count),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4
    }]
  } : null

  // Chart data for compliance trends
  const complianceTrendsData = complianceTrends ? {
    labels: complianceTrends.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [{
      label: isAr ? 'متوافق' : 'Compliant',
      data: complianceTrends.map(t => t.compliant),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4
    }, {
      label: isAr ? 'إجمالي' : 'Total',
      data: complianceTrends.map(t => t.total),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }]
  } : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {isAr ? 'الرؤى والتحليلات' : 'Insights & Analytics'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isAr ? 'تحليلات متقدمة وتوقعات ذكية للمخاطر والامتثال' : 'Advanced analytics and intelligent predictions for risks and compliance'}
        </p>
      </div>

      {/* Risk Predictions */}
      {riskPredictions && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <FiTarget className="text-2xl text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'توقعات المخاطر' : 'Risk Predictions'}
            </h2>
          </div>
          
          {riskPredictions.highRiskEntities && riskPredictions.highRiskEntities.length > 0 && (
            <div className="space-y-4">
              <p className="text-gray-600">{isAr ? 'الجهات عالية المخاطر:' : 'High Risk Entities:'}</p>
              {riskPredictions.highRiskEntities.map((entity, index) => (
                <div key={index} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{entity.entity_name_en}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {isAr ? 'عدد المخاطر:' : 'Risk Count:'} {entity.risk_count}
                      </p>
                    </div>
                    <FiAlertCircle className="text-red-500 text-2xl" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {riskPredictions.recommendations && riskPredictions.recommendations.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="font-medium text-gray-900">{isAr ? 'التوصيات:' : 'Recommendations:'}</p>
              {riskPredictions.recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{rec}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trends Chart */}
        {riskTrendsData && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiTrendingUp className="text-xl text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isAr ? 'اتجاهات المخاطر' : 'Risk Trends'}
              </h3>
            </div>
            <Line data={riskTrendsData} options={{
              responsive: true,
              plugins: {
                legend: { display: true },
                title: { display: false }
              }
            }} />
          </div>
        )}

        {/* Compliance Trends Chart */}
        {complianceTrendsData && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <FiCheckCircle className="text-xl text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isAr ? 'اتجاهات الامتثال' : 'Compliance Trends'}
              </h3>
            </div>
            <Line data={complianceTrendsData} options={{
              responsive: true,
              plugins: {
                legend: { display: true },
                title: { display: false }
              }
            }} />
          </div>
        )}
      </div>

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <FiBarChart2 className="text-2xl text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'التوصيات القابلة للتنفيذ' : 'Actionable Recommendations'}
            </h2>
          </div>
          <div className="space-y-4">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{rec.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{rec.action}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Insights

