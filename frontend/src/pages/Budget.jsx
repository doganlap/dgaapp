import { useState, useEffect } from 'react'
import { budgetAPI } from '../api'
import { FiDollarSign, FiTrendingUp, FiPieChart } from 'react-icons/fi'
import { useLocale } from '../context/LocaleContext'
import { motion } from 'framer-motion'
import { Bar, Line, Pie } from 'react-chartjs-2'

function Budget() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBudget()
  }, [])

  const loadBudget = async () => {
    try {
      const response = await budgetAPI.getOverview()
      setOverview(response.data.data)
    } catch (error) {
      console.error('Failed to load budget:', error)
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
        <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'نظرة عامة على الميزانية' : 'Budget Overview'}</h1>
        <p className="text-gray-600 mt-1">{isAr ? 'متابعة ميزانية التحول الرقمي الوطنية' : 'National digital transformation budget tracking'}</p>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{isAr ? 'إجمالي المخصص' : 'Total Allocated'}</h3>
            <FiDollarSign className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">
            {isAr ? 'ريال' : 'SAR'} {((overview?.totalAllocated || 0) / 1000000000).toFixed(2)}{isAr ? 'مليار' : 'B'}
          </p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'عبر جميع البرامج' : 'Across all programs'}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{isAr ? 'إجمالي المصروف' : 'Total Spent'}</h3>
            <FiTrendingUp className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">
            {isAr ? 'ريال' : 'SAR'} {((overview?.totalSpent || 0) / 1000000000).toFixed(2)}{isAr ? 'مليار' : 'B'}
          </p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'منذ بداية السنة' : 'Year to date'}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{isAr ? 'معدل الاستفادة' : 'Utilization Rate'}</h3>
            <FiPieChart className="text-3xl opacity-80" />
          </div>
          <p className="text-4xl font-bold">
            {overview?.utilizationRate || 0}%
          </p>
            <p className="text-sm opacity-90 mt-2">{isAr ? 'كفاءة الميزانية' : 'Budget efficiency'}</p>
        </div>
      </div>

      {/* Regional Breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{isAr ? 'توزيع الميزانية حسب المنطقة' : 'Regional Budget Distribution'}</h3>
        <div className="space-y-4">
          {overview?.byRegion?.map((region) => (
            <div key={region.region} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{isAr ? `منطقة ${region.region}` : `${region.region} Region`}</span>
                <span className="font-bold text-gray-900">
                  {isAr ? 'ريال' : 'SAR'} {(region.total / 1000000).toFixed(1)}{isAr ? 'م' : 'M'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(region.total / overview.totalAllocated) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Budget Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Categories - Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'الميزانية حسب الفئة' : 'Budget by Category'}</h3>
          <Pie
            data={{
              labels: [isAr ? 'البنية التحتية' : 'Infrastructure', isAr ? 'تراخيص البرمجيات' : 'Software Licenses', isAr ? 'الاستشارات' : 'Consulting', isAr ? 'تكاليف الموظفين' : 'Staff Costs', isAr ? 'التدريب' : 'Training'],
              datasets: [{
                data: [850, 620, 480, 320, 180],
                backgroundColor: [
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(16, 185, 129, 0.8)',
                  'rgba(251, 146, 60, 0.8)',
                  'rgba(139, 92, 246, 0.8)',
                  'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#fff'
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 15,
                    font: { size: 12 }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.label}: ${isAr ? 'ريال' : 'SAR'} ${context.parsed}${isAr ? 'م' : 'M'}`
                  }
                }
              },
              animation: {
                animateScale: true,
                animateRotate: true,
                duration: 2000
              }
            }}
          />
        </motion.div>

        {/* Quarterly Trend - Line Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">{isAr ? 'اتجاه الإنفاق ربع السنوي' : 'Quarterly Spending Trend'}</h3>
          <Line
            data={{
              labels: [isAr ? 'الربع 1 2024' : 'Q1 2024', isAr ? 'الربع 2 2024' : 'Q2 2024', isAr ? 'الربع 3 2024' : 'Q3 2024', isAr ? 'الربع 4 2024' : 'Q4 2024'],
              datasets: [
                {
                  label: isAr ? 'المخصص' : 'Allocated',
                  data: [620, 680, 710, 780],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4,
                  fill: true
                },
                {
                  label: isAr ? 'المصروف' : 'Spent',
                  data: [580, 640, 670, 720],
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4,
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${isAr ? 'ريال' : 'SAR'} ${context.parsed.y}${isAr ? 'م' : 'M'}`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `${value}M`
                  }
                }
              },
              animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
              }
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default Budget
