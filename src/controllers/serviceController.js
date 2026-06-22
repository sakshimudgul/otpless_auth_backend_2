const Service = require('../models/Service');

// Get all services (Admin)
const getAllServices = async (req, res) => {
  try {
    const services = await Service.findAllAdmin();
    res.json({ success: true, services });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Get active services (User/EndUser)
const getActiveServices = async (req, res) => {
  try {
    const services = await Service.findAll();
    res.json({ success: true, services });
  } catch (error) {
    console.error('Get active services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Create service (Admin only)
const createService = async (req, res) => {
  try {
    const { name, display_name, description, price_per_unit } = req.body;
    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display name are required' });
    }
    
    const service = await Service.create({ name, display_name, description, price_per_unit });
    res.json({ success: true, service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service: ' + error.message });
  }
};

// Update service (Admin only)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.update(id, req.body);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

// Delete service (Admin only)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await Service.delete(id);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};

module.exports = {
  getAllServices,
  getActiveServices,
  createService,
  updateService,
  deleteService
};