/**
 * Assignment Service
 * Handles multi-responsible assignment, auto-assignment, SLA tracking, and role-based actions
 */

const { db } = require('../config/database');
const logger = require('../utils/logger');

class AssignmentService {
  /**
   * Auto-assign multiple responsible persons to a plan based on entity attributes
   */
  async autoAssignPlanResponsibles(entity_id, plan_data = {}) {
    try {
      // Get entity details
      const entity = await db('dga_entities')
        .where({ entity_id })
        .first();

      if (!entity) {
        throw new Error('Entity not found');
      }

      const responsiblePersons = [];

      // 1. Assign based on entity sector
      const sectorManagers = await db('users')
        .where({ role: 'program_director', is_active: true })
        .where({ entity_id })
        .orWhere(function() {
          this.where({ role: 'regional_manager' })
            .where({ region: entity.region });
        })
        .limit(2)
        .select('user_id', 'full_name', 'role', 'email');

      sectorManagers.forEach(user => {
        responsiblePersons.push({
          user_id: user.user_id,
          full_name: user.full_name,
          role: user.role,
          responsibility_type: 'Sector Manager',
          assigned_at: new Date(),
        });
      });

      // 2. Assign compliance auditor for GRC plans
      if (plan_data.framework_id) {
        const complianceAuditors = await db('users')
          .where({ role: 'compliance_auditor', is_active: true })
          .where(function() {
            this.where({ entity_id })
              .orWhere({ region: entity.region });
          })
          .limit(1)
          .select('user_id', 'full_name', 'role', 'email');

        complianceAuditors.forEach(user => {
          responsiblePersons.push({
            user_id: user.user_id,
            full_name: user.full_name,
            role: user.role,
            responsibility_type: 'Compliance Auditor',
            assigned_at: new Date(),
          });
        });
      }

      // 3. Assign regional manager if entity has region
      if (entity.region) {
        const regionalManagers = await db('users')
          .where({ role: 'regional_manager', is_active: true })
          .where({ region: entity.region })
          .limit(1)
          .select('user_id', 'full_name', 'role', 'email');

        regionalManagers.forEach(user => {
          if (!responsiblePersons.find(rp => rp.user_id === user.user_id)) {
            responsiblePersons.push({
              user_id: user.user_id,
              full_name: user.full_name,
              role: user.role,
              responsibility_type: 'Regional Manager',
              assigned_at: new Date(),
            });
          }
        });
      }

      // 4. Calculate SLA dates
      const slaTargetDays = plan_data.sla_target_days || 30;
      const slaStartDate = new Date();
      const slaTargetDate = new Date();
      slaTargetDate.setDate(slaTargetDate.getDate() + slaTargetDays);

      const autoAssignmentRules = {
        based_on: ['entity_sector', 'entity_region', 'plan_type'],
        entity_sector: entity.sector,
        entity_region: entity.region,
        assigned_count: responsiblePersons.length,
        assigned_at: new Date(),
      };

      logger.info(`Auto-assigned ${responsiblePersons.length} responsible persons for plan in entity ${entity_id}`);

      return {
        responsible_persons: responsiblePersons,
        sla_start_date: slaStartDate,
        sla_target_date: slaTargetDate,
        sla_target_days: slaTargetDays,
        auto_assignment_rules: autoAssignmentRules,
        last_auto_assignment_at: new Date(),
      };
    } catch (error) {
      logger.error('Auto-assign plan responsibles error:', error);
      throw error;
    }
  }

  /**
   * Auto-assign tasks to users based on role, workload, and availability
   */
  async autoAssignTask(task_data, plan_id) {
    try {
      // Get plan and entity
      const plan = await db('grc_implementation_plans')
        .where({ plan_id })
        .first();

      if (!plan) {
        throw new Error('Plan not found');
      }

      const entity = await db('dga_entities')
        .where({ entity_id: plan.entity_id })
        .first();

      const assignees = [];
      const assignmentRules = {
        based_on: [],
        criteria: {},
      };

      // 1. Get responsible persons from plan
      const planResponsibles = plan.responsible_persons || [];
      if (planResponsibles.length > 0) {
        // Assign to primary responsible person
        const primaryResponsible = planResponsibles[0];
        assignees.push({
          user_id: primaryResponsible.user_id,
          role: primaryResponsible.role,
          assignment_type: 'Primary',
          assigned_at: new Date(),
        });
        assignmentRules.based_on.push('plan_responsible_person');
      }

      // 2. Assign based on task priority and required roles
      const requiredRoles = task_data.required_roles || [];
      if (requiredRoles.length > 0) {
        for (const role of requiredRoles) {
          // Find users with this role and low workload
          const availableUsers = await this.findAvailableUsers(role, entity, task_data.priority);
          
          if (availableUsers.length > 0) {
            const selectedUser = availableUsers[0];
            if (!assignees.find(a => a.user_id === selectedUser.user_id)) {
              assignees.push({
                user_id: selectedUser.user_id,
                role: selectedUser.role,
                assignment_type: requiredRoles.indexOf(role) === 0 ? 'Primary' : 'Secondary',
                assigned_at: new Date(),
              });
              assignmentRules.based_on.push(`role_${role}`);
            }
          }
        }
      }

      // 3. If no assignees found, assign to entity's program director
      if (assignees.length === 0) {
        const programDirectors = await db('users')
          .where({ role: 'program_director', is_active: true })
          .where({ entity_id: entity.entity_id })
          .limit(1)
          .select('user_id', 'full_name', 'role', 'email');

        if (programDirectors.length > 0) {
          assignees.push({
            user_id: programDirectors[0].user_id,
            role: programDirectors[0].role,
            assignment_type: 'Primary',
            assigned_at: new Date(),
          });
          assignmentRules.based_on.push('entity_program_director');
        }
      }

      // 4. Calculate SLA for task
      const slaTargetHours = task_data.sla_target_hours || 8;
      const slaStartTime = new Date();
      const slaTargetTime = new Date();
      slaTargetTime.setHours(slaTargetTime.getHours() + slaTargetHours);

      assignmentRules.criteria = {
        entity_sector: entity.sector,
        entity_region: entity.region,
        task_priority: task_data.priority || 0,
        assigned_count: assignees.length,
      };

      // 5. Create task assignments in database
      const taskAssignments = [];
      for (const assignee of assignees) {
        const [assignment] = await db('grc_task_assignments').insert({
          task_id: task_data.task_id,
          user_id: assignee.user_id,
          assignment_type: assignee.assignment_type,
          assignment_status: 'Assigned',
          user_role: assignee.role,
          is_auto_assigned: true,
          auto_assignment_reason: {
            based_on: assignmentRules.based_on,
            criteria: assignmentRules.criteria,
          },
          assigned_at: new Date(),
        }).returning('*');

        taskAssignments.push(assignment);
      }

      // 6. SLA tracking will be created after task is inserted (by controller or caller)

      logger.info(`Auto-assigned ${assignees.length} users to task ${task_data.task_id}`);

      return {
        assignees,
        task_assignments: taskAssignments,
        sla_start_time: slaStartTime,
        sla_target_time: slaTargetTime,
        sla_target_hours: slaTargetHours,
        auto_assigned: true,
        auto_assignment_rules: assignmentRules,
        auto_assigned_at: new Date(),
      };
    } catch (error) {
      logger.error('Auto-assign task error:', error);
      throw error;
    }
  }

  /**
   * Find available users based on role, workload, and availability
   */
  async findAvailableUsers(role, entity, priority = 0) {
    try {
      // Base query for users with the role
      let query = db('users')
        .where({ role, is_active: true });

      // Filter by entity or region
      if (entity.entity_id) {
        query = query.where(function() {
          this.where({ entity_id: entity.entity_id })
            .orWhere({ region: entity.region });
        });
      }

      // Get users and their current workload
      const users = await query.select('user_id', 'full_name', 'role', 'email', 'entity_id', 'region');

      // Calculate workload for each user
      const usersWithWorkload = await Promise.all(users.map(async (user) => {
        // Count active tasks assigned to this user
        const activeTasksCount = await db('grc_task_assignments')
          .where({ user_id: user.user_id })
          .whereIn('assignment_status', ['Assigned', 'Accepted', 'In Progress'])
          .count('* as count')
          .first();

        // Count overdue tasks
        const overdueTasksCount = await db('grc_sla_tracking')
          .where({ assigned_to: user.user_id })
          .where({ sla_status: 'Breached' })
          .count('* as count')
          .first();

        return {
          ...user,
          active_tasks: parseInt(activeTasksCount?.count || 0),
          overdue_tasks: parseInt(overdueTasksCount?.count || 0),
          workload_score: parseInt(activeTasksCount?.count || 0) + (parseInt(overdueTasksCount?.count || 0) * 2),
        };
      }));

      // Sort by workload (lowest first) and prioritize entity users
      return usersWithWorkload
        .sort((a, b) => {
          // Prioritize users from same entity
          if (a.entity_id === entity.entity_id && b.entity_id !== entity.entity_id) return -1;
          if (a.entity_id !== entity.entity_id && b.entity_id === entity.entity_id) return 1;
          // Then sort by workload
          return a.workload_score - b.workload_score;
        })
        .slice(0, 3); // Return top 3 available users
    } catch (error) {
      logger.error('Find available users error:', error);
      return [];
    }
  }

  /**
   * Update SLA tracking and calculate compliance
   */
  async updateSLATracking(item_type, item_id) {
    try {
      const slaRecords = await db('grc_sla_tracking')
        .where({ item_type, item_id })
        .select('*');

      const now = new Date();
      const updates = [];

      for (const sla of slaRecords) {
        let slaStatus = sla.sla_status;
        let daysRemaining = null;
        let daysOverdue = null;
        let compliancePercentage = 100;

        if (sla.sla_status !== 'Completed' && sla.sla_status !== 'Cancelled') {
          const targetTime = new Date(sla.sla_target_time);
          const timeDiff = targetTime - now;
          daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          if (timeDiff < 0) {
            // Breached
            daysOverdue = Math.abs(daysRemaining);
            slaStatus = 'Breached';
            compliancePercentage = 0;
          } else if (timeDiff < (sla.sla_target_days * 24 * 60 * 60 * 0.2)) {
            // At risk (less than 20% of time remaining)
            slaStatus = 'At Risk';
            compliancePercentage = (timeDiff / (sla.sla_target_days * 24 * 60 * 60)) * 100;
          } else {
            // On track
            slaStatus = 'On Track';
            compliancePercentage = Math.min(100, Math.max(0, (timeDiff / (sla.sla_target_days * 24 * 60 * 60)) * 100));
          }
        }

        await db('grc_sla_tracking')
          .where({ sla_id: sla.sla_id })
          .update({
            sla_status: slaStatus,
            days_remaining: daysRemaining,
            days_overdue: daysOverdue,
            sla_compliance_percentage: Math.min(100, Math.max(0, compliancePercentage)), // Cap between 0-100
            updated_at: now,
          });

        updates.push({
          sla_id: sla.sla_id,
          status: slaStatus,
          compliance_percentage: compliancePercentage,
        });
      }

      return updates;
    } catch (error) {
      logger.error('Update SLA tracking error:', error);
      throw error;
    }
  }

  /**
   * Get role-based actions for a user
   */
  async getRoleActions(user_role, entity_sector = null, entity_region = null) {
    try {
      let query = db('grc_role_actions')
        .where({ user_role, is_active: true });

      // Filter by sector if provided
      if (entity_sector) {
        query = query.where(function() {
          this.whereNull('entity_sector')
            .orWhere({ entity_sector });
        });
      }

      // Filter by region if provided
      if (entity_region) {
        query = query.where(function() {
          this.whereNull('entity_region')
            .orWhere({ entity_region });
        });
      }

      return await query.select('*').orderBy('priority', 'desc');
    } catch (error) {
      logger.error('Get role actions error:', error);
      return [];
    }
  }

  /**
   * Create internal action
   */
  async createInternalAction(action_data) {
    try {
      const [action] = await db('grc_internal_actions').insert({
        action_type: action_data.action_type,
        action_name: action_data.action_name,
        action_description: action_data.action_description,
        item_type: action_data.item_type,
        item_id: action_data.item_id,
        initiated_by: action_data.initiated_by,
        assigned_to: action_data.assigned_to || [],
        action_status: 'Pending',
        priority: action_data.priority || 'Medium',
        due_date: action_data.due_date,
        notes: action_data.notes,
        metadata: action_data.metadata || {},
      }).returning('*');

      // Send notifications to assigned users
      if (action.assigned_to && action.assigned_to.length > 0) {
        // Notification logic would go here
        logger.info(`Created internal action ${action.action_id} assigned to ${action.assigned_to.length} users`);
      }

      return action;
    } catch (error) {
      logger.error('Create internal action error:', error);
      throw error;
    }
  }
}

module.exports = new AssignmentService();

