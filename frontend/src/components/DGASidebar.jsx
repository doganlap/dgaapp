import { NavLink } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';
import { 
  FiHome, 
  FiDatabase, 
  FiBox, 
  FiDollarSign, 
  FiBarChart2, 
  FiUsers,
  FiBriefcase
} from 'react-icons/fi';

function DGASidebar() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  const navItems = [
    { path: '/dga/dashboard', label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: FiHome },
    { path: '/dga/entities', label: isAr ? 'الجهات' : 'Entities', icon: FiDatabase },
    { path: '/dga/programs', label: isAr ? 'البرامج' : 'Programs', icon: FiBox },
    { path: '/dga/budget', label: isAr ? 'الميزانية' : 'Budget', icon: FiDollarSign },
    { path: '/dga/finance-demo', label: isAr ? 'التحكم المالي' : 'Finance Control', icon: FiBriefcase },
    { path: '/dga/reports', label: isAr ? 'التقارير' : 'Reports', icon: FiBarChart2 },
    { path: '/dga/users', label: isAr ? 'المستخدمون' : 'Users', icon: FiUsers },
  ];

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col shadow-lg">
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-blue-300">📊</span>
          {isAr ? 'مراقبة الأداء' : 'Performance Monitoring'}
        </h1>
        <p className="text-sm text-blue-200 mt-1">
          {isAr ? 'وحدة DGA' : 'DGA Module'}
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
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <item.icon className="text-xl" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-blue-800">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
        >
          <FiHome className="text-xl" />
          <span className="font-medium">{isAr ? 'الصفحة الرئيسية' : 'Home'}</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default DGASidebar;

