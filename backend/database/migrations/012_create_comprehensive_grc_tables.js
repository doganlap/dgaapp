/**
 * Comprehensive GRC System Migration
 * 
 * Supports:
 * - 50+ Regulators in KSA
 * - 15 Sectors
 * - Rules, Frameworks, Controls
 * - Evidence Management
 * - Scope & Reports
 * - Assessments
 * - Risk Analysis & Planning
 * - Multi-regulator mapping per organization
 */

exports.up = async function(knex) {
  // 1. Regulators Table - All KSA regulators
  await knex.schema.createTable('grc_regulators', (table) => {
    table.increments('regulator_id').primary();
    table.string('regulator_code', 50).notNullable().unique();
    table.string('regulator_name_en', 255).notNullable();
    table.string('regulator_name_ar', 255).notNullable();
    table.text('description');
    table.string('website', 500);
    table.string('contact_email', 255);
    table.string('contact_phone', 50);
    table.enum('regulator_type', [
      'Government Authority',
      'Ministry',
      'Commission',
      'Center',
      'Agency',
      'Council',
      'Committee'
    ]).notNullable();
    table.enum('jurisdiction', [
      'National',
      'Regional',
      'Sector-Specific',
      'Cross-Sector'
    ]).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['regulator_code']);
    table.index(['regulator_type']);
    table.index(['jurisdiction']);
  });

  // 2. Sectors Table - 15 sectors
  await knex.schema.createTable('grc_sectors', (table) => {
    table.increments('sector_id').primary();
    table.string('sector_code', 50).notNullable().unique();
    table.string('sector_name_en', 255).notNullable();
    table.string('sector_name_ar', 255).notNullable();
    table.text('description');
    table.integer('priority').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['sector_code']);
  });

  // 3. Regulatory Frameworks/Rules Table
  await knex.schema.createTable('grc_frameworks', (table) => {
    table.increments('framework_id').primary();
    table.integer('regulator_id').notNullable().references('regulator_id').inTable('grc_regulators').onDelete('CASCADE');
    table.string('framework_code', 50).notNullable();
    table.string('framework_name_en', 255).notNullable();
    table.string('framework_name_ar', 255).notNullable();
    table.text('description');
    table.enum('framework_type', [
      'Law',
      'Regulation',
      'Standard',
      'Guideline',
      'Circular',
      'Directive',
      'Policy'
    ]).notNullable();
    table.date('effective_date');
    table.date('expiry_date');
    table.enum('compliance_level', [
      'Mandatory',
      'Recommended',
      'Optional',
      'Conditional'
    ]).notNullable();
    table.jsonb('applicable_sectors'); // Array of sector IDs
    table.jsonb('applicable_entity_types'); // Array of entity types
    table.text('legal_basis');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['regulator_id']);
    table.index(['framework_code']);
    table.index(['framework_type']);
    table.index(['compliance_level']);
  });

  // 4. Controls Table - Controls from frameworks
  await knex.schema.createTable('grc_controls', (table) => {
    table.increments('control_id').primary();
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.string('control_code', 100).notNullable();
    table.string('control_name_en', 255).notNullable();
    table.string('control_name_ar', 255).notNullable();
    table.text('description');
    table.text('control_statement');
    table.enum('control_type', [
      'Preventive',
      'Detective',
      'Corrective',
      'Compensating',
      'Administrative',
      'Technical',
      'Physical'
    ]).notNullable();
    table.enum('control_category', [
      'Access Control',
      'Data Protection',
      'Security',
      'Privacy',
      'Governance',
      'Operations',
      'Financial',
      'HR',
      'IT',
      'Legal',
      'Other'
    ]).notNullable();
    table.enum('priority', ['Critical', 'High', 'Medium', 'Low']).defaultTo('Medium');
    table.text('implementation_guidance');
    table.text('testing_procedures');
    table.boolean('is_mandatory').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['framework_id']);
    table.index(['control_code']);
    table.index(['control_type']);
    table.index(['control_category']);
  });

  // 5. Organization-Regulator Mapping - Which regulators apply to which organizations
  await knex.schema.createTable('grc_organization_regulators', (table) => {
    table.increments('mapping_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('regulator_id').notNullable().references('regulator_id').inTable('grc_regulators').onDelete('CASCADE');
    table.integer('sector_id').references('sector_id').inTable('grc_sectors');
    table.enum('applicability_reason', [
      'Sector-Based',
      'Legal-Size-Based',
      'Activity-Based',
      'Geographic',
      'Mandatory',
      'Voluntary',
      'Other'
    ]).notNullable();
    table.text('applicability_notes');
    table.date('effective_date');
    table.date('expiry_date');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['entity_id', 'regulator_id']);
    table.index(['entity_id']);
    table.index(['regulator_id']);
    table.index(['sector_id']);
  });

  // 6. Organization-Framework Mapping - Which frameworks apply
  await knex.schema.createTable('grc_organization_frameworks', (table) => {
    table.increments('mapping_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.enum('applicability_status', [
      'Applicable',
      'Not Applicable',
      'Under Review',
      'Conditional'
    ]).notNullable().defaultTo('Applicable');
    table.text('applicability_rationale');
    table.date('applicability_date');
    table.date('review_date');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['entity_id', 'framework_id']);
    table.index(['entity_id']);
    table.index(['framework_id']);
  });

  // 7. Enhanced Compliance Records - With regulator and framework
  await knex.schema.alterTable('compliance_records', (table) => {
    table.integer('regulator_id').references('regulator_id').inTable('grc_regulators').onDelete('SET NULL');
    table.integer('framework_id').references('framework_id').inTable('grc_frameworks').onDelete('SET NULL');
    table.integer('sector_id').references('sector_id').inTable('grc_sectors').onDelete('SET NULL');
    table.string('compliance_reference', 100); // Reference number from regulator
    table.enum('compliance_type', [
      'Full Compliance',
      'Partial Compliance',
      'Non-Compliance',
      'Exempt',
      'Not Applicable'
    ]);
    table.decimal('compliance_percentage', 5, 2); // 0-100%
    table.text('compliance_scope');
    table.text('non_compliance_details');
    table.text('remediation_plan');
    table.date('remediation_due_date');
    table.date('next_audit_date');
    table.integer('audit_frequency_months').defaultTo(12);
  });

  // 8. Control Assessments - Assessment of controls per organization
  await knex.schema.createTable('grc_control_assessments', (table) => {
    table.increments('assessment_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('control_id').notNullable().references('control_id').inTable('grc_controls').onDelete('CASCADE');
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.enum('assessment_status', [
      'Not Assessed',
      'In Progress',
      'Compliant',
      'Partially Compliant',
      'Non-Compliant',
      'Not Applicable'
    ]).notNullable().defaultTo('Not Assessed');
    table.enum('implementation_status', [
      'Not Implemented',
      'Planned',
      'In Progress',
      'Implemented',
      'Under Review',
      'Deprecated'
    ]).notNullable().defaultTo('Not Implemented');
    table.decimal('implementation_percentage', 5, 2).defaultTo(0);
    table.text('assessment_notes');
    table.text('findings');
    table.text('recommendations');
    table.date('assessment_date');
    table.date('next_assessment_date');
    table.uuid('assessed_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    table.index(['entity_id']);
    table.index(['control_id']);
    table.index(['framework_id']);
    table.index(['assessment_status']);
    table.index(['implementation_status']);
  });

  // 9. Evidence Management - Evidence for compliance
  await knex.schema.createTable('grc_evidence', (table) => {
    table.increments('evidence_id').primary();
    table.integer('assessment_id').references('assessment_id').inTable('grc_control_assessments').onDelete('CASCADE');
    table.integer('compliance_id').references('compliance_id').inTable('compliance_records').onDelete('CASCADE');
    table.string('evidence_type', 50).notNullable(); // Document, Screenshot, Report, Certificate, etc.
    table.string('evidence_name', 255).notNullable();
    table.text('description');
    table.string('file_path', 500);
    table.string('file_url', 500);
    table.string('file_type', 50); // pdf, docx, xlsx, png, etc.
    table.integer('file_size'); // bytes
    table.string('uploaded_by', 255);
    table.date('evidence_date');
    table.date('expiry_date');
    table.enum('evidence_status', [
      'Draft',
      'Submitted',
      'Approved',
      'Rejected',
      'Expired'
    ]).defaultTo('Draft');
    table.text('review_notes');
    table.timestamps(true, true);
    
    table.index(['assessment_id']);
    table.index(['compliance_id']);
    table.index(['evidence_type']);
    table.index(['evidence_status']);
  });

  // 10. Risk Analysis & Planning
  await knex.schema.alterTable('risks', (table) => {
    table.integer('regulator_id').references('regulator_id').inTable('grc_regulators').onDelete('SET NULL');
    table.integer('framework_id').references('framework_id').inTable('grc_frameworks').onDelete('SET NULL');
    table.integer('control_id').references('control_id').inTable('grc_controls').onDelete('SET NULL');
    table.enum('risk_category', [
      'Compliance Risk',
      'Regulatory Risk',
      'Operational Risk',
      'Financial Risk',
      'Reputational Risk',
      'Legal Risk',
      'Technology Risk',
      'Strategic Risk'
    ]);
    table.decimal('risk_score', 5, 2); // Calculated risk score
    table.decimal('likelihood', 3, 2); // 0-1
    table.decimal('impact', 3, 2); // 0-1
    table.text('risk_analysis');
    table.text('root_cause');
    table.text('mitigation_strategy');
    table.text('contingency_plan');
    table.date('mitigation_target_date');
    table.decimal('mitigation_budget', 15, 2);
    table.enum('mitigation_priority', ['Critical', 'High', 'Medium', 'Low']);
  });

  // 11. Implementation Plans - Planning and implementation tracking
  await knex.schema.createTable('grc_implementation_plans', (table) => {
    table.increments('plan_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.string('plan_name', 255).notNullable();
    table.text('description');
    table.enum('plan_status', [
      'Draft',
      'Approved',
      'In Progress',
      'On Hold',
      'Completed',
      'Cancelled'
    ]).notNullable().defaultTo('Draft');
    table.date('start_date');
    table.date('target_completion_date');
    table.date('actual_completion_date');
    table.decimal('budget_allocated', 15, 2).defaultTo(0);
    table.decimal('budget_spent', 15, 2).defaultTo(0);
    table.integer('completion_percentage').defaultTo(0);
    table.text('implementation_approach');
    table.text('challenges');
    table.text('lessons_learned');
    table.uuid('owner_id').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    table.index(['entity_id']);
    table.index(['framework_id']);
    table.index(['plan_status']);
  });

  // 12. Implementation Tasks - Tasks within plans
  await knex.schema.createTable('grc_implementation_tasks', (table) => {
    table.increments('task_id').primary();
    table.integer('plan_id').notNullable().references('plan_id').inTable('grc_implementation_plans').onDelete('CASCADE');
    table.integer('control_id').references('control_id').inTable('grc_controls').onDelete('SET NULL');
    table.string('task_name', 255).notNullable();
    table.text('description');
    table.enum('task_status', [
      'Not Started',
      'In Progress',
      'Completed',
      'Blocked',
      'Cancelled'
    ]).notNullable().defaultTo('Not Started');
    table.integer('priority').defaultTo(0);
    table.date('due_date');
    table.date('completed_date');
    table.integer('estimated_hours');
    table.integer('actual_hours');
    table.uuid('assigned_to').references('user_id').inTable('users');
    table.text('dependencies'); // JSON or text
    table.timestamps(true, true);
    
    table.index(['plan_id']);
    table.index(['control_id']);
    table.index(['task_status']);
    table.index(['assigned_to']);
  });

  // 13. Scope Definitions - Scope of compliance per organization
  await knex.schema.createTable('grc_compliance_scope', (table) => {
    table.increments('scope_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.text('scope_definition');
    table.jsonb('in_scope_areas'); // Array of areas/departments
    table.jsonb('out_of_scope_areas');
    table.text('scope_rationale');
    table.date('scope_effective_date');
    table.date('scope_review_date');
    table.enum('scope_status', [
      'Draft',
      'Approved',
      'Under Review',
      'Expired'
    ]).defaultTo('Draft');
    table.uuid('approved_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    table.index(['entity_id']);
    table.index(['framework_id']);
    table.unique(['entity_id', 'framework_id']);
  });

  // 14. Compliance Reports - Generated reports
  await knex.schema.createTable('grc_compliance_reports', (table) => {
    table.increments('report_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('regulator_id').references('regulator_id').inTable('grc_regulators').onDelete('SET NULL');
    table.integer('framework_id').references('framework_id').inTable('grc_frameworks').onDelete('SET NULL');
    table.string('report_type', 50).notNullable(); // Self-Assessment, Audit, Regulatory, Internal
    table.string('report_name', 255).notNullable();
    table.text('executive_summary');
    table.date('report_period_start');
    table.date('report_period_end');
    table.date('report_date');
    table.enum('report_status', [
      'Draft',
      'Under Review',
      'Approved',
      'Submitted',
      'Published'
    ]).defaultTo('Draft');
    table.decimal('overall_compliance_percentage', 5, 2);
    table.integer('total_controls_assessed');
    table.integer('compliant_controls');
    table.integer('non_compliant_controls');
    table.integer('partial_compliant_controls');
    table.text('key_findings');
    table.text('recommendations');
    table.string('file_path', 500);
    table.uuid('prepared_by').references('user_id').inTable('users');
    table.uuid('approved_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    table.index(['entity_id']);
    table.index(['regulator_id']);
    table.index(['framework_id']);
    table.index(['report_type']);
    table.index(['report_status']);
  });

  // 15. Regulatory Requirements Matrix - Requirements per organization
  await knex.schema.createTable('grc_requirements_matrix', (table) => {
    table.increments('matrix_id').primary();
    table.uuid('entity_id').notNullable().references('entity_id').inTable('dga_entities').onDelete('CASCADE');
    table.integer('regulator_id').notNullable().references('regulator_id').inTable('grc_regulators').onDelete('CASCADE');
    table.integer('framework_id').notNullable().references('framework_id').inTable('grc_frameworks').onDelete('CASCADE');
    table.integer('control_id').notNullable().references('control_id').inTable('grc_controls').onDelete('CASCADE');
    table.enum('requirement_status', [
      'Not Required',
      'Required',
      'Conditionally Required',
      'Under Review'
    ]).notNullable();
    table.text('requirement_rationale');
    table.text('applicability_factors'); // Sector, size, activity, etc.
    table.date('requirement_effective_date');
    table.date('requirement_expiry_date');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['entity_id', 'regulator_id', 'framework_id', 'control_id']);
    table.index(['entity_id']);
    table.index(['regulator_id']);
    table.index(['framework_id']);
    table.index(['control_id']);
  });

  console.log('✅ Comprehensive GRC tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('grc_requirements_matrix');
  await knex.schema.dropTableIfExists('grc_compliance_reports');
  await knex.schema.dropTableIfExists('grc_compliance_scope');
  await knex.schema.dropTableIfExists('grc_implementation_tasks');
  await knex.schema.dropTableIfExists('grc_implementation_plans');
  await knex.schema.dropTableIfExists('grc_evidence');
  await knex.schema.dropTableIfExists('grc_control_assessments');
  await knex.schema.dropTableIfExists('grc_organization_frameworks');
  await knex.schema.dropTableIfExists('grc_organization_regulators');
  await knex.schema.dropTableIfExists('grc_controls');
  await knex.schema.dropTableIfExists('grc_frameworks');
  await knex.schema.dropTableIfExists('grc_sectors');
  await knex.schema.dropTableIfExists('grc_regulators');
  
  // Remove added columns from existing tables
  await knex.schema.alterTable('compliance_records', (table) => {
    table.dropColumn('regulator_id');
    table.dropColumn('framework_id');
    table.dropColumn('sector_id');
    table.dropColumn('compliance_reference');
    table.dropColumn('compliance_type');
    table.dropColumn('compliance_percentage');
    table.dropColumn('compliance_scope');
    table.dropColumn('non_compliance_details');
    table.dropColumn('remediation_plan');
    table.dropColumn('remediation_due_date');
    table.dropColumn('next_audit_date');
    table.dropColumn('audit_frequency_months');
  });

  await knex.schema.alterTable('risks', (table) => {
    table.dropColumn('regulator_id');
    table.dropColumn('framework_id');
    table.dropColumn('control_id');
    table.dropColumn('risk_category');
    table.dropColumn('risk_score');
    table.dropColumn('likelihood');
    table.dropColumn('impact');
    table.dropColumn('risk_analysis');
    table.dropColumn('root_cause');
    table.dropColumn('mitigation_strategy');
    table.dropColumn('contingency_plan');
    table.dropColumn('mitigation_target_date');
    table.dropColumn('mitigation_budget');
    table.dropColumn('mitigation_priority');
  });

  console.log('✅ All GRC tables dropped successfully');
};

