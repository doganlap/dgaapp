/**
 * Seed: GRC Role Actions
 *
 * Seeds role-based action rules for auto-assignment and workflow management.
 */

exports.seed = async function(knex) {
  // Delete existing data
  await knex('grc_role_actions').del();

  const roleActions = [
    // DGA Admin Actions
    {
      action_type: 'plan_approval',
      action_name: 'Approve Implementation Plan',
      action_description: 'Approve GRC implementation plans for any entity',
      user_role: 'dga_admin',
      priority: 'High',
      is_mandatory: true,
      requires_approval: false,
      auto_assign_threshold: 10,
      assignment_rules: {
        workload_based: true,
        priority_based: true,
      },
      is_active: true,
    },
    {
      action_type: 'task_assignment',
      action_name: 'Assign Critical Tasks',
      action_description: 'Assign critical priority tasks to DGA admins',
      user_role: 'dga_admin',
      priority: 'Critical',
      is_mandatory: false,
      requires_approval: false,
      auto_assign_threshold: 5,
      assignment_rules: {
        priority_filter: 'Critical',
        workload_based: true,
      },
      is_active: true,
    },

    // Regional Manager Actions
    {
      action_type: 'plan_approval',
      action_name: 'Approve Regional Plans',
      action_description: 'Approve implementation plans for entities in assigned region',
      user_role: 'regional_manager',
      entity_region: 'Central',
      priority: 'High',
      is_mandatory: true,
      requires_approval: false,
      auto_assign_threshold: 8,
      assignment_rules: {
        region_match: true,
        workload_based: true,
      },
      is_active: true,
    },
    {
      action_type: 'task_assignment',
      action_name: 'Assign Regional Tasks',
      action_description: 'Assign tasks to regional managers based on entity region',
      user_role: 'regional_manager',
      priority: 'Medium',
      is_mandatory: false,
      requires_approval: false,
      auto_assign_threshold: 10,
      assignment_rules: {
        region_match: true,
        entity_match: false,
        workload_based: true,
      },
      is_active: true,
    },

    // Program Director Actions
    {
      action_type: 'plan_ownership',
      action_name: 'Own Implementation Plans',
      action_description: 'Primary owner of implementation plans for assigned entity',
      user_role: 'program_director',
      priority: 'High',
      is_mandatory: true,
      requires_approval: false,
      auto_assign_threshold: 15,
      assignment_rules: {
        entity_match: true,
        workload_based: true,
        priority_based: true,
      },
      is_active: true,
    },
    {
      action_type: 'task_assignment',
      action_name: 'Assign Entity Tasks',
      action_description: 'Assign tasks to program directors for their entities',
      user_role: 'program_director',
      priority: 'Medium',
      is_mandatory: false,
      requires_approval: false,
      auto_assign_threshold: 20,
      assignment_rules: {
        entity_match: true,
        workload_based: true,
      },
      is_active: true,
    },

    // Compliance Auditor Actions
    {
      action_type: 'evidence_review',
      action_name: 'Review Compliance Evidence',
      action_description: 'Review and validate compliance evidence documents',
      user_role: 'compliance_auditor',
      priority: 'High',
      is_mandatory: true,
      requires_approval: false,
      auto_assign_threshold: 12,
      assignment_rules: {
        sector_match: false,
        workload_based: true,
        round_robin: true,
      },
      is_active: true,
    },
    {
      action_type: 'assessment_review',
      action_name: 'Review Control Assessments',
      action_description: 'Review control assessment results for compliance',
      user_role: 'compliance_auditor',
      priority: 'High',
      is_mandatory: true,
      requires_approval: false,
      auto_assign_threshold: 10,
      assignment_rules: {
        workload_based: true,
        expertise_based: true,
      },
      is_active: true,
    },

    // Financial Controller Actions
    {
      action_type: 'budget_approval',
      action_name: 'Approve Implementation Budget',
      action_description: 'Approve budgets for implementation plans',
      user_role: 'financial_controller',
      priority: 'High',
      is_mandatory: true,
      requires_approval: true,
      auto_assign_threshold: 8,
      assignment_rules: {
        amount_threshold: 100000,
        workload_based: true,
      },
      is_active: true,
    },

    // Sector-Specific Actions
    {
      action_type: 'task_assignment',
      action_name: 'Health Sector Tasks',
      action_description: 'Assign health sector specific tasks',
      user_role: 'program_director',
      entity_sector: 'Health',
      priority: 'Medium',
      is_mandatory: false,
      requires_approval: false,
      auto_assign_threshold: 15,
      assignment_rules: {
        sector_match: true,
        entity_match: true,
        workload_based: true,
      },
      is_active: true,
    },
    {
      action_type: 'task_assignment',
      action_name: 'Technology Sector Tasks',
      action_description: 'Assign technology sector specific tasks',
      user_role: 'program_director',
      entity_sector: 'Technology',
      priority: 'Medium',
      is_mandatory: false,
      requires_approval: false,
      auto_assign_threshold: 15,
      assignment_rules: {
        sector_match: true,
        entity_match: true,
        workload_based: true,
      },
      is_active: true,
    },
  ];

  await knex('grc_role_actions').insert(roleActions);
  console.log(`✅ Seeded ${roleActions.length} role-based action rules.`);
};

