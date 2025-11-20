import { NavLink } from 'react-router-dom'
import { useLocale } from '../context/LocaleContext'
import { 
  FiHome, 
  FiDatabase, 
  FiBox, 
  FiDollarSign, 
  FiBarChart2, 
  FiUsers,
  FiBriefcase,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiTarget,
  FiFileText,
  FiCheckSquare
} from 'react-icons/fi'

function Sidebar() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  
  const dgaNavItems = [
    { path: '/', label: isAr ? 'الصفحة الرئيسية' : 'Home', icon: FiHome },
    { path: '/dashboard', label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: FiBarChart2 },
    { path: '/entities', label: isAr ? 'الجهات' : 'Entities', icon: FiDatabase },
    { path: '/programs', label: isAr ? 'البرامج' : 'Programs', icon: FiBox },
    { path: '/budget', label: isAr ? 'الميزانية' : 'Budget', icon: FiDollarSign },
    { path: '/finance-demo', label: isAr ? 'التحكم المالي' : 'Finance Control', icon: FiBriefcase },
    { path: '/reports', label: isAr ? 'التقارير' : 'Reports', icon: FiBarChart2 },
    { path: '/users', label: isAr ? 'المستخدمون' : 'Users', icon: FiUsers },
  ]

  const grcNavItems = [
    { path: '/grc', label: isAr ? 'لوحة تحكم GRC' : 'GRC Dashboard', icon: FiShield },
    { path: '/grc/regulators', label: isAr ? 'الجهات التنظيمية' : 'Regulators', icon: FiShield },
    { path: '/grc/frameworks', label: isAr ? 'الأطر والقواعد' : 'Frameworks', icon: FiFileText },
    { path: '/grc/controls', label: isAr ? 'الضوابط' : 'Controls', icon: FiCheckSquare },
    { path: '/grc/reports', label: isAr ? 'التقارير' : 'Reports', icon: FiFileText },
    { path: '/grc/scoring', label: isAr ? 'التقييم والإرشاد' : 'Scoring & Guidance', icon: FiBarChart2 },
    { path: '/grc/journey', label: isAr ? 'الرحلة المرئية' : 'Visual Journey', icon: FiTarget },
    { path: '/grc/risks', label: isAr ? 'المخاطر' : 'Risks', icon: FiAlertTriangle },
    { path: '/grc/compliance', label: isAr ? 'الامتثال' : 'Compliance', icon: FiCheckCircle },
    { path: '/grc/insights', label: isAr ? 'الرؤى' : 'Insights', icon: FiTarget },
  ]

  return (
    <aside className="w-64 bg-dga-navy text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-dga-green">🏛️</span>
          {isAr ? 'منصة هيئة الحكومة الرقمية' : 'DGA Platform'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{isAr ? 'هيئة الحكومة الرقمية' : 'Digital Government Authority'}</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* DGA Section - Performance Monitoring */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-4">
            {isAr ? 'المراقبة والأداء' : 'Performance Monitoring'}
          </h3>
          <p className="text-xs text-gray-500 mb-3 px-4">
            {isAr ? 'هيئة الحكومة الرقمية' : 'DGA Oversight'}
          </p>
          <div className="space-y-2">
            {dgaNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-dga-green text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="text-xl" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* GRC Section - Governance, Risk & Compliance */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 px-4">
            {isAr ? 'الحوكمة والمخاطر والامتثال' : 'GRC'}
          </h3>
          <p className="text-xs text-gray-500 mb-3 px-4">
            {isAr ? 'إنتاج - جاهز للاستخدام' : 'Production - Ready'}
          </p>
          <div className="space-y-2">
            {grcNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/grc'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-dga-green text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="text-xl" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <p>{isAr ? 'الإصدار 1.0.0' : 'Version 1.0.0'}</p>
          <p>{isAr ? '© 2025 هيئة الحكومة الرقمية' : '© 2025 DGA'}</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
