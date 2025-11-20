import { useState, useEffect } from 'react'
import { grcScoringAPI, comprehensiveGrcAPI, grcAPI } from '../../api'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, ScatterChart, Scatter
} from 'recharts'
import { 
  FiTrendingUp, FiTrendingDown, FiTarget, FiAward, FiAlertTriangle,
  FiCheckCircle, FiArrowRight, FiArrowLeft, FiPlay, FiPause
} from 'react-icons/fi'
import { useLocale } from '../../context/LocaleContext'

function VisualJourney() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [journeyData, setJourneyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntity, setSelectedEntity] = useState('')

  const COLORS = {
    primary: '#10b981',
    secondary: '#3b82f6',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    success: '#22c55e'
  }

  const journeySteps = [
    {
      id: 'overview',
      title: isAr ? 'نظرة عامة' : 'Overview',
      description: isAr ? 'ابدأ رحلتك مع نظرة شاملة على حالة GRC' : 'Start your journey with a comprehensive GRC overview',
      icon: FiTarget
    },
    {
      id: 'compliance',
      title: isAr ? 'الامتثال' : 'Compliance',
      description: isAr ? 'تتبع وتحليل حالة الامتثال' : 'Track and analyze compliance status',
      icon: FiCheckCircle
    },
    {
      id: 'risks',
      title: isAr ? 'المخاطر' : 'Risks',
      description: isAr ? 'تقييم وإدارة المخاطر' : 'Assess and manage risks',
      icon: FiAlertTriangle
    },
    {
      id: 'maturity',
      title: isAr ? 'النضج' : 'Maturity',
      description: isAr ? 'قياس مستوى النضج التنظيمي' : 'Measure organizational maturity',
      icon: FiAward
    },
    {
      id: 'trends',
      title: isAr ? 'الاتجاهات' : 'Trends',
      description: isAr ? 'تحليل الاتجاهات والتنبؤات' : 'Analyze trends and forecasts',
      icon: FiTrendingUp
    },
    {
      id: 'recommendations',
      title: isAr ? 'التوصيات' : 'Recommendations',
      description: isAr ? 'اتبع التوصيات لتحسين الأداء' : 'Follow recommendations to improve performance',
      icon: FiTarget
    }
  ]

  useEffect(() => {
    if (selectedEntity) {
      fetchJourneyData()
    }
  }, [selectedEntity])

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= journeySteps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 5000) // Auto-advance every 5 seconds
      return () => clearInterval(interval)
    }
  }, [isPlaying, journeySteps.length])

  const fetchJourneyData = async () => {
    try {
      setLoading(true)
      const params = { entity_id: selectedEntity }
      
      const [compliance, risk, maturity, indicators, assessments] = await Promise.all([
        grcScoringAPI.getComplianceScore(params),
        grcScoringAPI.getRiskScore(params),
        grcScoringAPI.getMaturityScore(selectedEntity),
        grcScoringAPI.getLeadingIndicators(params),
        comprehensiveGrcAPI.getControlAssessments(params)
      ])
      
      // Get risks separately using grcAPI (if available)
      let risksRes = { data: { data: { risks: [] } } }
      try {
        risksRes = await grcAPI.getAllRisks(params)
      } catch (error) {
        console.warn('Risks data not available:', error)
      }
      
      setJourneyData({
        compliance: compliance.data.data,
        risk: risk.data.data,
        maturity: maturity.data.data,
        indicators: indicators.data.data,
        assessments: assessments.data.data || [],
        risks: risksRes.data.data?.risks || risksRes.data.data || []
      })
    } catch (error) {
      console.error('Error fetching journey data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStepData = () => {
    if (!journeyData) return null

    switch (currentStep) {
      case 0: // Overview
        return {
          charts: [
            {
              type: 'composed',
              title: isAr ? 'نظرة عامة على الأداء' : 'Performance Overview',
              data: [
                {
                  name: isAr ? 'الامتثال' : 'Compliance',
                  score: Math.round(journeyData.compliance.overall_score),
                  risk: Math.round(journeyData.risk.risk_score),
                  maturity: Math.round(journeyData.maturity.maturity_score)
                }
              ]
            },
            {
              type: 'radar',
              title: isAr ? 'نقاط القوة والضعف' : 'Strengths & Weaknesses',
              data: [
                {
                  category: isAr ? 'الامتثال' : 'Compliance',
                  score: journeyData.compliance.overall_score,
                  fullMark: 100
                },
                {
                  category: isAr ? 'إدارة المخاطر' : 'Risk Mgmt',
                  score: journeyData.risk.risk_score,
                  fullMark: 100
                },
                {
                  category: isAr ? 'التنفيذ' : 'Implementation',
                  score: journeyData.compliance.implementation_score,
                  fullMark: 100
                },
                {
                  category: isAr ? 'التخفيف' : 'Mitigation',
                  score: journeyData.risk.metrics.mitigation_rate,
                  fullMark: 100
                },
                {
                  category: isAr ? 'النضج' : 'Maturity',
                  score: journeyData.maturity.maturity_score,
                  fullMark: 100
                }
              ]
            }
          ]
        }
      
      case 1: // Compliance
        const complianceTrends = journeyData.compliance.trends || []
        const complianceByStatus = [
          { name: isAr ? 'متوافق' : 'Compliant', value: journeyData.compliance.breakdown.compliant, color: COLORS.success },
          { name: isAr ? 'جزئي' : 'Partial', value: journeyData.compliance.breakdown.partial, color: COLORS.warning },
          { name: isAr ? 'غير متوافق' : 'Non-Compliant', value: journeyData.compliance.breakdown.non_compliant, color: COLORS.danger }
        ]
        
        return {
          charts: [
            {
              type: 'line',
              title: isAr ? 'اتجاهات الامتثال' : 'Compliance Trends',
              data: complianceTrends.map(t => ({
                month: new Date(t.month).toLocaleDateString('en-US', { month: 'short' }),
                rate: Math.round(t.compliance_rate || 0)
              }))
            },
            {
              type: 'pie',
              title: isAr ? 'توزيع حالة الامتثال' : 'Compliance Status Distribution',
              data: complianceByStatus
            },
            {
              type: 'bar',
              title: isAr ? 'تفصيل الامتثال' : 'Compliance Breakdown',
              data: [
                {
                  name: isAr ? 'الامتثال' : 'Compliance',
                  score: Math.round(journeyData.compliance.compliance_score)
                },
                {
                  name: isAr ? 'التنفيذ' : 'Implementation',
                  score: Math.round(journeyData.compliance.implementation_score)
                },
                {
                  name: isAr ? 'الإجمالي' : 'Overall',
                  score: Math.round(journeyData.compliance.overall_score)
                }
              ]
            }
          ]
        }
      
      case 2: // Risks
        const riskTrends = journeyData.risk.trends || []
        const riskBySeverity = [
          { name: isAr ? 'عالية' : 'High', value: journeyData.risk.breakdown.high, color: COLORS.danger },
          { name: isAr ? 'متوسطة' : 'Medium', value: journeyData.risk.breakdown.medium, color: COLORS.warning },
          { name: isAr ? 'منخفضة' : 'Low', value: journeyData.risk.breakdown.low, color: COLORS.info }
        ]
        
        return {
          charts: [
            {
              type: 'area',
              title: isAr ? 'اتجاهات المخاطر' : 'Risk Trends',
              data: riskTrends.map(t => ({
                month: new Date(t.month).toLocaleDateString('en-US', { month: 'short' }),
                count: t.risk_count || 0,
                score: Math.round(t.avg_risk_score || 0)
              }))
            },
            {
              type: 'pie',
              title: isAr ? 'توزيع المخاطر حسب الخطورة' : 'Risk Distribution by Severity',
              data: riskBySeverity
            },
            {
              type: 'bar',
              title: isAr ? 'حالة المخاطر' : 'Risk Status',
              data: [
                {
                  name: isAr ? 'مفتوحة' : 'Open',
                  count: journeyData.risk.breakdown.open
                },
                {
                  name: isAr ? 'تم التخفيف' : 'Mitigated',
                  count: journeyData.risk.breakdown.mitigated
                }
              ]
            }
          ]
        }
      
      case 3: // Maturity
        const maturityComponents = [
          {
            name: isAr ? 'الامتثال' : 'Compliance',
            score: journeyData.maturity.components.compliance_score
          },
          {
            name: isAr ? 'المخاطر' : 'Risk',
            score: journeyData.maturity.components.risk_score
          },
          {
            name: isAr ? 'التنفيذ' : 'Implementation',
            score: journeyData.maturity.components.implementation_rate
          }
        ]
        
        return {
          charts: [
            {
              type: 'radar',
              title: isAr ? 'مكونات النضج' : 'Maturity Components',
              data: maturityComponents.map(c => ({
                category: c.name,
                score: c.score,
                fullMark: 100
              }))
            },
            {
              type: 'bar',
              title: isAr ? 'تحليل النضج' : 'Maturity Analysis',
              data: maturityComponents
            },
            {
              type: 'line',
              title: isAr ? 'مسار النضج' : 'Maturity Journey',
              data: [
                { level: 'Initial', score: 20 },
                { level: 'Repeatable', score: 35 },
                { level: 'Defined', score: 50 },
                { level: 'Managed', score: 65 },
                { level: 'Optimized', score: 80 },
                { level: isAr ? 'حالياً' : 'Current', score: journeyData.maturity.maturity_score }
              ]
            }
          ]
        }
      
      case 4: // Trends
        const indicators = journeyData.indicators
        return {
          charts: [
            {
              type: 'composed',
              title: isAr ? 'المؤشرات الرائدة' : 'Leading Indicators',
              data: [
                {
                  name: isAr ? 'سرعة الامتثال' : 'Compliance Velocity',
                  value: indicators.compliance_velocity.change || 0,
                  trend: indicators.compliance_velocity.trend
                },
                {
                  name: isAr ? 'اتجاه المخاطر' : 'Risk Trend',
                  value: indicators.risk_trend.change || 0,
                  trend: indicators.risk_trend.trend
                },
                {
                  name: isAr ? 'سرعة التنفيذ' : 'Implementation Velocity',
                  value: indicators.implementation_velocity.avg_days_to_complete || 0
                }
              ]
            },
            {
              type: 'line',
              title: isAr ? 'التوقعات' : 'Forecasts',
              data: [
                {
                  period: isAr ? 'الحالي' : 'Current',
                  compliance: journeyData.compliance.overall_score,
                  risk: journeyData.risk.risk_score,
                  maturity: journeyData.maturity.maturity_score
                },
                {
                  period: isAr ? 'المتوقع' : 'Forecast',
                  compliance: indicators.compliance_forecast?.forecast || journeyData.compliance.overall_score,
                  risk: indicators.risk_forecast?.forecast || journeyData.risk.risk_score,
                  maturity: indicators.maturity_forecast?.forecast || journeyData.maturity.maturity_score
                }
              ]
            }
          ]
        }
      
      case 5: // Recommendations
        const recommendations = journeyData.maturity.recommendations || []
        return {
          charts: [
            {
              type: 'bar',
              title: isAr ? 'أولويات التوصيات' : 'Recommendation Priorities',
              data: recommendations.map((rec, idx) => ({
                name: rec.action.substring(0, 30),
                priority: rec.priority === 'High' ? 3 : rec.priority === 'Medium' ? 2 : 1,
                index: idx
              }))
            }
          ],
          recommendations
        }
      
      default:
        return null
    }
  }

  const renderChart = (chartConfig) => {
    if (!chartConfig) return null

    switch (chartConfig.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartConfig.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke={COLORS.primary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartConfig.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="count" stackId="1" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.6} />
              <Area type="monotone" dataKey="score" stackId="2" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartConfig.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chartConfig.data[0].score ? 'score' : chartConfig.data[0].count ? 'count' : 'priority'} fill={COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartConfig.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartConfig.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )
      
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartConfig.data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )
      
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartConfig.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill={COLORS.primary} />
              <Line type="monotone" dataKey="risk" stroke={COLORS.danger} />
              <Line type="monotone" dataKey="maturity" stroke={COLORS.success} />
            </ComposedChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    )
  }

  const stepData = getStepData()
  const currentStepInfo = journeySteps[currentStep]

  return (
    <div className="space-y-6">
      {/* Journey Navigation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAr ? 'الرحلة المرئية لـ GRC' : 'GRC Visual Journey'}
            </h1>
            <p className="text-gray-600 mt-2">
              {isAr ? 'استكشف رحلتك في الحوكمة والمخاطر والامتثال' : 'Explore your Governance, Risk & Compliance journey'}
            </p>
          </div>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="border rounded-lg px-4 py-2"
          >
            <option value="">{isAr ? 'اختر الجهة' : 'Select Entity'}</option>
          </select>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-between mb-6">
          {journeySteps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  index === currentStep
                    ? 'bg-dga-green text-white'
                    : index < currentStep
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                <step.icon />
              </div>
              {index < journeySteps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Info */}
        <div className="bg-blue-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{currentStepInfo.title}</h3>
            <p className="text-sm text-gray-600">{currentStepInfo.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              <FiArrowLeft />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-white hover:bg-gray-100"
            >
              {isPlaying ? <FiPause /> : <FiPlay />}
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(journeySteps.length - 1, currentStep + 1))}
              disabled={currentStep === journeySteps.length - 1}
              className="p-2 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              <FiArrowRight />
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      {stepData && stepData.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stepData.charts.map((chart, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{chart.title}</h3>
              {renderChart(chart)}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {stepData && stepData.recommendations && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isAr ? 'التوصيات' : 'Recommendations'}
          </h2>
          <div className="space-y-3">
            {stepData.recommendations.map((rec, index) => (
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
      )}
    </div>
  )
}

export default VisualJourney

