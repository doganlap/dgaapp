/**
 * Finance Service
 * 
 * Handles finance operations:
 * - Budget analysis
 * - Contract management
 * - Invoice tracking
 * - Financial reporting
 */

const { db } = require('../config/database');
const logger = require('../utils/logger');

class FinanceService {
  /**
   * Generate comprehensive finance report
   */
  async generateFinanceReport(options = {}) {
    try {
      const {
        entity_id = null,
        start_date = null,
        end_date = null,
        report_type = 'Summary',
      } = options;

      // Build date filter
      let dateFilter = {};
      if (start_date) {
        dateFilter.start = new Date(start_date);
      }
      if (end_date) {
        dateFilter.end = new Date(end_date);
      }

      // Get budget summary
      let budgetQuery = db('dga_budget');
      if (entity_id) {
        budgetQuery = budgetQuery.where({ entity_id });
      }
      if (dateFilter.start) {
        budgetQuery = budgetQuery.where('budget_year', '>=', dateFilter.start.getFullYear());
      }
      if (dateFilter.end) {
        budgetQuery = budgetQuery.where('budget_year', '<=', dateFilter.end.getFullYear());
      }

      const budgetSummary = await budgetQuery
        .select(
          db.raw('SUM(allocated_amount) as total_allocated'),
          db.raw('SUM(spent_amount) as total_spent'),
          db.raw('COUNT(*) as budget_items')
        )
        .first();

      // Get contracts summary
      let contractsQuery = db('dga_contracts');
      if (entity_id) {
        contractsQuery = contractsQuery.where({ entity_id });
      }
      if (dateFilter.start) {
        contractsQuery = contractsQuery.where('start_date', '>=', dateFilter.start);
      }
      if (dateFilter.end) {
        contractsQuery = contractsQuery.where('start_date', '<=', dateFilter.end);
      }

      const contractsSummary = await contractsQuery
        .select(
          db.raw('COUNT(*) as total_contracts'),
          db.raw('SUM(contract_value) as total_contract_value'),
          db.raw('COUNT(CASE WHEN contract_status = \'Active\' THEN 1 END) as active_contracts'),
          db.raw('COUNT(CASE WHEN contract_status = \'Expired\' THEN 1 END) as expired_contracts')
        )
        .first();

      // Get invoices summary
      let invoicesQuery = db('dga_invoices');
      if (dateFilter.start) {
        invoicesQuery = invoicesQuery.where('created_at', '>=', dateFilter.start);
      }
      if (dateFilter.end) {
        invoicesQuery = invoicesQuery.where('created_at', '<=', dateFilter.end);
      }

      const invoicesSummary = await invoicesQuery
        .select(
          db.raw('COUNT(*) as total_invoices'),
          db.raw('SUM(amount) as total_invoiced'),
          db.raw('SUM(CASE WHEN status = \'Paid\' THEN amount ELSE 0 END) as total_paid'),
          db.raw('SUM(CASE WHEN status = \'Pending\' THEN amount ELSE 0 END) as total_pending'),
          db.raw('SUM(CASE WHEN status = \'Overdue\' THEN amount ELSE 0 END) as total_overdue')
        )
        .first();

      // Calculate utilization
      const totalAllocated = parseFloat(budgetSummary?.total_allocated || 0);
      const totalSpent = parseFloat(budgetSummary?.total_spent || 0);
      const utilizationPercentage = totalAllocated > 0
        ? (totalSpent / totalAllocated) * 100
        : 0;

      // Get entity breakdown if entity_id not specified
      let entityBreakdown = [];
      if (!entity_id) {
        entityBreakdown = await db('dga_budget')
          .select(
            'dga_entities.entity_id',
            'dga_entities.entity_name_en',
            'dga_entities.entity_name_ar',
            db.raw('SUM(dga_budget.allocated_amount) as allocated'),
            db.raw('SUM(dga_budget.spent_amount) as spent')
          )
          .leftJoin('dga_entities', 'dga_budget.entity_id', 'dga_entities.entity_id')
          .groupBy('dga_entities.entity_id', 'dga_entities.entity_name_en', 'dga_entities.entity_name_ar')
          .orderBy('allocated', 'desc')
          .limit(10);
      }

      // Get recent contracts
      let recentContractsQuery = db('dga_contracts')
        .leftJoin('dga_entities', 'dga_contracts.entity_id', 'dga_entities.entity_id')
        .select(
          'dga_contracts.*',
          'dga_entities.entity_name_en',
          'dga_entities.entity_name_ar'
        )
        .orderBy('dga_contracts.created_at', 'desc')
        .limit(10);

      if (entity_id) {
        recentContractsQuery = recentContractsQuery.where({ 'dga_contracts.entity_id': entity_id });
      }

      const recentContracts = await recentContractsQuery;

      // Get outstanding invoices
      const outstandingInvoices = await db('dga_invoices')
        .leftJoin('dga_contracts', 'dga_invoices.contract_number', 'dga_contracts.contract_number')
        .leftJoin('dga_entities', 'dga_contracts.entity_id', 'dga_entities.entity_id')
        .select(
          'dga_invoices.*',
          'dga_contracts.vendor',
          'dga_entities.entity_name_en',
          'dga_entities.entity_name_ar'
        )
        .whereIn('dga_invoices.status', ['Pending', 'Overdue'])
        .orderBy('dga_invoices.due_date', 'asc')
        .limit(20);

      // Generate executive summary
      const executiveSummary = `Finance Report Summary:
- Total Budget Allocated: SAR ${(totalAllocated / 1e9).toFixed(2)}B
- Total Budget Spent: SAR ${(totalSpent / 1e9).toFixed(2)}B
- Utilization Rate: ${utilizationPercentage.toFixed(1)}%
- Active Contracts: ${contractsSummary?.active_contracts || 0}
- Total Contract Value: SAR ${((contractsSummary?.total_contract_value || 0) / 1e9).toFixed(2)}B
- Outstanding Invoices: ${outstandingInvoices.length} (SAR ${((invoicesSummary?.total_pending || 0) + (invoicesSummary?.total_overdue || 0)) / 1e6).toFixed(2)}M)`;

      // Key findings
      const findings = [];
      if (utilizationPercentage > 90) {
        findings.push('Budget utilization exceeds 90% - consider budget review');
      }
      if (utilizationPercentage < 50) {
        findings.push('Budget utilization below 50% - underutilization detected');
      }
      if ((invoicesSummary?.total_overdue || 0) > 0) {
        findings.push(`${outstandingInvoices.filter(i => i.status === 'Overdue').length} overdue invoices require immediate attention`);
      }
      if ((contractsSummary?.expired_contracts || 0) > 0) {
        findings.push(`${contractsSummary.expired_contracts} expired contracts need renewal or closure`);
      }

      // Recommendations
      const recommendations = [];
      if (utilizationPercentage > 85) {
        recommendations.push('Review budget allocation for next period');
      }
      if (outstandingInvoices.length > 10) {
        recommendations.push('Implement invoice payment tracking system');
      }
      if ((contractsSummary?.expired_contracts || 0) > 5) {
        recommendations.push('Review and renew expired contracts');
      }

      return {
        report_type,
        report_period: {
          start_date: dateFilter.start || null,
          end_date: dateFilter.end || null,
        },
        summary: {
          budget: {
            total_allocated: totalAllocated,
            total_spent: totalSpent,
            utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
            budget_items: parseInt(budgetSummary?.budget_items || 0),
          },
          contracts: {
            total_contracts: parseInt(contractsSummary?.total_contracts || 0),
            active_contracts: parseInt(contractsSummary?.active_contracts || 0),
            expired_contracts: parseInt(contractsSummary?.expired_contracts || 0),
            total_contract_value: parseFloat(contractsSummary?.total_contract_value || 0),
          },
          invoices: {
            total_invoices: parseInt(invoicesSummary?.total_invoices || 0),
            total_invoiced: parseFloat(invoicesSummary?.total_invoiced || 0),
            total_paid: parseFloat(invoicesSummary?.total_paid || 0),
            total_pending: parseFloat(invoicesSummary?.total_pending || 0),
            total_overdue: parseFloat(invoicesSummary?.total_overdue || 0),
          },
        },
        entity_breakdown: entityBreakdown.map(e => ({
          entity_id: e.entity_id,
          entity_name_en: e.entity_name_en,
          entity_name_ar: e.entity_name_ar,
          allocated: parseFloat(e.allocated || 0),
          spent: parseFloat(e.spent || 0),
          utilization: e.allocated > 0 ? parseFloat(((e.spent / e.allocated) * 100).toFixed(2)) : 0,
        })),
        recent_contracts: recentContracts.map(c => ({
          contract_number: c.contract_number,
          entity_name_en: c.entity_name_en,
          vendor: c.vendor,
          contract_value: parseFloat(c.contract_value || 0),
          contract_status: c.status,
          contract_start_date: c.start_date,
          contract_end_date: c.end_date,
        })),
        outstanding_invoices: outstandingInvoices.map(i => ({
          invoice_number: i.invoice_number,
          entity_name_en: i.entity_name_en,
          vendor: i.vendor,
          amount: parseFloat(i.amount || 0),
          due_date: i.due_date,
          status: i.status,
        })),
        executive_summary,
        key_findings: findings.join('\n'),
        recommendations: recommendations.join('\n'),
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Generate finance report error:', error);
      throw error;
    }
  }

  /**
   * Get budget trends over time
   */
  async getBudgetTrends(entity_id = null, months = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let query = db('dga_budget')
        .select(
          db.raw('EXTRACT(YEAR FROM created_at) as year'),
          db.raw('EXTRACT(MONTH FROM created_at) as month'),
          db.raw('SUM(allocated_amount) as allocated'),
          db.raw('SUM(spent_amount) as spent')
        )
        .where('created_at', '>=', startDate)
        .where('created_at', '<=', endDate)
        .groupBy('year', 'month')
        .orderBy('year', 'asc')
        .orderBy('month', 'asc');

      if (entity_id) {
        query = query.where({ entity_id });
      }

      const trends = await query;

      return trends.map(t => ({
        period: `${t.year}-${String(t.month).padStart(2, '0')}`,
        allocated: parseFloat(t.allocated || 0),
        spent: parseFloat(t.spent || 0),
        utilization: t.allocated > 0 ? parseFloat(((t.spent / t.allocated) * 100).toFixed(2)) : 0,
      }));
    } catch (error) {
      logger.error('Get budget trends error:', error);
      throw error;
    }
  }

  /**
   * Get contract analysis
   */
  async getContractAnalysis(entity_id = null) {
    try {
      let query = db('dga_contracts')
        .select(
          'contract_status',
          db.raw('COUNT(*) as count'),
          db.raw('SUM(contract_value) as total_value')
        )
        .groupBy('contract_status');

      if (entity_id) {
        query = query.where({ entity_id });
      }

      const analysis = await query;

      return analysis.map(a => ({
        status: a.contract_status,
        count: parseInt(a.count || 0),
        total_value: parseFloat(a.total_value || 0),
      }));
    } catch (error) {
      logger.error('Get contract analysis error:', error);
      throw error;
    }
  }
}

module.exports = new FinanceService();

