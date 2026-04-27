const express = require('express');
const { 
  getAllUsers, 
  getMyUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUserById 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.get('/my-users', getMyUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;