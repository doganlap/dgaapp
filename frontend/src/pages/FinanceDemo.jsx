import { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { FiDollarSign, FiFileText, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import api from '../api';

export default function FinanceDemo() {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  
  const [summary, setSummary] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        console.log('Loading finance data...');
        
        // Load data sequentially to avoid rate limiting
        const summaryRes = await api.get('/dga/finance/summary');
        setSummary(summaryRes.data.data);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const contractsRes = await api.get('/dga/finance/contracts');
        setContracts(contractsRes.data.data.slice(0,5));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const invoicesRes = await api.get('/dga/finance/invoices');
        setInvoices(invoicesRes.data.data);
        
        console.log('Finance data loaded successfully');
      } catch (error) {
        console.error('Finance demo API error:', error);
        console.error('Error details:', error.response?.data, error.message);
        
        // Use realistic mock data for demo
        setSummary({
          budget_allocated: 5200000000,
          budget_spent: 4530000000,
          utilization_pct: 87,
          active_contracts: 158,
          contract_value: 6380000000,
          total_invoiced: 6280000000
        });
        
        setContracts([
          {
            contract_number: 'DGA-C-2025-001',
            entity: 'Ministry of Health',
            vendor: 'Tech Solutions Co.',
            service_description: 'Digital Health Platform',
            contract_value: 45000000,
            status: 'Active'
          },
          {
            contract_number: 'DGA-C-2025-002',
            entity: 'Municipality of Riyadh',
            vendor: 'Smart City Systems',
            service_description: 'Citizen Portal Development',
            contract_value: 32000000,
            status: 'Active'
          }
        ]);
        
        setInvoices([
          {
            invoice_number: 'INV-DGA-C-2025-001-1',
            entity: 'Ministry of Health',
            vendor: 'Tech Solutions Co.',
            amount: 15000000,
            due_date: '2025-12-31',
            status: 'Paid'
          },
          {
            invoice_number: 'INV-DGA-C-2025-002-1',
            entity: 'Municipality of Riyadh',
            vendor: 'Smart City Systems',
            amount: 8000000,
            due_date: '2025-12-15',
            status: 'Pending'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFinanceData();
  }, []);

  if (loading) return (
    <div className="p-6 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p>{isAr ? 'جاري تحميل بيانات المالية...' : 'Loading finance data...'}</p>
    </div>
  );

  if (!summary) return (
    <div className="p-6 text-center text-red-600">
      <p>{isAr ? 'فشل تحميل بيانات المالية' : 'Failed to load finance data'}</p>
      <button onClick={() => window.location.reload()} className="btn-primary mt-4">
        {isAr ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );

  const stats = [
    { 
      label: isAr ? 'الميزانية المخصصة' : 'Budget Allocated', 
      value: summary ? `SAR ${(summary.budget_allocated/1e6).toFixed(0)}M` : '0',
      icon: FiDollarSign,
      color: 'bg-blue-500'
    },
    { 
      label: isAr ? 'الميزانية المصروفة' : 'Budget Spent', 
      value: summary ? `SAR ${(summary.budget_spent/1e6).toFixed(0)}M` : '0',
      icon: FiTrendingUp,
      color: 'bg-green-500'
    },
    { 
      label: isAr ? 'معدل الاستفادة' : 'Utilization Rate', 
      value: summary ? `${summary.utilization_pct}%` : '0%',
      icon: FiTrendingUp,
      color: 'bg-yellow-500'
    },
    { 
      label: isAr ? 'العقود النشطة' : 'Active Contracts', 
      value: summary?.active_contracts || '0',
      icon: FiFileText,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isAr ? 'التحكم المالي' : 'Finance Control Center'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAr ? 'نظرة عامة على الميزانية والعقود والفواتير' : 'Overview of budget, contracts and invoices'}
          </p>
        </div>
        <button 
          onClick={() => window.open('http://localhost:5000/dga/finance/invoices?format=csv','_blank')}
          className="btn-primary flex items-center gap-2"
        >
          <FiFileText /> {isAr ? 'تصدير CSV' : 'Export CSV'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isAr ? 'العقود الحديثة' : 'Recent Contracts'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">{isAr ? 'رقم العقد' : 'Contract #'}</th>
                <th className="text-left py-3">{isAr ? 'الجهة' : 'Entity'}</th>
                <th className="text-left py-3">{isAr ? 'المورد' : 'Vendor'}</th>
                <th className="text-left py-3">{isAr ? 'الخدمة' : 'Service'}</th>
                <th className="text-left py-3">{isAr ? 'القيمة' : 'Value'}</th>
                <th className="text-left py-3">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.contract_number} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{c.contract_number}</td>
                  <td className="py-2">{c.entity}</td>
                  <td className="py-2">{c.vendor}</td>
                  <td className="py-2 text-gray-600">{c.service_description}</td>
                  <td className="py-2 font-semibold">SAR {(c.contract_value/1e6).toFixed(1)}M</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      c.status==='Active'?'bg-green-100 text-green-700':
                      c.status==='Under Review'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-700'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isAr ? 'الفواتير الحديثة' : 'Recent Invoices'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th className="text-left py-3">{isAr ? 'الجهة' : 'Entity'}</th>
                <th className="text-left py-3">{isAr ? 'المورد' : 'Vendor'}</th>
                <th className="text-left py-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="text-left py-3">{isAr ? 'الاستحقاق' : 'Due Date'}</th>
                <th className="text-left py-3">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(i => (
                <tr key={i.invoice_number} className="border-b hover:bg-gray-50">
                  <td className="py-2 font-mono text-xs">{i.invoice_number}</td>
                  <td className="py-2">{i.entity}</td>
                  <td className="py-2">{i.vendor}</td>
                  <td className="py-2 font-semibold">SAR {(i.amount/1e3).toFixed(0)}K</td>
                  <td className="py-2">{new Date(i.due_date).toLocaleDateString()}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      i.status==='Paid'?'bg-green-100 text-green-700':
                      i.status==='Overdue'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'
                    }`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}