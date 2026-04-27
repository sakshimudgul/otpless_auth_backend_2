const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// User dashboard route (protected)
router.get('/dashboard', protect, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user,
    message: 'Welcome to your dashboard'
  });
});

module.exports = router;