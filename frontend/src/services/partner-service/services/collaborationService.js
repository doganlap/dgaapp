const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CollaborationService {
  /**
   * Get collaboration by ID
   */
  async getCollaborationById(collaborationId, tenantId) {
    try {
      const result = await query(`
        SELECT 
          c.*,
          p.partner_type,
          pt.name as partner_tenant_name
        FROM partner_collaborations c
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN tenants pt ON p.partner_tenant_id = pt.id
        WHERE c.id = $1 AND c.tenant_id = $2
      `, [collaborationId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Collaboration not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting collaboration:', error);
      throw error;
    }
  }

  /**
   * Get collaborations for a tenant
   */
  async getCollaborations(tenantId, filters = {}) {
    try {
      let sql = `
        SELECT 
          c.*,
          p.partner_type,
          pt.name as partner_tenant_name
        FROM partner_collaborations c
        JOIN partners p ON c.partner_id = p.id
        LEFT JOIN tenants pt ON p.partner_tenant_id = pt.id
        WHERE c.tenant_id = $1
      `;
      
      const params = [tenantId];
      let paramIndex = 2;

      if (filters.partner_id) {
        sql += ` AND c.partner_id = $${paramIndex}`;
        params.push(filters.partner_id);
        paramIndex++;
      }

      if (filters.collaboration_type) {
        sql += ` AND c.collaboration_type = $${paramIndex}`;
        params.push(filters.collaboration_type);
        paramIndex++;
      }

      sql += ` ORDER BY c.created_at DESC`;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting collaborations:', error);
      throw error;
    }
  }

  /**
   * Create collaboration
   */
  async createCollaboration(tenantId, collaborationData) {
    try {
      const {
        partner_id,
        collaboration_type,
        shared_resources = {},
        access_level = 'read'
      } = collaborationData;

      const result = await transaction(async (client) => {
        // Verify partner exists and belongs to tenant
        const partnerCheck = await client.query(`
          SELECT id FROM partners
          WHERE id = $1 AND tenant_id = $2
        `, [partner_id, tenantId]);

        if (partnerCheck.rows.length === 0) {
          throw new Error('Partner not found');
        }

        const collaborationResult = await client.query(`
          INSERT INTO partner_collaborations (
            id, tenant_id, partner_id, collaboration_type,
            shared_resources, access_level, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          uuidv4(),
          tenantId,
          partner_id,
          collaboration_type,
          JSON.stringify(shared_resources),
          access_level
        ]);

        return collaborationResult.rows[0];
      });

      return result;
    } catch (error) {
      console.error('Error creating collaboration:', error);
      throw error;
    }
  }

  /**
   * Update collaboration
   */
  async updateCollaboration(collaborationId, tenantId, updateData) {
    try {
      const {
        shared_resources,
        access_level
      } = updateData;

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (shared_resources !== undefined) {
        updates.push(`shared_resources = $${paramIndex++}`);
        params.push(JSON.stringify(shared_resources));
      }

      if (access_level !== undefined) {
        updates.push(`access_level = $${paramIndex++}`);
        params.push(access_level);
      }

      params.push(collaborationId, tenantId);

      const result = await query(`
        UPDATE partner_collaborations
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        throw new Error('Collaboration not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating collaboration:', error);
      throw error;
    }
  }

  /**
   * Delete collaboration
   */
  async deleteCollaboration(collaborationId, tenantId) {
    try {
      const result = await query(`
        DELETE FROM partner_collaborations
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [collaborationId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Collaboration not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting collaboration:', error);
      throw error;
    }
  }
}

module.exports = new CollaborationService();

