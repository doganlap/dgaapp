const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class PartnerService {
  /**
   * Get all partners for a tenant
   */
  async getPartners(tenantId, filters = {}) {
    try {
      let sql = `
        SELECT 
          p.*,
          pt.name as partner_tenant_name,
          pt.tenant_code as partner_tenant_code
        FROM partners p
        LEFT JOIN tenants pt ON p.partner_tenant_id = pt.id
        WHERE p.tenant_id = $1
      `;
      
      const params = [tenantId];
      let paramIndex = 2;

      if (filters.status) {
        sql += ` AND p.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.partner_type) {
        sql += ` AND p.partner_type = $${paramIndex}`;
        params.push(filters.partner_type);
        paramIndex++;
      }

      sql += ` ORDER BY p.created_at DESC`;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting partners:', error);
      throw error;
    }
  }

  /**
   * Get partner by ID
   */
  async getPartnerById(partnerId, tenantId) {
    try {
      const result = await query(`
        SELECT 
          p.*,
          pt.name as partner_tenant_name,
          pt.tenant_code as partner_tenant_code
        FROM partners p
        LEFT JOIN tenants pt ON p.partner_tenant_id = pt.id
        WHERE p.id = $1 AND p.tenant_id = $2
      `, [partnerId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Partner not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting partner:', error);
      throw error;
    }
  }

  /**
   * Create new partner relationship
   */
  async createPartner(tenantId, partnerData) {
    try {
      const {
        partner_tenant_id,
        partner_type = 'vendor',
        partnership_level = 'standard',
        notes
      } = partnerData;

      const result = await transaction(async (client) => {
        const partnerResult = await client.query(`
          INSERT INTO partners (
            id, tenant_id, partner_tenant_id, partner_type,
            partnership_level, status, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `, [
          uuidv4(),
          tenantId,
          partner_tenant_id,
          partner_type,
          partnership_level,
          notes || null
        ]);

        return partnerResult.rows[0];
      });

      return result;
    } catch (error) {
      console.error('Error creating partner:', error);
      throw error;
    }
  }

  /**
   * Update partner
   */
  async updatePartner(partnerId, tenantId, updateData) {
    try {
      const {
        partner_type,
        partnership_level,
        status,
        notes
      } = updateData;

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (partner_type !== undefined) {
        updates.push(`partner_type = $${paramIndex++}`);
        params.push(partner_type);
      }

      if (partnership_level !== undefined) {
        updates.push(`partnership_level = $${paramIndex++}`);
        params.push(partnership_level);
      }

      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(notes);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(partnerId, tenantId);

      const result = await query(`
        UPDATE partners
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        throw new Error('Partner not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating partner:', error);
      throw error;
    }
  }

  /**
   * Delete partner
   */
  async deletePartner(partnerId, tenantId) {
    try {
      const result = await query(`
        DELETE FROM partners
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [partnerId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Partner not found');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting partner:', error);
      throw error;
    }
  }

  /**
   * Invite partner
   */
  async invitePartner(tenantId, inviteData) {
    try {
      const {
        partner_tenant_id,
        partner_type,
        partnership_level,
        message
      } = inviteData;

      // Create partner with pending status
      const partner = await this.createPartner(tenantId, {
        partner_tenant_id,
        partner_type,
        partnership_level,
        notes: message
      });

      try {
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/notifications`, {
          recipient: `tenant_${partner_tenant_id}`,
          message: `You have a new partner invitation from tenant ${tenantId}`,
          type: 'partner_invitation',
          data: {
            partnerId: partner.id,
            invitingTenantId: tenantId
          }
        });
      } catch (error) {
        console.error('Failed to send partner invitation notification:', error);
        // Depending on requirements, you might want to handle this error more gracefully
      }

      return partner;
    } catch (error) {
      console.error('Error inviting partner:', error);
      throw error;
    }
  }
}

module.exports = new PartnerService();

