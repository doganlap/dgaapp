import React, { useState, useEffect } from 'react';
import { comprehensiveGrcAPI, entityAPI } from '../../api';
import DataTable from '../../components/DataTable';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [entities, setEntities] = useState([]);
  const [regulators, setRegulators] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    entity_id: '',
    regulator_id: '',
    framework_id: '',
    report_type: 'Self-Assessment',
  });
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(() => {
    loadReports();
    loadEntities();
    loadRegulators();
    loadFrameworks();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await comprehensiveGrcAPI.getComplianceReports();
      if (response.data.success) {
        setReports(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      const response = await entityAPI.getAll();
      if (response.data.success) {
        setEntities(response.data.data || []);
      } else {
        setEntities(response.data || []);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  const loadRegulators = async () => {
    try {
      const response = await comprehensiveGrcAPI.getAllRegulators();
      if (response.data.success) {
        setRegulators(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading regulators:', error);
    }
  };

  const loadFrameworks = async () => {
    try {
      const response = await comprehensiveGrcAPI.getAllFrameworks();
      if (response.data.success) {
        setFrameworks(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading frameworks:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!generateForm.entity_id) {
      alert('Please select an organization');
      return;
    }

    setGenerating(true);
    try {
      const response = await comprehensiveGrcAPI.generateComplianceReport(generateForm);
      if (response.data.success) {
        setGeneratedReport(response.data.data);
        setShowGenerateModal(false);
        loadReports();
        alert('Report generated successfully!');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report: ' + (error.response?.data?.message || error.message));
    } finally {
      setGenerating(false);
    }
  };

  const exportToPDF = (report) => {
    // TODO: Implement PDF export
    alert('PDF export coming soon!');
  };

  const exportToExcel = (report) => {
    // TODO: Implement Excel export
    alert('Excel export coming soon!');
  };

  const columns = [
    { key: 'report_name', label: 'Report Name', sortable: true },
    { key: 'entity_name_en', label: 'Organization', sortable: true },
    { key: 'regulator_name_en', label: 'Regulator', sortable: true },
    { key: 'framework_name_en', label: 'Framework', sortable: true },
    { key: 'report_type', label: 'Type', sortable: true },
    { 
      key: 'overall_compliance_percentage', 
      label: 'Compliance %', 
      sortable: true,
      render: (value) => value ? `${value.toFixed(1)}%` : 'N/A'
    },
    { key: 'report_status', label: 'Status', sortable: true },
    { key: 'report_date', label: 'Date', sortable: true, render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => exportToPDF(row)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            PDF
          </button>
          <button
            onClick={() => exportToExcel(row)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            Excel
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GRC Compliance Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate New Report
        </button>
      </div>

      {generatedReport && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-bold text-green-800 mb-2">Report Generated Successfully!</h3>
          <p className="text-sm text-green-700">
            Report: {generatedReport.report.report_name}
          </p>
          <p className="text-sm text-green-700">
            Compliance: {generatedReport.metrics.compliancePercentage}%
          </p>
          <button
            onClick={() => setGeneratedReport(null)}
            className="mt-2 text-sm text-green-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : (
        <DataTable
          data={reports}
          columns={columns}
          searchable
          sortable
          pagination
          pageSize={10}
        />
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Generate Compliance Report</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Organization *</label>
                <select
                  value={generateForm.entity_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, entity_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Select Organization</option>
                  {entities.map((entity) => (
                    <option key={entity.entity_id} value={entity.entity_id}>
                      {entity.entity_name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Regulator (Optional)</label>
                <select
                  value={generateForm.regulator_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, regulator_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Regulators</option>
                  {regulators.map((regulator) => (
                    <option key={regulator.regulator_id} value={regulator.regulator_id}>
                      {regulator.regulator_name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Framework (Optional)</label>
                <select
                  value={generateForm.framework_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, framework_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Frameworks</option>
                  {frameworks.map((framework) => (
                    <option key={framework.framework_id} value={framework.framework_id}>
                      {framework.framework_name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Report Type</label>
                <select
                  value={generateForm.report_type}
                  onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="Self-Assessment">Self-Assessment</option>
                  <option value="Audit">Audit</option>
                  <option value="Regulatory">Regulatory</option>
                  <option value="Internal">Internal</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

