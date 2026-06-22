const { getOne, getAll, run } = require('../config/database');
const crypto = require('crypto');

const UserService = {
  findByUser: async (userId) => {
    return await getAll(`
      SELECT us.*, s.name, s.display_name, s.price_per_unit 
      FROM user_services us
      JOIN services s ON us.service_id = s.id
      WHERE us.user_id = ? AND us.is_active = 1
    `, [userId]);
  },
  
  findById: async (id) => {
    return await getOne(`
      SELECT us.*, s.name, s.display_name 
      FROM user_services us
      JOIN services s ON us.service_id = s.id
      WHERE us.id = ?
    `, [id]);
  },
  
  findByUserAndService: async (userId, serviceId) => {
    return await getOne(`
      SELECT * FROM user_services 
      WHERE user_id = ? AND service_id = ? AND is_active = 1
    `, [userId, serviceId]);
  },
  
  create: async (data) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO user_services (id, user_id, service_id, credits_remaining, total_credits_purchased, expiry_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.user_id, data.service_id, data.credits || 0, data.credits || 0, data.expiry_date || null]
    );
    return await UserService.findById(id);
  },
  
  addCredits: async (id, amount) => {
    await run(
      'UPDATE user_services SET credits_remaining = credits_remaining + ?, total_credits_purchased = total_credits_purchased + ? WHERE id = ?',
      [amount, amount, id]
    );
    return await UserService.findById(id);
  },
  
  deductCredits: async (id, amount = 1) => {
    const record = await UserService.findById(id);
    if (!record || record.credits_remaining < amount) {
      throw new Error('Insufficient credits');
    }
    await run(
      'UPDATE user_services SET credits_remaining = credits_remaining - ? WHERE id = ?',
      [amount, id]
    );
    return await UserService.findById(id);
  },
  
  deactivate: async (id) => {
    await run('UPDATE user_services SET is_active = 0 WHERE id = ?', [id]);
    return true;
  }
};

module.exports = UserService;