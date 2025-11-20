/**
 * Migration: Add Multi-Responsible Assignment, SLA Tracking, and Role-Based Actions
 * 
 * Enhances:
 * - grc_implementation_plans: Multiple responsible persons, SLA tracking
 * - grc_implementation_tasks: Multiple assignees, SLA tracking, role-based actions
 * - New table: grc_task_assignments (many-to-many for tasks)
 * - New table: grc_sla_tracking (SLA monitoring)
 * - New table: grc_role_actions (role-based action assignments)
 */

exports.up = async function(knex) {
  // 1. Add multiple responsible persons and SLA fields to implementation_plans
  await knex.schema.alterTable('grc_implementation_plans', (table) => {
    // Multiple responsible persons (JSON array of user_ids)
    table.jsonb('responsible_persons').defaultTo('[]'); // Array of {user_id, role, responsibility_type}
    // SLA tracking
    table.integer('sla_target_days').defaultTo(30); // Target completion in days
    table.date('sla_start_date');
    table.date('sla_target_date');
    table.date('sla_actual_completion_date');
    table.enum('sla_status', ['On Track', 'At Risk', 'Breached', 'Completed']).defaultTo('On Track');
    table.decimal('sla_compliance_percentage', 5, 2).defaultTo(100); // % of SLA compliance
    // Auto-assignment metadata
    table.jsonb('auto_assignment_rules').defaultTo('{}'); // Rules used for auto-assignment
    table.timestamp('last_auto_assignment_at');
  });

  // 2. Add multiple assignees and SLA fields to implementation_tasks
  await knex.schema.alterTable('grc_implementation_tasks', (table) => {
    // Keep single assigned_to for backward compatibility, but add multiple assignees
    table.jsonb('assignees').defaultTo('[]'); // Array of {user_id, role, assignment_type, assigned_at}
    // SLA tracking
    table.integer('sla_target_hours').defaultTo(8); // Target completion in hours
    table.timestamp('sla_start_time');
    table.timestamp('sla_target_time');
    table.timestamp('sla_actual_completion_time');
    table.enum('sla_status', ['On Track', 'At Risk', 'Breached', 'Completed']).defaultTo('On Track');
    table.decimal('sla_compliance_percentage', 5, 2).defaultTo(100);
    // Role-based actions
    table.jsonb('required_roles').defaultTo('[]'); // Array of roles required for this task
    table.jsonb('role_actions').defaultTo('{}'); // Map of role -> allowed actions
    // Auto-assignment
    table.boolean('auto_assigned').defaultTo(false);
    table.jsonb('auto_assignment_rules').defaultTo('{}');
    table.timestamp('auto_assigned_at');
  });

  // 3. Create task assignments table (many-to-many for detailed tracking)
  await knex.schema.createTable('grc_task_assignments', (table) => {
    table.increments('assignment_id').primary();
    table.integer('task_id').notNullable().references('task_id').inTable('grc_implementation_tasks').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.enum('assignment_type', [
      'Primary',
      'Secondary',
      'Reviewer',
      'Approver',
      'Observer',
      'Escalation'
    ]).notNullable().defaultTo('Primary');
    table.enum('assignment_status', [
      'Assigned',
      'Accepted',
      'In Progress',
      'Completed',
      'Rejected',
      'Transferred'
    ]).notNullable().defaultTo('Assigned');
    table.string('user_role', 50); // Role at time of assignment
    table.text('assignment_notes');
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.timestamp('accepted_at');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.boolean('is_auto_assigned').defaultTo(false);
    table.jsonb('auto_assignment_reason').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['task_id']);
    table.index(['user_id']);
    table.index(['assignment_status']);
    table.index(['assignment_type']);
    table.unique(['task_id', 'user_id']); // One assignment per user per task
  });

  // 4. Create SLA tracking table for detailed monitoring
  await knex.schema.createTable('grc_sla_tracking', (table) => {
    table.increments('sla_id').primary();
    table.string('item_type', 50).notNullable(); // 'plan', 'task', 'assessment', 'evidence'
    table.integer('item_id').notNullable(); // ID of the item
    table.string('sla_name', 255).notNullable();
    table.text('sla_description');
    table.integer('sla_target_days').notNullable();
    table.integer('sla_target_hours');
    table.timestamp('sla_start_time').notNullable();
    table.timestamp('sla_target_time').notNullable();
    table.timestamp('sla_actual_completion_time');
    table.enum('sla_status', [
      'On Track',
      'At Risk',
      'Breached',
      'Completed',
      'Cancelled'
    ]).notNullable().defaultTo('On Track');
    table.decimal('sla_compliance_percentage', 5, 2).defaultTo(100);
    table.integer('days_remaining');
    table.integer('days_overdue');
    table.text('breach_reason');
    table.jsonb('escalation_history').defaultTo('[]'); // Array of escalations
    table.uuid('assigned_to').references('user_id').inTable('users');
    table.jsonb('responsible_persons').defaultTo('[]');
    table.timestamps(true, true);
    
    table.index(['item_type', 'item_id']);
    table.index(['sla_status']);
    table.index(['sla_target_time']);
    table.index(['assigned_to']);
  });

  // 5. Create role-based action assignments table
  await knex.schema.createTable('grc_role_actions', (table) => {
    table.increments('role_action_id').primary();
    table.string('action_type', 100).notNullable(); // 'task_assignment', 'plan_approval', 'evidence_review', etc.
    table.string('action_name', 255).notNullable();
    table.text('action_description');
    table.enum('user_role', [
      'dga_admin',
      'regional_manager',
      'program_director',
      'financial_controller',
      'compliance_auditor',
      'analytics_lead',
      'ministry_user'
    ]).notNullable();
    table.string('entity_sector', 100); // Optional: sector-specific
    table.string('entity_region', 50); // Optional: region-specific
    table.enum('priority', ['Critical', 'High', 'Medium', 'Low']).defaultTo('Medium');
    table.boolean('is_mandatory').defaultTo(false);
    table.boolean('requires_approval').defaultTo(false);
    table.integer('auto_assign_threshold').defaultTo(0); // Auto-assign if workload < threshold
    table.jsonb('assignment_rules').defaultTo('{}'); // Rules for auto-assignment
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['action_type']);
    table.index(['user_role']);
    table.index(['is_active']);
  });

  // 6. Create internal actions tracking table
  await knex.schema.createTable('grc_internal_actions', (table) => {
    table.increments('action_id').primary();
    table.string('action_type', 100).notNullable(); // 'review', 'approve', 'escalate', 'reassign', etc.
    table.string('action_name', 255).notNullable();
    table.text('action_description');
    table.string('item_type', 50).notNullable(); // 'plan', 'task', 'assessment', 'evidence'
    table.integer('item_id').notNullable();
    table.uuid('initiated_by').notNullable().references('user_id').inTable('users');
    table.jsonb('assigned_to').defaultTo('[]'); // Array of user_ids
    table.enum('action_status', [
      'Pending',
      'In Progress',
      'Completed',
      'Rejected',
      'Cancelled'
    ]).notNullable().defaultTo('Pending');
    table.enum('priority', ['Critical', 'High', 'Medium', 'Low']).defaultTo('Medium');
    table.timestamp('due_date');
    table.timestamp('completed_at');
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['action_type']);
    table.index(['item_type', 'item_id']);
    table.index(['action_status']);
    table.index(['initiated_by']);
    table.index(['due_date']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('grc_internal_actions');
  await knex.schema.dropTableIfExists('grc_role_actions');
  await knex.schema.dropTableIfExists('grc_sla_tracking');
  await knex.schema.dropTableIfExists('grc_task_assignments');
  
  await knex.schema.alterTable('grc_implementation_tasks', (table) => {
    table.dropColumn('assignees');
    table.dropColumn('sla_target_hours');
    table.dropColumn('sla_start_time');
    table.dropColumn('sla_target_time');
    table.dropColumn('sla_actual_completion_time');
    table.dropColumn('sla_status');
    table.dropColumn('sla_compliance_percentage');
    table.dropColumn('required_roles');
    table.dropColumn('role_actions');
    table.dropColumn('auto_assigned');
    table.dropColumn('auto_assignment_rules');
    table.dropColumn('auto_assigned_at');
  });
  
  await knex.schema.alterTable('grc_implementation_plans', (table) => {
    table.dropColumn('responsible_persons');
    table.dropColumn('sla_target_days');
    table.dropColumn('sla_start_date');
    table.dropColumn('sla_target_date');
    table.dropColumn('sla_actual_completion_date');
    table.dropColumn('sla_status');
    table.dropColumn('sla_compliance_percentage');
    table.dropColumn('auto_assignment_rules');
    table.dropColumn('last_auto_assignment_at');
  });
};

