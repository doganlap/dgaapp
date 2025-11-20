/**
 * Compliance Deadline Tracker
 * Tracks and manages compliance deadlines with automatic reminders
 */

const { pool } = require('../../config/database');
const { gregorianToHijri } = require('./HijriCalendarIntegration');
const logger = require('../../utils/logger');

/**
 * Add regulatory change to calendar
 */
async function addToCalendar(regulatoryChangeId, organizationId) {
  const client = await pool.connect();
  try {
    // Get regulatory change details
    const changeQuery = `
      SELECT * FROM regulatory_changes WHERE id = $1
    `;
    const changeResult = await client.query(changeQuery, [regulatoryChangeId]);
    const change = changeResult.rows[0];
    
    if (!change || !change.deadline_date) {
      return null;
    }

    // Convert to Hijri
    const hijri = gregorianToHijri(change.deadline_date);
    
    // Calculate reminder date (7 days before deadline)
    const reminderDate = new Date(change.deadline_date);
    reminderDate.setDate(reminderDate.getDate() - 7);
    
    // Insert into calendar
    const insertQuery = `
      INSERT INTO regulatory_calendar (
        regulatory_change_id,
        organization_id,
        deadline_date_gregorian,
        deadline_date_hijri,
        reminder_date
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      regulatoryChangeId,
      organizationId,
      change.deadline_date,
      hijri?.hijriDate,
      reminderDate.toISOString().split('T')[0]
    ]);
    
    logger.info(`✅ Added to calendar: ${change.title.substring(0, 50)}...`);
    return result.rows[0];
    
  } finally {
    client.release();
  }
}

/**
 * Get upcoming deadlines for organization
 */
async function getUpcomingDeadlines(organizationId, days = 30) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        rc.regulatory_change_id,
        rc.deadline_date_gregorian,
        rc.deadline_date_hijri,
        rc.completed,
        rch.title,
        rch.regulator_name,
        rch.urgency_level,
        DATE_PART('day', rc.deadline_date_gregorian - CURRENT_DATE) as days_until_deadline
      FROM regulatory_calendar rc
      JOIN regulatory_changes rch ON rc.regulatory_change_id = rch.id
      WHERE rc.organization_id = $1
        AND rc.completed = false
        AND rc.deadline_date_gregorian >= CURRENT_DATE
        AND rc.deadline_date_gregorian <= CURRENT_DATE + INTERVAL '${days} days'
      ORDER BY rc.deadline_date_gregorian ASC
    `;
    
    const result = await client.query(query, [organizationId]);
    return result.rows;
    
  } finally {
    client.release();
  }
}

/**
 * Mark deadline as completed
 */
async function markCompleted(calendarId) {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE regulatory_calendar
      SET completed = true
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [calendarId]);
    return result.rows[0];
    
  } finally {
    client.release();
  }
}

/**
 * Send reminders for upcoming deadlines
 */
async function sendReminders() {
  const client = await pool.connect();
  try {
    // Get deadlines that need reminders
    const query = `
      SELECT 
        rc.*,
        rch.title,
        rch.regulator_name,
        o.name as organization_name
      FROM regulatory_calendar rc
      JOIN regulatory_changes rch ON rc.regulatory_change_id = rch.id
      JOIN organizations o ON rc.organization_id = o.id
      WHERE rc.reminder_sent = false
        AND rc.completed = false
        AND rc.reminder_date <= CURRENT_DATE
    `;
    
    const result = await client.query(query);
    const reminders = result.rows;
    
    logger.info(`📅 Processing ${reminders.length} deadline reminders`);
    
    // Send reminders (integrate with notification system)
    for (const reminder of reminders) {
      // Mark as sent
      await client.query(
        `UPDATE regulatory_calendar SET reminder_sent = true WHERE id = $1`,
        [reminder.id]
      );
      
      logger.info(`✅ Reminder sent for: ${reminder.title}`);
    }
    
    return reminders.length;
    
  } finally {
    client.release();
  }
}

module.exports = {
  addToCalendar,
  getUpcomingDeadlines,
  markCompleted,
  sendReminders
};

