import { useState, useEffect } from 'react'
import { grcScoringAPI } from '../../api'
import { FiTrendingUp, FiTrendingDown, FiAward, FiAlertTriangle, FiTarget, FiBarChart2 } from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function Scoring() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [complianceScore, setComplianceScore] = useState(null)
  const [riskScore, setRiskScore] = useState(null)
  const [maturityScore, setMaturityScore] = useState(null)
  const [leadingIndicators, setLeadingIndicators] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntity, setSelectedEntity] = useState('')

  useEffect(() => {
    if (selectedEntity) {
      fetchAllScores()
    }
  }, [selectedEntity])

  const fetchAllScores = async () => {
    try {
      setLoading(true)
      const params = { entity_id: selectedEntity }
      
      const [compliance, risk, maturity, indicators] = await Promise.all([
        grcScoringAPI.getComplianceScore(params),
        grcScoringAPI.getRiskScore(params),
        grcScoringAPI.getMaturityScore(selectedEntity),
        grcScoringAPI.getLeadingIndicators(params)
      ])
      
      setComplianceScore(compliance.data.data)
      setRiskScore(risk.data.data)
      setMaturityScore(maturity.data.data)
      setLeadingIndicators(indicators.data.data)
    } catch (error) {
      console.error('Error fetching scores:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    if (score >= 40) return 'bg-orange-100'
    return 'bg-red-100'
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
            {isAr ? 'التقييم والمؤشرات' : 'Scoring & Leading Indicators'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isAr ? 'تقييم الامتثال والمخاطر والنضج والمؤشرات الرائدة' : 'Compliance, Risk, Maturity Scoring & Leading Indicators'}
          </p>
        </div>
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">{isAr ? 'اختر الجهة' : 'Select Entity'}</option>
          {/* Entity options would come from API */}
        </select>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance Score */}
        {complianceScore && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAr ? 'درجة الامتثال' : 'Compliance Score'}
              </h3>
              <FiAward className="text-2xl text-blue-500" />
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(complianceScore.overall_score)}`}>
                {Math.round(complianceScore.overall_score)}
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold inline-block ${getScoreBgColor(complianceScore.overall_score)} ${getScoreColor(complianceScore.overall_score)}`}>
                {complianceScore.grade}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <div>{isAr ? 'الامتثال:' : 'Compliance:'} {Math.round(complianceScore.compliance_score)}%</div>
                <div>{isAr ? 'التنفيذ:' : 'Implementation:'} {Math.round(complianceScore.implementation_score)}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Score */}
        {riskScore && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAr ? 'درجة المخاطر' : 'Risk Score'}
              </h3>
              <FiAlertTriangle className="text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(riskScore.risk_score)}`}>
                {Math.round(riskScore.risk_score)}
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold inline-block ${getScoreBgColor(riskScore.risk_score)} ${getScoreColor(riskScore.risk_score)}`}>
                {riskScore.risk_level}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <div>{isAr ? 'عالية:' : 'High:'} {riskScore.breakdown.high}</div>
                <div>{isAr ? 'متوسطة:' : 'Medium:'} {riskScore.breakdown.medium}</div>
                <div>{isAr ? 'منخفضة:' : 'Low:'} {riskScore.breakdown.low}</div>
              </div>
            </div>
          </div>
        )}

        {/* Maturity Score */}
        {maturityScore && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isAr ? 'درجة النضج' : 'Maturity Score'}
              </h3>
              <FiTarget className="text-2xl text-green-500" />
            </div>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(maturityScore.maturity_score)}`}>
                {Math.round(maturityScore.maturity_score)}
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold inline-block ${getScoreBgColor(maturityScore.maturity_score)} ${getScoreColor(maturityScore.maturity_score)}`}>
                {maturityScore.maturity_level}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <div>{isAr ? 'الامتثال:' : 'Compliance:'} {Math.round(maturityScore.components.compliance_score)}%</div>
                <div>{isAr ? 'المخاطر:' : 'Risk:'} {Math.round(maturityScore.components.risk_score)}%</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leading Indicators */}
      {leadingIndicators && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FiBarChart2 />
              {isAr ? 'المؤشرات الرائدة' : 'Leading Indicators'}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Compliance Velocity */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{isAr ? 'سرعة الامتثال' : 'Compliance Velocity'}</div>
                <div className="flex items-center gap-2 mt-2">
                  {leadingIndicators.compliance_velocity.trend === 'improving' ? (
                    <FiTrendingUp className="text-green-500" />
                  ) : leadingIndicators.compliance_velocity.trend === 'declining' ? (
                    <FiTrendingDown className="text-red-500" />
                  ) : null}
                  <span className="font-semibold">{leadingIndicators.compliance_velocity.trend}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isAr ? 'التغيير:' : 'Change:'} {Math.round(leadingIndicators.compliance_velocity.change)}%
                </div>
              </div>

              {/* Risk Trend */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{isAr ? 'اتجاه المخاطر' : 'Risk Trend'}</div>
                <div className="flex items-center gap-2 mt-2">
                  {leadingIndicators.risk_trend.trend === 'decreasing' ? (
                    <FiTrendingDown className="text-green-500" />
                  ) : leadingIndicators.risk_trend.trend === 'increasing' ? (
                    <FiTrendingUp className="text-red-500" />
                  ) : null}
                  <span className="font-semibold">{leadingIndicators.risk_trend.trend}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isAr ? 'المخاطر الجديدة:' : 'New Risks:'} {leadingIndicators.risk_trend.current}
                </div>
              </div>

              {/* Implementation Velocity */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{isAr ? 'سرعة التنفيذ' : 'Implementation Velocity'}</div>
                <div className="mt-2">
                  <span className="font-semibold">{leadingIndicators.implementation_velocity.velocity}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isAr ? 'متوسط الأيام:' : 'Avg Days:'} {leadingIndicators.implementation_velocity.avg_days_to_complete}
                </div>
              </div>

              {/* Remediation Time */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{isAr ? 'وقت الإصلاح' : 'Remediation Time'}</div>
                <div className="mt-2">
                  <span className="font-semibold">{leadingIndicators.remediation_time.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isAr ? 'متوسط الأيام:' : 'Avg Days:'} {leadingIndicators.remediation_time.avg_days}
                </div>
              </div>

              {/* Forecasts */}
              {leadingIndicators.compliance_forecast && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">{isAr ? 'توقعات الامتثال' : 'Compliance Forecast'}</div>
                  <div className="mt-2">
                    <span className="font-semibold text-blue-600">
                      {Math.round(leadingIndicators.compliance_forecast.forecast)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isAr ? 'الاتجاه:' : 'Trend:'} {leadingIndicators.compliance_forecast.trend}
                  </div>
                </div>
              )}

              {/* Overall Leading Score */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">{isAr ? 'النتيجة الإجمالية' : 'Overall Leading Score'}</div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-purple-600">
                    {leadingIndicators.leading_score}
                  </span>
                </div>
              </div>
            </div>

            {/* Insights */}
            {leadingIndicators.insights && leadingIndicators.insights.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{isAr ? 'الرؤى' : 'Insights'}</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {leadingIndicators.insights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {leadingIndicators.recommendations && leadingIndicators.recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{isAr ? 'التوصيات' : 'Recommendations'}</h3>
                <ul className="space-y-2">
                  {leadingIndicators.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rec.priority}
                      </span>
                      <span className="ml-2">{rec.action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidance Section */}
      {maturityScore && maturityScore.recommendations && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isAr ? 'التوصيات والإرشادات' : 'Recommendations & Guidance'}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {maturityScore.recommendations.map((rec, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority}
                        </span>
                        <span className="font-semibold text-gray-900">{rec.action}</span>
                      </div>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
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

export default Scoring

