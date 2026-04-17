const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const { sequelize } = require('./models');
const { smsService } = require('./services/smsService');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'https://otplessauthfrontend.vercel.app'],
  credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running with SQLite' });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`=========================================`);
    console.log(`📱 OTP Verification System (SQLite)`);
    console.log(`=========================================`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/auth/send-otp    - Send OTP`);
    console.log(`   POST /api/auth/verify-otp  - Verify OTP`);
    console.log(`=========================================\n`);
  });
};

startServer();