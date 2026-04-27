const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use('/api/auth', authRoutes);

const startServer = async () => {
  await connectDB();
  
  // Create default admin if not exists
  const { User } = require('./models');
  const adminExists = await User.findOne({ where: { email: 'admin@otpless.com' } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await User.create({
      id: uuidv4(),
      name: 'Admin User',
      email: 'admin@otpless.com',
      phone_number: '0000000000',
      password: hashedPassword,
      role: 'admin',
      is_active: true
    });
    console.log('✅ Default admin created: admin@otpless.com / Admin@123');
  }
  
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();