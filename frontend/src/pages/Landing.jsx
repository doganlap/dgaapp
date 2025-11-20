import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiTrendingUp, 
  FiShield, 
  FiBarChart2, 
  FiUsers, 
  FiFileText,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiArrowRight,
  FiTarget,
  FiAward,
  FiGlobe,
  FiZap
} from 'react-icons/fi';
import { useLocale } from '../context/LocaleContext';

function Landing() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  const navigate = useNavigate();
  
  const [dgaExpanded, setDgaExpanded] = useState(false);
  const [grcExpanded, setGrcExpanded] = useState(false);

  const dgaCapabilities = [
    {
      icon: FiBarChart2,
      title: isAr ? 'مراقبة الأداء' : 'Performance Monitoring',
      description: isAr 
        ? 'تتبع شامل لمؤشرات الأداء الرئيسية لجميع الكيانات الحكومية'
        : 'Comprehensive tracking of key performance indicators for all government entities'
    },
    {
      icon: FiTrendingUp,
      title: isAr ? 'تحليلات متقدمة' : 'Advanced Analytics',
      description: isAr
        ? 'رؤى تنبؤية وتقارير تفصيلية لاتخاذ قرارات مدروسة'
        : 'Predictive insights and detailed reports for informed decision-making'
    },
    {
      icon: FiUsers,
      title: isAr ? 'إدارة الكيانات' : 'Entity Management',
      description: isAr
        ? 'إدارة 158 كيان حكومي عبر 5 مناطق في المملكة'
        : 'Manage 158 government entities across 5 regions in the Kingdom'
    },
    {
      icon: FiTarget,
      title: isAr ? 'تتبع البرامج' : 'Program Tracking',
      description: isAr
        ? 'مراقبة ومتابعة برامج التحول الرقمي والمشاريع'
        : 'Monitor and track digital transformation programs and projects'
    },
    {
      icon: FiAward,
      title: isAr ? 'التقارير التنفيذية' : 'Executive Reports',
      description: isAr
        ? 'تقارير شاملة للمستويات التنفيذية والإدارية'
        : 'Comprehensive reports for executive and administrative levels'
    },
    {
      icon: FiGlobe,
      title: isAr ? 'التغطية الكاملة' : '100% Coverage',
      description: isAr
        ? 'تغطية كاملة لجميع الكيانات الحكومية في المملكة'
        : 'Complete coverage of all government entities in the Kingdom'
    }
  ];

  const grcCapabilities = [
    {
      icon: FiShield,
      title: isAr ? 'إدارة الامتثال' : 'Compliance Management',
      description: isAr
        ? 'إدارة الامتثال مع 71 جهة تنظيمية و15 قطاع في المملكة'
        : 'Manage compliance with 71 regulators and 15 sectors in the Kingdom'
    },
    {
      icon: FiCheckCircle,
      title: isAr ? 'الإطارات والضوابط' : 'Frameworks & Controls',
      description: isAr
        ? 'إدارة الإطارات التنظيمية والضوابط والامتثال'
        : 'Manage regulatory frameworks, controls, and compliance'
    },
    {
      icon: FiFileText,
      title: isAr ? 'التقييمات وال evidence' : 'Assessments & Evidence',
      description: isAr
        ? 'تقييمات شاملة وإدارة الأدلة والوثائق'
        : 'Comprehensive assessments and evidence management'
    },
    {
      icon: FiUsers,
      title: isAr ? 'التعيين التلقائي' : 'Auto-Assignment',
      description: isAr
        ? 'تعيين تلقائي لعدة مسؤولين بناءً على الدور والمنطقة'
        : 'Automatic assignment of multiple responsible persons based on role and region'
    },
    {
      icon: FiTarget,
      title: isAr ? 'تتبع SLA' : 'SLA Tracking',
      description: isAr
        ? 'مراقبة اتفاقيات مستوى الخدمة والامتثال'
        : 'Monitor service level agreements and compliance'
    },
    {
      icon: FiZap,
      title: isAr ? 'الإجراءات القائمة على الدور' : 'Role-Based Actions',
      description: isAr
        ? 'إجراءات تلقائية مخصصة حسب الدور والقطاع'
        : 'Automated actions customized by role and sector'
    }
  ];

  const dgaValue = [
    isAr ? 'مراقبة شاملة لـ 158 كيان حكومي' : 'Comprehensive monitoring of 158 government entities',
    isAr ? 'تتبع 300+ برنامج تحول رقمي' : 'Track 300+ digital transformation programs',
    isAr ? 'تقارير تنفيذية في الوقت الفعلي' : 'Real-time executive reporting',
    isAr ? 'تحليلات تنبؤية للتنبؤ بالأداء' : 'Predictive analytics for performance forecasting',
    isAr ? 'إدارة الميزانية والموارد' : 'Budget and resource management'
  ];

  const grcValue = [
    isAr ? 'إدارة 71 جهة تنظيمية سعودية' : 'Manage 71 Saudi regulators',
    isAr ? '15 قطاع مع إطارات وضوابط مخصصة' : '15 sectors with customized frameworks and controls',
    isAr ? 'تعيين تلقائي متعدد المسؤولين' : 'Automatic multi-responsible assignment',
    isAr ? 'تتبع SLA والامتثال في الوقت الفعلي' : 'Real-time SLA and compliance tracking',
    isAr ? 'تقارير امتثال شاملة' : 'Comprehensive compliance reports'
  ];

  const dgaScenarios = [
    {
      title: isAr ? 'مراقبة الأداء' : 'Performance Monitoring',
      description: isAr
        ? 'تتبع مؤشرات الأداء الرئيسية لجميع الكيانات الحكومية في الوقت الفعلي'
        : 'Track key performance indicators for all government entities in real-time'
    },
    {
      title: isAr ? 'إدارة البرامج' : 'Program Management',
      description: isAr
        ? 'إدارة ومتابعة برامج التحول الرقمي والمشاريع الاستراتيجية'
        : 'Manage and track digital transformation programs and strategic projects'
    },
    {
      title: isAr ? 'التقارير التنفيذية' : 'Executive Reporting',
      description: isAr
        ? 'إنشاء تقارير تنفيذية شاملة للمستويات الإدارية العليا'
        : 'Generate comprehensive executive reports for senior management levels'
    }
  ];

  const grcScenarios = [
    {
      title: isAr ? 'إدارة الامتثال' : 'Compliance Management',
      description: isAr
        ? 'إدارة الامتثال مع الجهات التنظيمية المتعددة والإطارات المختلفة'
        : 'Manage compliance with multiple regulators and various frameworks'
    },
    {
      title: isAr ? 'التعيين التلقائي' : 'Auto-Assignment',
      description: isAr
        ? 'تعيين تلقائي للمسؤولين بناءً على القطاع والمنطقة والدور'
        : 'Automatic assignment of responsible persons based on sector, region, and role'
    },
    {
      title: isAr ? 'تتبع SLA' : 'SLA Tracking',
      description: isAr
        ? 'مراقبة اتفاقيات مستوى الخدمة والامتثال في الوقت الفعلي'
        : 'Monitor service level agreements and compliance in real-time'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {isAr ? 'منصة رقابة الهيئة الرقمية للحكومة' : 'Digital Government Authority Oversight Platform'}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {isAr
              ? 'منصة شاملة لمراقبة وإدارة التحول الرقمي والامتثال التنظيمي لجميع الكيانات الحكومية في المملكة'
              : 'Comprehensive platform for monitoring and managing digital transformation and regulatory compliance for all government entities in the Kingdom'}
          </p>
        </div>

        {/* DGA Module Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setDgaExpanded(!dgaExpanded)}
            className="w-full px-8 py-6 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            <div className="flex items-center gap-4">
              <FiBarChart2 className="text-3xl" />
              <div className="text-left">
                <h2 className="text-2xl font-bold">
                  {isAr ? 'وحدة مراقبة الأداء (DGA)' : 'Performance Monitoring Module (DGA)'}
                </h2>
                <p className="text-blue-100 text-sm">
                  {isAr ? 'مراقبة شاملة للأداء والبرامج والمشاريع' : 'Comprehensive performance, program, and project monitoring'}
                </p>
              </div>
            </div>
            {dgaExpanded ? (
              <FiChevronUp className="text-2xl" />
            ) : (
              <FiChevronDown className="text-2xl" />
            )}
          </button>

          {dgaExpanded && (
            <div className="p-8 space-y-8">
              {/* Capabilities */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiTarget className="text-blue-600" />
                  {isAr ? 'القدرات' : 'Capabilities'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dgaCapabilities.map((cap, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <cap.icon className="text-3xl text-blue-600 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{cap.title}</h4>
                      <p className="text-gray-600 text-sm">{cap.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Value Proposition */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiAward className="text-blue-600" />
                  {isAr ? 'القيمة المضافة' : 'Value Proposition'}
                </h3>
                <ul className="space-y-3">
                  {dgaValue.map((value, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <FiCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                      <span className="text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Use Cases */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiGlobe className="text-blue-600" />
                  {isAr ? 'سيناريوهات الاستخدام' : 'Use Cases'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dgaScenarios.map((scenario, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{scenario.title}</h4>
                      <p className="text-gray-600 text-sm">{scenario.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => navigate('/dga/dashboard')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {isAr ? 'الانتقال إلى DGA' : 'Go to DGA Module'}
                  <FiArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GRC Module Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setGrcExpanded(!grcExpanded)}
            className="w-full px-8 py-6 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all"
          >
            <div className="flex items-center gap-4">
              <FiShield className="text-3xl" />
              <div className="text-left">
                <h2 className="text-2xl font-bold">
                  {isAr ? 'وحدة الحوكمة والمخاطر والامتثال (GRC)' : 'Governance, Risk & Compliance Module (GRC)'}
                </h2>
                <p className="text-purple-100 text-sm">
                  {isAr ? 'إدارة شاملة للامتثال التنظيمي والضوابط' : 'Comprehensive regulatory compliance and controls management'}
                </p>
              </div>
            </div>
            {grcExpanded ? (
              <FiChevronUp className="text-2xl" />
            ) : (
              <FiChevronDown className="text-2xl" />
            )}
          </button>

          {grcExpanded && (
            <div className="p-8 space-y-8">
              {/* Capabilities */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiTarget className="text-purple-600" />
                  {isAr ? 'القدرات' : 'Capabilities'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {grcCapabilities.map((cap, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <cap.icon className="text-3xl text-purple-600 mb-4" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{cap.title}</h4>
                      <p className="text-gray-600 text-sm">{cap.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Value Proposition */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiAward className="text-purple-600" />
                  {isAr ? 'القيمة المضافة' : 'Value Proposition'}
                </h3>
                <ul className="space-y-3">
                  {grcValue.map((value, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <FiCheckCircle className="text-green-500 text-xl mt-1 flex-shrink-0" />
                      <span className="text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Use Cases */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FiGlobe className="text-purple-600" />
                  {isAr ? 'سيناريوهات الاستخدام' : 'Use Cases'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {grcScenarios.map((scenario, index) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-600">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{scenario.title}</h4>
                      <p className="text-gray-600 text-sm">{scenario.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => navigate('/grc/dashboard')}
                  className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  {isAr ? 'الانتقال إلى GRC' : 'Go to GRC Module'}
                  <FiArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {isAr ? 'معلومات المنصة' : 'Platform Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">158</div>
              <div className="text-gray-600">
                {isAr ? 'كيان حكومي' : 'Government Entities'}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">71</div>
              <div className="text-gray-600">
                {isAr ? 'جهة تنظيمية' : 'Regulators'}
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">15</div>
              <div className="text-gray-600">
                {isAr ? 'قطاع' : 'Sectors'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;

