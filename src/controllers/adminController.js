const { User } = require('../models');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get users created by this admin
const getMyUsers = async (req, res) => {
  try {
    const users = await User.getUsersByCreator(req.user.id);
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Create user (admin creates users)
const createUser = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      return res.status(400).json({ error: 'Phone already exists' });
    }
    
    const user = await User.create({
      name,
      email,
      phone,
      created_by: req.user.id,
      role: 'user'
    });
    
    res.json({ success: true, user, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, is_active } = req.body;
    
    const user = await User.update(id, { name, email, is_active });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.delete(id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

module.exports = { getAllUsers, getMyUsers, createUser, updateUser, deleteUser, getUserById };