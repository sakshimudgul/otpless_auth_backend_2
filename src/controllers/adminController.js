const { User } = require('../models');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    const existingUser = await User.findOne({ where: { phone_number: cleanPhone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    
    const user = await User.create({
      name,
      phone_number: cleanPhone,
      email: email || null,
      role: 'user',
      created_by: req.user.id
    });
    
    res.json({ success: true, user, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getAllUsers, createUser, deleteUser };