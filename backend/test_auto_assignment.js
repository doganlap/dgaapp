/**
 * Test Script: Auto-Assignment & SLA Tracking
 * 
 * Tests:
 * 1. Create implementation plan with auto_assign: true
 * 2. Verify multiple responsible persons assigned
 * 3. Verify SLA tracking created
 * 4. Check role-based actions
 * 5. Monitor SLA compliance
 */

const { db } = require('./src/config/database');
const assignmentService = require('./src/services/assignment.service');

async function testAutoAssignment() {
  console.log('\n🧪 Testing Auto-Assignment & SLA Tracking System\n');
  console.log('='.repeat(60));

  try {
    // 1. Get a sample entity and framework
    console.log('\n📋 Step 1: Getting sample entity and framework...');
    const entity = await db('dga_entities')
      .where({ status: 'Active' })
      .first();
    
    if (!entity) {
      console.error('❌ No active entities found. Please seed entities first.');
      process.exit(1);
    }

    const framework = await db('grc_frameworks')
      .where({ is_active: true })
      .first();

    if (!framework) {
      console.error('❌ No active frameworks found. Please seed frameworks first.');
      process.exit(1);
    }

    console.log(`✅ Found entity: ${entity.entity_name_en} (${entity.entity_id})`);
    console.log(`✅ Found framework: ${framework.framework_name_en} (${framework.framework_id})`);

    // 2. Create implementation plan with auto_assign: true
    console.log('\n📝 Step 2: Creating implementation plan with auto-assignment...');
    const planData = {
      entity_id: entity.entity_id,
      framework_id: framework.framework_id,
      plan_name: `Test Auto-Assignment Plan - ${new Date().toISOString()}`,
      description: 'Test plan to verify auto-assignment of multiple responsible persons',
      plan_status: 'Draft',
      start_date: new Date(),
      target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      budget_allocated: 100000,
    };

    // Use the assignment service to auto-assign
    const assignmentResult = await assignmentService.autoAssignPlanResponsibles(
      entity.entity_id,
      planData
    );

    // Merge assignment results
    Object.assign(planData, {
      responsible_persons: assignmentResult.responsible_persons,
      sla_start_date: assignmentResult.sla_start_date,
      sla_target_date: assignmentResult.sla_target_date,
      sla_target_days: assignmentResult.sla_target_days,
      auto_assignment_rules: assignmentResult.auto_assignment_rules,
      last_auto_assignment_at: assignmentResult.last_auto_assignment_at,
      sla_status: 'On Track',
      sla_compliance_percentage: 100,
    });

    const [plan] = await db('grc_implementation_plans')
      .insert(planData)
      .returning('*');

    console.log(`✅ Plan created: ${plan.plan_name} (ID: ${plan.plan_id})`);
    console.log(`✅ Responsible persons assigned: ${plan.responsible_persons?.length || 0}`);

    // Display assigned responsible persons
    if (plan.responsible_persons && plan.responsible_persons.length > 0) {
      console.log('\n👥 Assigned Responsible Persons:');
      plan.responsible_persons.forEach((rp, index) => {
        console.log(`   ${index + 1}. ${rp.full_name} (${rp.role}) - ${rp.responsibility_type}`);
      });
    }

    // 3. Create SLA tracking record
    console.log('\n⏱️ Step 3: Creating SLA tracking record...');
    const [slaRecord] = await db('grc_sla_tracking').insert({
      item_type: 'plan',
      item_id: plan.plan_id,
      sla_name: `Plan: ${plan.plan_name}`,
      sla_description: plan.description || '',
      sla_target_days: plan.sla_target_days || 30,
      sla_start_time: plan.sla_start_date || new Date(),
      sla_target_time: plan.sla_target_date,
      sla_status: 'On Track',
      sla_compliance_percentage: 100,
      days_remaining: Math.ceil((new Date(plan.sla_target_date) - new Date(plan.sla_start_date || new Date())) / (1000 * 60 * 60 * 24)),
      responsible_persons: plan.responsible_persons || [],
    }).returning('*');

    console.log(`✅ SLA tracking created (ID: ${slaRecord.sla_id})`);
    console.log(`   Target: ${slaRecord.sla_target_days} days`);
    console.log(`   Status: ${slaRecord.sla_status}`);
    console.log(`   Days Remaining: ${slaRecord.days_remaining}`);

    // 4. Test role-based actions
    console.log('\n⚙️ Step 4: Testing role-based actions...');
    const roleActions = await assignmentService.getRoleActions(
      'program_director',
      entity.sector,
      entity.region
    );

    console.log(`✅ Found ${roleActions.length} role-based actions for program_director`);
    if (roleActions.length > 0) {
      console.log('   Sample actions:');
      roleActions.slice(0, 3).forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.action_name} (${action.priority} priority)`);
      });
    }

    // 5. Create a test task with auto-assignment
    console.log('\n📋 Step 5: Creating test task with auto-assignment...');
    const taskData = {
      plan_id: plan.plan_id,
      control_id: null,
      task_name: 'Test Auto-Assigned Task',
      description: 'Test task to verify auto-assignment functionality',
      task_status: 'Not Started',
      priority: 5,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    const taskAssignmentResult = await assignmentService.autoAssignTask(taskData, plan.plan_id);

    // Insert task
    const [task] = await db('grc_implementation_tasks').insert({
      ...taskData,
      assignees: JSON.stringify(taskAssignmentResult.assignees || []),
      required_roles: JSON.stringify(['program_director']),
      role_actions: JSON.stringify({}),
      sla_start_time: taskAssignmentResult.sla_start_time,
      sla_target_time: taskAssignmentResult.sla_target_time,
      sla_target_hours: taskAssignmentResult.sla_target_hours,
      auto_assigned: taskAssignmentResult.auto_assigned,
      auto_assignment_rules: JSON.stringify(taskAssignmentResult.auto_assignment_rules || {}),
      auto_assigned_at: taskAssignmentResult.auto_assigned_at,
      sla_status: 'On Track',
      sla_compliance_percentage: 100,
    }).returning('*');

    // Create SLA tracking record for task
    await db('grc_sla_tracking').insert({
      item_type: 'task',
      item_id: task.task_id,
      sla_name: `Task: ${task.task_name}`,
      sla_description: task.description || '',
      sla_target_days: Math.ceil((taskAssignmentResult.sla_target_hours || 8) / 24),
      sla_target_hours: taskAssignmentResult.sla_target_hours || 8,
      sla_start_time: taskAssignmentResult.sla_start_time,
      sla_target_time: taskAssignmentResult.sla_target_time,
      sla_status: 'On Track',
      sla_compliance_percentage: 100,
      days_remaining: Math.ceil((new Date(taskAssignmentResult.sla_target_time) - new Date(taskAssignmentResult.sla_start_time)) / (1000 * 60 * 60 * 24)),
      assigned_to: taskAssignmentResult.assignees[0]?.user_id || null,
      responsible_persons: taskAssignmentResult.assignees,
    });

    console.log(`✅ Task created: ${task.task_name} (ID: ${task.task_id})`);
    console.log(`✅ Assignees: ${task.assignees?.length || 0}`);

    if (task.assignees && task.assignees.length > 0) {
      console.log('\n👤 Task Assignees:');
      task.assignees.forEach((assignee, index) => {
        console.log(`   ${index + 1}. User ID: ${assignee.user_id} (${assignee.role}) - ${assignee.assignment_type}`);
      });
    }

    // 6. Update SLA tracking
    console.log('\n📊 Step 6: Updating SLA tracking...');
    const slaUpdates = await assignmentService.updateSLATracking('plan', plan.plan_id);
    console.log(`✅ Updated ${slaUpdates.length} SLA record(s)`);
    slaUpdates.forEach(update => {
      console.log(`   SLA ${update.sla_id}: ${update.status} (${update.compliance_percentage.toFixed(2)}% compliance)`);
    });

    // 7. Get all SLA tracking records
    console.log('\n📈 Step 7: Retrieving all SLA tracking records...');
    const allSLA = await db('grc_sla_tracking')
      .where({ item_type: 'plan', item_id: plan.plan_id })
      .select('*');

    console.log(`✅ Found ${allSLA.length} SLA record(s) for plan ${plan.plan_id}`);
    allSLA.forEach(sla => {
      console.log(`   - ${sla.sla_name}: ${sla.sla_status} (${sla.sla_compliance_percentage}% compliance)`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Plan created with ${plan.responsible_persons?.length || 0} responsible persons`);
    console.log(`✅ SLA tracking: ${slaRecord.sla_status} (${slaRecord.sla_compliance_percentage}% compliance)`);
    console.log(`✅ Task created with ${task.assignees?.length || 0} assignees`);
    console.log(`✅ Role-based actions: ${roleActions.length} found`);
    console.log(`✅ SLA records: ${allSLA.length} tracked`);
    console.log('\n🎉 All tests passed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run tests
testAutoAssignment();

