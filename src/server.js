const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

const startServer = async () => {
  await connectDB();
  
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
      role: 'admin'
    });
    console.log('✅ Admin created: admin@otpless.com / Admin@123');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // console.log(`✅ Health check: http://localhost:${PORT}/health`);
    // console.log(`✅ Test: http://localhost:${PORT}/test`);
    // console.log(`✅ Admin login: POST http://localhost:${PORT}/api/auth/admin-login`);
    // console.log(`✅ WhatsApp send: POST http://localhost:${PORT}/api/whatsapp/send`);
  });
};

startServer();