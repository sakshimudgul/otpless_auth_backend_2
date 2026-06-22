const { run, getAll } = require('../config/database');
const crypto = require('crypto');

const ServiceUsage = {
  create: async (data) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO service_usage (id, user_id, service_id, end_user_id, credits_used, usage_data) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.user_id, data.service_id, data.end_user_id || null, data.credits_used || 1, JSON.stringify(data.usage_data || {})]
    );
    return { id, ...data };
  },
  
  findByUser: async (userId) => {
    return await getAll(`
      SELECT su.*, s.display_name, eu.name as end_user_name
      FROM service_usage su
      JOIN services s ON su.service_id = s.id
      LEFT JOIN end_users eu ON su.end_user_id = eu.id
      WHERE su.user_id = ?
      ORDER BY su.created_at DESC
    `, [userId]);
  },
  
  findByEndUser: async (endUserId) => {
    return await getAll(`
      SELECT su.*, s.display_name
      FROM service_usage su
      JOIN services s ON su.service_id = s.id
      WHERE su.end_user_id = ?
      ORDER BY su.created_at DESC
    `, [endUserId]);
  }
};

module.exports = ServiceUsage;