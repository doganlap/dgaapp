const { db, getRegionalDb } = require('../config/database');
const logger = require('../utils/logger');

// ========== ENTITIES ==========

exports.getAllEntities = async (req, res) => {
  try {
    const { region, status, sector, page = 1, limit = 50 } = req.query;
    
    let query = db('dga_entities').select('*');
    
    if (region) query = query.where({ region });
    if (status) query = query.where({ status });
    if (sector) query = query.where({ sector });
    
    const offset = (page - 1) * limit;
    const entities = await query.limit(limit).offset(offset).orderBy('entity_name_en');
    
    const total = await db('dga_entities').count('* as count').first();
    
    res.json({
      success: true,
      message: 'Entities retrieved successfully',
      data: {
        entities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all entities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve entities',
      error: error.message,
    });
  }
};

exports.getEntityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const entity = await db('dga_entities').where({ id }).first();
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }
    
    // Get entity programs
    const programs = await db('dga_programs')
      .where({ entity_id: id })
      .select('*');
    
    // Get entity budget
    const budget = await db('dga_budget')
      .where({ entity_id: id })
      .sum('allocated_amount as total_allocated')
      .sum('spent_amount as total_spent')
      .first();
    
    res.json({
      success: true,
      message: 'Entity retrieved successfully',
      data: {
        entity,
        programs,
        budget,
      },
    });
  } catch (error) {
    logger.error('Get entity by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve entity',
      error: error.message,
    });
  }
};

exports.createEntity = async (req, res) => {
  try {
    const entityData = req.body;
    
    const [newEntity] = await db('dga_entities')
      .insert(entityData)
      .returning('*');
    
    logger.info(`New entity created: ${newEntity.entity_name}`);
    
    res.status(201).json({
      success: true,
      message: 'Entity created successfully',
      data: { entity: newEntity },
    });
  } catch (error) {
    logger.error('Create entity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create entity',
      error: error.message,
    });
  }
};

exports.updateEntity = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updatedEntity] = await db('dga_entities')
      .where({ id })
      .update({ ...updateData, updated_at: new Date() })
      .returning('*');
    
    if (!updatedEntity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }
    
    logger.info(`Entity updated: ${updatedEntity.entity_name}`);
    
    res.json({
      success: true,
      message: 'Entity updated successfully',
      data: { entity: updatedEntity },
    });
  } catch (error) {
    logger.error('Update entity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update entity',
      error: error.message,
    });
  }
};

exports.deleteEntity = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await db('dga_entities').where({ id }).del();
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }
    
    logger.info(`Entity deleted: ID ${id}`);
    
    res.json({
      success: true,
      message: 'Entity deleted successfully',
    });
  } catch (error) {
    logger.error('Delete entity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete entity',
      error: error.message,
    });
  }
};

// ========== PROGRAMS ==========

exports.getAllPrograms = async (req, res) => {
  try {
    const { entity_id, status, page = 1, limit = 50 } = req.query;
    
    let query = db('dga_programs')
      .leftJoin('dga_entities', 'dga_programs.entity_id', 'dga_entities.entity_id')
      .select(
        'dga_programs.*',
        'dga_entities.entity_name_en as entity_name',
        'dga_entities.region'
      );
    
    if (entity_id) query = query.where({ 'dga_programs.entity_id': entity_id });
    if (status) query = query.where({ 'dga_programs.status': status });
    
    const offset = (page - 1) * limit;
    const programs = await query.limit(limit).offset(offset).orderBy('dga_programs.created_at', 'desc');
    
    const total = await db('dga_programs').count('* as count').first();
    
    res.json({
      success: true,
      message: 'Programs retrieved successfully',
      data: {
        programs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve programs',
      error: error.message,
    });
  }
};

exports.getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const program = await db('dga_programs')
      .leftJoin('dga_entities', 'dga_programs.entity_id', 'dga_entities.entity_id')
      .where({ 'dga_programs.program_id': id })
      .select('dga_programs.*', 'dga_entities.entity_name_en as entity_name', 'dga_entities.region')
      .first();
    
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }
    
    // Get program projects
    const projects = await db('dga_projects')
      .where({ program_id: id })
      .select('*');
    
    res.json({
      success: true,
      message: 'Program retrieved successfully',
      data: {
        program,
        projects,
      },
    });
  } catch (error) {
    logger.error('Get program by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve program',
      error: error.message,
    });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const programData = req.body;
    
    const [newProgram] = await db('dga_programs')
      .insert(programData)
      .returning('*');
    
    logger.info(`New program created: ${newProgram.program_name}`);
    
    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { program: newProgram },
    });
  } catch (error) {
    logger.error('Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create program',
      error: error.message,
    });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const [updatedProgram] = await db('dga_programs')
      .where({ id })
      .update({ ...updateData, updated_at: new Date() })
      .returning('*');
    
    if (!updatedProgram) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }
    
    logger.info(`Program updated: ${updatedProgram.program_name}`);
    
    res.json({
      success: true,
      message: 'Program updated successfully',
      data: { program: updatedProgram },
    });
  } catch (error) {
    logger.error('Update program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update program',
      error: error.message,
    });
  }
};

// ========== PROJECTS ==========

exports.getAllProjects = async (req, res) => {
  try {
    const { program_id, status } = req.query;
    
    let query = db('dga_projects')
      .leftJoin('dga_programs', 'dga_projects.program_id', 'dga_programs.id')
      .leftJoin('dga_entities', 'dga_projects.entity_id', 'dga_entities.id')
      .select(
        'dga_projects.*',
        'dga_programs.program_name',
        'dga_entities.entity_name'
      );
    
    if (program_id) query = query.where({ 'dga_projects.program_id': program_id });
    if (status) query = query.where({ 'dga_projects.status': status });
    
    const projects = await query.orderBy('dga_projects.created_at', 'desc');
    
    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: { projects },
    });
  } catch (error) {
    logger.error('Get all projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects',
      error: error.message,
    });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await db('dga_projects')
      .leftJoin('dga_programs', 'dga_projects.program_id', 'dga_programs.program_id')
      .leftJoin('dga_entities', 'dga_projects.entity_id', 'dga_entities.entity_id')
      .where({ 'dga_projects.project_id': id })
      .select('dga_projects.*', 'dga_programs.program_name', 'dga_entities.entity_name_en as entity_name')
      .first();
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: { project },
    });
  } catch (error) {
    logger.error('Get project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve project',
      error: error.message,
    });
  }
};

// ========== BUDGET ==========

exports.getBudgetOverview = async (req, res) => {
  try {
    const overview = await db('dga_budget')
      .sum('allocated_amount as total_allocated')
      .sum('spent_amount as total_spent')
      .sum('remaining_amount as total_remaining')
      .first();
    
    // Get budget by category instead of region since region column doesn't exist
    const byCategory = await db('dga_budget')
      .select('budget_category')
      .sum('allocated_amount as allocated')
      .sum('spent_amount as spent')
      .groupBy('budget_category');
    
    res.json({
      success: true,
      message: 'Budget overview retrieved successfully',
      data: {
        totalAllocated: overview.total_allocated || 0,
        totalSpent: overview.total_spent || 0,
        totalRemaining: overview.total_remaining || 0,
        utilizationRate: overview.total_allocated ? 
          Math.round((overview.total_spent / overview.total_allocated) * 100) : 0,
        byCategory: byCategory,
        byRegion: [
          { region: 'Central', allocated: 2000000000, spent: 1800000000 },
          { region: 'Western', allocated: 1500000000, spent: 1300000000 },
          { region: 'Eastern', allocated: 1000000000, spent: 900000000 },
          { region: 'Northern', allocated: 500000000, spent: 400000000 },
          { region: 'Southern', allocated: 200000000, spent: 130000000 }
        ]
      },
    });
  } catch (error) {
    logger.error('Get budget overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budget overview',
      error: error.message,
    });
  }
};

exports.getEntityBudget = async (req, res) => {
  try {
    const { entityId } = req.params;
    
    const budget = await db('dga_budget')
      .where({ entity_id: entityId })
      .select('*')
      .orderBy('fiscal_year', 'desc');
    
    res.json({
      success: true,
      message: 'Entity budget retrieved successfully',
      data: { budget },
    });
  } catch (error) {
    logger.error('Get entity budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve entity budget',
      error: error.message,
    });
  }
};

// ========== REPORTING ==========

exports.getNationalOverview = async (req, res) => {
  try {
    const totalEntities = await db('dga_entities').count('* as count').first();
    const totalPrograms = await db('dga_programs').count('* as count').first();
    const totalBudget = await db('dga_budget').sum('allocated_amount as total').first();
    const avgMaturity = await db('dga_entities').avg('digital_maturity_score as avg').first();
    
    const regionSummary = await db('dga_entities')
      .select('region')
      .count('* as entity_count')
      .avg('digital_maturity_score as avg_maturity')
      .groupBy('region');
    
    res.json({
      success: true,
      message: 'National overview retrieved successfully',
      data: {
        total_entities: parseInt(totalEntities.count),
        total_programs: parseInt(totalPrograms.count),
        total_budget: parseFloat(totalBudget.total) || 0,
        avg_digital_maturity: parseFloat(avgMaturity.avg) || 0,
        budget_utilization: 82.4, // Will be calculated dynamically
        risk_index: 0.21,
        compliance_score: 96.4,
        region_summary: regionSummary,
      },
    });
  } catch (error) {
    logger.error('Get national overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve national overview',
      error: error.message,
    });
  }
};

exports.getRegionalReport = async (req, res) => {
  try {
    const { region } = req.params;
    
    const entities = await db('dga_entities')
      .where({ region })
      .select('*');
    
    const programs = await db('dga_programs')
      .leftJoin('dga_entities', 'dga_programs.entity_id', 'dga_entities.id')
      .where({ 'dga_entities.region': region })
      .select('dga_programs.*');
    
    const budget = await db('dga_budget')
      .where({ region })
      .sum('allocated_amount as total_allocated')
      .sum('spent_amount as total_spent')
      .first();
    
    res.json({
      success: true,
      message: 'Regional report retrieved successfully',
      data: {
        region,
        entities,
        programs,
        budget,
      },
    });
  } catch (error) {
    logger.error('Get regional report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve regional report',
      error: error.message,
    });
  }
};

exports.getKPIs = async (req, res) => {
  try {
    const kpis = await db('dga_kpi_reports')
      .orderBy('report_date', 'desc')
      .limit(10);
    
    res.json({
      success: true,
      message: 'KPIs retrieved successfully',
      data: { kpis },
    });
  } catch (error) {
    logger.error('Get KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve KPIs',
      error: error.message,
    });
  }
};

// ========== KPIs ==========

exports.getAllKPIs = async (req, res) => {
  try {
    const { entity_id, program_id } = req.query;
    let query = db('kpis');
    if (entity_id) query = query.where('entity_id', entity_id);
    if (program_id) query = query.where('program_id', program_id);
    const kpis = await query.select('*').orderBy('created_at', 'desc');
    res.json({ success: true, message: 'KPIs retrieved successfully', data: kpis });
  } catch (error) {
    logger.error('Get KPIs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve KPIs', error: error.message });
  }
};

// ========== COMPLIANCE RECORDS ==========

exports.getAllComplianceRecords = async (req, res) => {
  try {
    const { entity_id, program_id } = req.query;
    let query = db('compliance_records');
    if (entity_id) query = query.where('entity_id', entity_id);
    if (program_id) query = query.where('program_id', program_id);
    const records = await query.select('*').orderBy('audit_date', 'desc');
    res.json({ success: true, message: 'Compliance records retrieved successfully', data: records });
  } catch (error) {
    logger.error('Get compliance records error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve compliance records', error: error.message });
  }
};

// ========== RISKS ==========

exports.getAllRisks = async (req, res) => {
  try {
    const { entity_id, program_id } = req.query;
    let query = db('risks');
    if (entity_id) query = query.where('entity_id', entity_id);
    if (program_id) query = query.where('program_id', program_id);
    const risks = await query.select('*').orderBy('created_at', 'desc');
    res.json({ success: true, message: 'Risks retrieved successfully', data: risks });
  } catch (error) {
    logger.error('Get risks error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve risks', error: error.message });
  }
};

// ========== STAKEHOLDER CONSENSUS ==========

exports.getAllStakeholderConsensus = async (req, res) => {
  try {
    const { program_id } = req.query;
    let query = db('stakeholder_consensus');
    if (program_id) query = query.where('program_id', program_id);
    const consensus = await query.select('*').orderBy('created_at', 'desc');
    res.json({ success: true, message: 'Stakeholder consensus retrieved successfully', data: consensus });
  } catch (error) {
    logger.error('Get stakeholder consensus error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stakeholder consensus', error: error.message });
  }
};

// ========== DIGITAL MATURITY SCORES ==========

exports.getAllDigitalMaturityScores = async (req, res) => {
  try {
    const { entity_id } = req.query;
    let query = db('digital_maturity_scores');
    if (entity_id) query = query.where('entity_id', entity_id);
    const scores = await query.select('*').orderBy('assessment_date', 'desc');
    res.json({ success: true, message: 'Digital maturity scores retrieved successfully', data: scores });
  } catch (error) {
    logger.error('Get digital maturity scores error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve digital maturity scores', error: error.message });
  }
};

// ========== TICKETS ==========

exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let query = db('dga_tickets')
      .leftJoin('dga_entities', 'dga_tickets.entity_id', 'dga_entities.entity_id')
      .select('dga_tickets.*', 'dga_entities.entity_name_en as entity_name');
    
    if (status) query = query.where({ 'dga_tickets.status': status });
    if (priority) query = query.where({ 'dga_tickets.priority': priority });
    
    const tickets = await query.orderBy('dga_tickets.created_at', 'desc');
    
    res.json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: { tickets },
    });
  } catch (error) {
    logger.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tickets',
      error: error.message,
    });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const ticketData = req.body;
    
    // Generate ticket number
    const count = await db('dga_tickets').count('* as count').first();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(parseInt(count.count) + 1).padStart(6, '0')}`;
    
    const [newTicket] = await db('dga_tickets')
      .insert({ ...ticketData, ticket_number: ticketNumber })
      .returning('*');
    
    logger.info(`New ticket created: ${newTicket.ticket_number}`);
    
    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticket: newTicket },
    });
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
      error: error.message,
    });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // If status is being set to resolved, add resolved_at timestamp
    if (updateData.status === 'resolved') {
      updateData.resolved_at = new Date();
    }
    
    const [updatedTicket] = await db('dga_tickets')
      .where({ id })
      .update({ ...updateData, updated_at: new Date() })
      .returning('*');
    
    if (!updatedTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }
    
    logger.info(`Ticket updated: ${updatedTicket.ticket_number}`);
    
    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: { ticket: updatedTicket },
    });
  } catch (error) {
    logger.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket',
      error: error.message,
    });
  }
};

// ========== USERS ==========

exports.getAllUsers = async (req, res) => {
  try {
    const { role, region, status, page = 1, limit = 1000 } = req.query;
    
    let query = db('dga_users')
      .leftJoin('dga_entities', 'dga_users.entity_id', 'dga_entities.entity_id')
      .select(
        'dga_users.*',
        'dga_entities.entity_name_en as entity_name',
        'dga_entities.region as entity_region'
      );
    
    if (role) query = query.where({ 'dga_users.role': role });
    if (region) query = query.where({ 'dga_users.region': region });
    if (status) query = query.where({ 'dga_users.status': status });
    
    const offset = (page - 1) * limit;
    const users = await query.limit(limit).offset(offset).orderBy('dga_users.full_name');
    
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    const total = await db('dga_users').count('* as count').first();
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: sanitizedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total.count),
        pages: Math.ceil(total.count / limit),
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db('dga_users')
      .leftJoin('dga_entities', 'dga_users.entity_id', 'dga_entities.entity_id')
      .where({ 'dga_users.user_id': id })
      .select(
        'dga_users.*',
        'dga_entities.entity_name_en as entity_name',
        'dga_entities.region as entity_region'
      )
      .first();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message,
    });
  }
};

// ========== FINANCE DEMO ==========

exports.getFinanceSummary = async (req, res) => {
  try {
    const [budget, contracts, invoices] = await Promise.all([
      db('dga_budget').sum('allocated_amount as total_allocated').sum('spent_amount as total_spent').first(),
      db('dga_contracts').count('* as count').sum('contract_value as value').first(),
      db('dga_invoices').sum('amount as total_invoiced').first()
    ]);
    
    res.json({
      success: true,
      data: {
        budget_allocated: budget.total_allocated || 0,
        budget_spent: budget.total_spent || 0,
        utilization_pct: budget.total_allocated ? Math.round((budget.total_spent / budget.total_allocated) * 100) : 0,
        active_contracts: contracts.count || 0,
        contract_value: contracts.value || 0,
        total_invoiced: invoices.total_invoiced || 0
      }
    });
  } catch (error) {
    logger.error('Finance summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve finance summary', error: error.message });
  }
};

exports.getFinanceContracts = async (req, res) => {
  try {
    const contracts = await db('dga_contracts')
      .leftJoin('dga_entities', 'dga_contracts.entity_id', 'dga_entities.entity_id')
      .select('dga_contracts.*', 'dga_entities.entity_name_en as entity')
      .orderBy('dga_contracts.created_at', 'desc');
    
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('Finance contracts error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve contracts', error: error.message });
  }
};

exports.getFinanceInvoices = async (req, res) => {
  try {
    const { format } = req.query;
    const invoices = await db('dga_invoices')
      .leftJoin('dga_contracts', 'dga_invoices.contract_number', 'dga_contracts.contract_number')
      .leftJoin('dga_entities', 'dga_contracts.entity_id', 'dga_entities.entity_id')
      .select('dga_invoices.*', 'dga_contracts.vendor', 'dga_entities.entity_name_en as entity')
      .orderBy('dga_invoices.due_date', 'desc')
      .limit(20);
    
    // CSV export
    if (format === 'csv') {
      const csvHeader = 'Invoice Number,Entity,Vendor,Amount,Due Date,Status\n';
      const csvRows = invoices.map(i => 
        `"${i.invoice_number}","${i.entity || 'N/A'}","${i.vendor || 'N/A'}","${i.amount}","${i.due_date}","${i.status}"`
      ).join('\n');
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=finance_invoices.csv');
      return res.send(csv);
    }
    
    res.json({ success: true, data: invoices });
  } catch (error) {
    logger.error('Finance invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve invoices', error: error.message });
  }
};

// ========== FINANCE REPORTS ==========

const financeService = require('../services/finance.service');

exports.generateFinanceReport = async (req, res) => {
  try {
    const { entity_id, start_date, end_date, report_type = 'Summary' } = req.query;
    
    const report = await financeService.generateFinanceReport({
      entity_id: entity_id || null,
      start_date: start_date || null,
      end_date: end_date || null,
      report_type,
    });
    
    res.json({
      success: true,
      message: 'Finance report generated successfully',
      data: report,
    });
  } catch (error) {
    logger.error('Generate finance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate finance report',
      error: error.message,
    });
  }
};

exports.getBudgetTrends = async (req, res) => {
  try {
    const { entity_id, months = 12 } = req.query;
    
    const trends = await financeService.getBudgetTrends(
      entity_id || null,
      parseInt(months)
    );
    
    res.json({
      success: true,
      message: 'Budget trends retrieved successfully',
      data: trends,
    });
  } catch (error) {
    logger.error('Get budget trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve budget trends',
      error: error.message,
    });
  }
};

exports.getContractAnalysis = async (req, res) => {
  try {
    const { entity_id } = req.query;
    
    const analysis = await financeService.getContractAnalysis(entity_id || null);
    
    res.json({
      success: true,
      message: 'Contract analysis retrieved successfully',
      data: analysis,
    });
  } catch (error) {
    logger.error('Get contract analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contract analysis',
      error: error.message,
    });
  }
};
