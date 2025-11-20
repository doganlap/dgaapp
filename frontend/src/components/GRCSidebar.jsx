import { NavLink } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { 
  FiHome,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiTarget,
  FiFileText,
  FiCheckSquare,
  FiBarChart2
} from 'react-icons/fi';

function GRCSidebar() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  const navItems = [
    { path: '/grc/dashboard', label: isAr ? 'لوحة تحكم GRC' : 'GRC Dashboard', icon: FiShield },
    { path: '/grc/regulators', label: isAr ? 'الجهات التنظيمية' : 'Regulators', icon: FiShield },
    { path: '/grc/frameworks', label: isAr ? 'الأطر والقواعد' : 'Frameworks', icon: FiFileText },
    { path: '/grc/controls', label: isAr ? 'الضوابط' : 'Controls', icon: FiCheckSquare },
    { path: '/grc/reports', label: isAr ? 'التقارير' : 'Reports', icon: FiFileText },
    { path: '/grc/scoring', label: isAr ? 'التقييم والإرشاد' : 'Scoring & Guidance', icon: FiBarChart2 },
    { path: '/grc/journey', label: isAr ? 'الرحلة المرئية' : 'Visual Journey', icon: FiTarget },
    { path: '/grc/risks', label: isAr ? 'المخاطر' : 'Risks', icon: FiAlertTriangle },
    { path: '/grc/compliance', label: isAr ? 'الامتثال' : 'Compliance', icon: FiCheckCircle },
    { path: '/grc/insights', label: isAr ? 'الرؤى' : 'Insights', icon: FiTarget },
  ];

  return (
    <aside className="w-64 bg-purple-900 text-white flex flex-col shadow-lg">
      <div className="p-6 border-b border-purple-800">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-purple-300">🛡️</span>
          {isAr ? 'الحوكمة والمخاطر والامتثال' : 'Governance, Risk & Compliance'}
        </h1>
        <p className="text-sm text-purple-200 mt-1">
          {isAr ? 'وحدة GRC' : 'GRC Module'}
        </p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-purple-100 hover:bg-purple-800 hover:text-white'
              }`
            }
          >
            <item.icon className="text-xl" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-purple-800">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-purple-800 hover:text-white transition-colors"
        >
          <FiHome className="text-xl" />
          <span className="font-medium">{isAr ? 'الصفحة الرئيسية' : 'Home'}</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default GRCSidebar;

