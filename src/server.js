const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Add this
require('dotenv').config();
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true  // Important for cookies
}));
app.use(cookieParser()); // Add this
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n=========================================`);
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`=========================================`);
      console.log(`👨‍💼 Admin: POST /api/auth/admin-login`);
      console.log(`📱 SMS: POST /api/auth/send-otp`);
      console.log(`✅ Verify: POST /api/auth/verify-otp`);
      console.log(`=========================================`);
      console.log(`Admin: admin@otpless.com / Admin@123`);
      console.log(`=========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();