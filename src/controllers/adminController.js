const { User } = require('../models');

const getAllUsers = async (req, res) => {
  try {
    console.log('Fetching all users...');
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    console.log(`Found ${users.length} users`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    
    console.log('Creating user:', { name, phone, email });
    console.log('Admin user ID:', req.userId);
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    const existingUser = await User.findOne({ where: { phone_number: cleanPhone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }
    
    const user = await User.create({
      id: require('crypto').randomUUID(),
      name,
      phone_number: cleanPhone,
      email: email || null,
      role: 'user',
      is_active: true,
      created_by: req.userId // Use the admin's ID from the request
    });
    
    console.log('User created successfully:', user.id);
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        email: user.email,
        is_active: user.is_active,
        createdAt: user.createdAt
      }, 
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting user:', id);
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getAllUsers, createUser, deleteUser };