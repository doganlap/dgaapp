import { useState, useEffect } from 'react'
import { reportingAPI, budgetAPI } from '../api'
import { useLocale } from '../context/LocaleContext'

function Reports() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [stats, setStats] = useState({
    totalEntities: 0,
    totalPrograms: 0,
    totalBudget: 0,
    regions: 5
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportStats()
  }, [])

  const loadReportStats = async () => {
    try {
      const [overviewRes, budgetRes] = await Promise.all([
        reportingAPI.getNationalOverview(),
        budgetAPI.getOverview()
      ])
      
      setStats({
        totalEntities: overviewRes.data.data?.totalEntities || 0,
        totalPrograms: overviewRes.data.data?.activePrograms || 0,
        totalBudget: budgetRes.data.data?.totalAllocated || 0,
        regions: 5
      })
    } catch (error) {
      console.error('Failed to load report stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'التقارير والتحليلات' : 'Reports & Analytics'}</h1>
        <p className="text-gray-600 mt-1">{isAr ? 'مؤشرات الأداء وتقارير الامتثال للتحول الرقمي' : 'Digital Transformation KPIs and Compliance Reports'}</p>
      </div>

      {/* Quick Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-3xl mb-3">📈</div>
          <h3 className="text-lg font-bold text-gray-900">{isAr ? 'لوحة الأداء' : 'Performance Dashboard'}</h3>
          <p className="text-gray-600 text-sm mt-2">{isAr ? `متابعة المؤشرات في الوقت الفعلي عبر ${stats.totalEntities} جهة` : `Real-time KPI tracking across ${stats.totalEntities} government entities`}</p>
          <div className="mt-4 text-primary-600 font-semibold">{isAr ? 'عرض التقرير →' : 'View Report →'}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-3xl mb-3">💰</div>
          <h3 className="text-lg font-bold text-gray-900">{isAr ? 'استخدام الميزانية' : 'Budget Utilization'}</h3>
          <p className="text-gray-600 text-sm mt-2">{isAr ? `تحليل صندوق التحول الرقمي ${ (stats.totalBudget / 1000000000).toFixed(2)} مليار ريال` : `SAR ${(stats.totalBudget / 1000000000).toFixed(2)}B digital transformation fund analysis`}</p>
          <div className="mt-4 text-primary-600 font-semibold">{isAr ? 'عرض التقرير →' : 'View Report →'}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="text-lg font-bold text-gray-900">{isAr ? 'تدقيق الامتثال' : 'Compliance Audit'}</h3>
          <p className="text-gray-600 text-sm mt-2">{isAr ? 'تقارير حالة الامتثال لنCA ECC وPDPL' : 'NCA ECC & PDPL compliance status reports'}</p>
          <div className="mt-4 text-primary-600 font-semibold">{isAr ? 'عرض التقرير →' : 'View Report →'}</div>
        </div>
      </div>

      {/* Report Categories */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{isAr ? 'التقارير المتاحة' : 'Available Reports'}</h2>
        <div className="space-y-4">
          {[
            { category: isAr ? 'الملخص التنفيذي' : 'Executive Summary', count: stats.totalEntities, desc: isAr ? 'نظرة عامة للقيادة' : 'High-level overview for leadership' },
            { category: isAr ? 'تقدم البرامج' : 'Program Progress', count: stats.totalPrograms, desc: isAr ? 'حالة مفصلة لجميع البرامج' : 'Detailed status of all digital programs' },
            { category: isAr ? 'الأداء الإقليمي' : 'Regional Performance', count: stats.regions, desc: isAr ? 'مقارنة ورؤى إقليمية' : 'Regional comparison and insights' },
            { category: isAr ? 'تقارير الوزارات' : 'Ministry Reports', count: stats.totalEntities, desc: isAr ? 'مقاييس أداء الجهات' : 'Individual entity performance metrics' },
            { category: isAr ? 'مواءمة رؤية 2030' : 'Vision 2030 Alignment', count: 8, desc: isAr ? 'تتبع الأهداف الاستراتيجية' : 'Strategic objective tracking' },
            { category: isAr ? 'سجل المخاطر والقضايا' : 'Risk & Issues Log', count: Math.floor(stats.totalPrograms * 0.25), desc: isAr ? 'المخاطر النشطة وخطط التخفيف' : 'Active risks and mitigation plans' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{report.category}</h4>
                <p className="text-sm text-gray-600 mt-1">{report.desc}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {isAr ? `${report.count} تقرير` : `${report.count} reports`}
                </span>
                <button className="text-primary-600 font-semibold">{isAr ? 'إنشاء →' : 'Generate →'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports
