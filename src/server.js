const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'https://otplessauthfrontend.vercel.app'],
  credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/sms', smsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`=========================================`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST /api/auth/send-otp     - Send OTP (Auth)`);
    console.log(`   POST /api/auth/verify-otp   - Verify OTP (Auth)`);
    console.log(`   POST /api/sms/send          - Send OTP (SMS Controller)`);
    console.log(`   POST /api/sms/verify        - Verify OTP (SMS Controller)`);
    console.log(`   POST /api/sms/resend        - Resend OTP`);
    console.log(`   GET  /api/sms/status/:phone - Check OTP Status`);
    console.log(`   POST /api/sms/test-connection - Test SMS API`);
    console.log(`=========================================\n`);
  });
};

startServer();