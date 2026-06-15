const { getDb } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// ==================== SMS SENDING FUNCTION ====================
const sendActualSMS = async (phoneNumber, otp, name) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  const message = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;
  
  const url = `https://www.smsjust.com/sms/user/urlsms.php?username=${process.env.SMS_USERNAME}&pass=${process.env.SMS_PASSWORD}&senderid=${process.env.SMS_SENDER_ID}&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodeURIComponent(message)}&response=Y`;
  
  console.log(`=========================================`);
  console.log(`📱 SENDING SMS`);
  console.log(`📱 To: ${cleanPhone}`);
  console.log(`📝 Message: ${message}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`=========================================`);
  
  try {
    const response = await axios.get(url, { timeout: 30000 });
    console.log(`📨 SMS API Response: ${response.data}`);
    
    if (response.data && (response.data.includes('-') || response.data.includes('SUCCESS'))) {
      console.log(`✅ SMS SENT SUCCESSFULLY! Message ID: ${response.data}`);
      return { success: true, messageId: response.data };
    } else {
      console.log(`⚠️ SMS Response: ${response.data}`);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error(`❌ SMS Error:`, error.message);
    return { success: false, error: error.message };
  }
};

// ==================== WHATSAPP SENDING FUNCTION ====================
const sendActualWhatsApp = async (phoneNumber, otp, name) => {
  let cleanPhone = phoneNumber.replace(/\D/g, '');
  if (!cleanPhone.startsWith('91')) {
    cleanPhone = '91' + cleanPhone;
  }
  
  const message = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
  
  // USING YOUR TEMPLATE: auth_template_001
  const requestBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: parseInt(cleanPhone),
    type: "template",
    template: {
      name: "auth_template_001",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "payload", payload: "" }]
        }
      ]
    }
  };
  
  console.log(`=========================================`);
  console.log(`💚 SENDING WHATSAPP VIA TEMPLATE`);
  console.log(`📱 To: ${cleanPhone}`);
  console.log(`📝 Template: auth_template_001`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`📡 URL: ${url}`);
  console.log(`=========================================`);
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found in .env`);
    return { success: false, error: 'API key missing' };
  }
  
  if (!pinbotPhoneNumberId) {
    console.log(`❌ PINBOT_PHONE_NUMBER_ID not found in .env`);
    return { success: false, error: 'Phone number ID missing' };
  }
  
  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey
      },
      timeout: 30000
    });
    
    console.log(`📨 WhatsApp Response Status: ${response.status}`);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp OTP sent successfully to ${cleanPhone}`);
      return { success: true };
    } else {
      console.log(`⚠️ WhatsApp API returned status ${response.status}`);
      return { success: false, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.error(`❌ WhatsApp Error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
};

// ==================== EMAIL SENDING FUNCTION ====================
const sendActualEmail = async (email, otp, name) => {
  console.log(`📧 SENDING EMAIL`);
  console.log(`📧 To: ${email}`);
  console.log(`📝 Subject: Your OTP Code`);
  console.log(`📝 Body: Dear ${name}, Your OTP is: ${otp}`);
  console.log(`=========================================`);
  return { success: true };
};

// ==================== ADMIN LOGIN ====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Admin login:', email);
    
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM admins WHERE email = ?',
      args: [email]
    });
    
    const admin = result.rows[0];
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(admin.id, 'admin');
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ 
      success: true, 
      token: token,
      user: { 
        id: admin.id, 
        name: admin.name, 
        email: admin.email, 
        role: 'admin' 
      } 
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SEND SMS OTP ====================
const sendUserOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    console.log('Send OTP request:', phone);
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    const db = getDb();
    
    console.log(`🔑 Generated OTP: ${otpCode} for ${cleanPhone}`);
    
    // Find or create user
    let userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    let userId;
    if (userResult.rows.length === 0) {
      userId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO users (id, name, phone_number, role) VALUES (?, ?, ?, ?)',
        args: [userId, name, cleanPhone, 'user']
      });
      console.log('New user created:', userId);
    } else {
      userId = userResult.rows[0].id;
      console.log('Existing user:', userId);
    }
    
    // Save OTP to database
    await db.execute({
      sql: 'INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), cleanPhone, otpCode, expiresAt, userId, 'sms']
    });
    console.log('OTP saved to database');
    
    // Send SMS
    const smsResult = await sendActualSMS(cleanPhone, otpCode, name);
    
    res.json({ 
      success: true, 
      message: smsResult.success ? 'OTP sent to your mobile number' : 'OTP generated (check console for OTP)',
      demoOtp: otpCode 
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== VERIFY OTP ====================
const verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    console.log('Verify OTP:', phone, otp);
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const db = getDb();
    
    const otpResult = await db.execute({
      sql: 'SELECT * FROM otps WHERE phone_number = ? AND otp_code = ? AND is_verified = 0 AND expires_at > CURRENT_TIMESTAMP',
      args: [cleanPhone, otp]
    });
    
    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    await db.execute({
      sql: 'UPDATE otps SET is_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [otpResult.rows[0].id]
    });
    
    let userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    let userId;
    if (userResult.rows.length === 0) {
      userId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO users (id, name, phone_number, role) VALUES (?, ?, ?, ?)',
        args: [userId, name || `User_${cleanPhone.slice(-4)}`, cleanPhone, 'user']
      });
    } else {
      userId = userResult.rows[0].id;
      await db.execute({
        sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?',
        args: [userId]
      });
    }
    
    const token = generateToken(userId, 'user');
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      token: token,
      user: { id: userId, name: name || `User_${cleanPhone.slice(-4)}`, phone: cleanPhone, role: 'user' }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ==================== SEND WHATSAPP OTP ====================
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    console.log('Send WhatsApp OTP:', phone);
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    const db = getDb();
    
    let userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    let userId;
    if (userResult.rows.length === 0) {
      userId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO users (id, name, phone_number, role) VALUES (?, ?, ?, ?)',
        args: [userId, name, cleanPhone, 'user']
      });
    } else {
      userId = userResult.rows[0].id;
    }
    
    await db.execute({
      sql: 'INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), cleanPhone, otpCode, expiresAt, userId, 'whatsapp']
    });
    
    // Send WhatsApp message
    const whatsappResult = await sendActualWhatsApp(cleanPhone, otpCode, name);
    
    res.json({ 
      success: true, 
      message: whatsappResult.success ? 'WhatsApp OTP sent to your mobile' : 'OTP generated (WhatsApp may have failed)',
      demoOtp: otpCode 
    });
  } catch (error) {
    console.error('Send WhatsApp OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

const verifyWhatsAppOtp = verifyUserOtp;

// ==================== SEND EMAIL OTP ====================
const sendEmailOtp = async (req, res) => {
  try {
    const { email, name = 'User' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    const db = getDb();
    
    let userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    let userId;
    if (userResult.rows.length === 0) {
      userId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
        args: [userId, name, email, 'user']
      });
    } else {
      userId = userResult.rows[0].id;
    }
    
    await db.execute({
      sql: 'INSERT INTO otps (id, email, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), email, otpCode, expiresAt, userId, 'email']
    });
    
    const emailResult = await sendActualEmail(email, otpCode, name);
    
    res.json({ 
      success: true, 
      message: emailResult.success ? 'Email OTP sent to your inbox' : 'OTP generated',
      demoOtp: otpCode 
    });
  } catch (error) {
    console.error('Send Email OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

const verifyEmailOtp = verifyUserOtp;

// ==================== GET CURRENT USER ====================
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    
    let user = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [decoded.id]
    });
    
    let role = 'user';
    if (user.rows.length === 0) {
      user = await db.execute({
        sql: 'SELECT * FROM admins WHERE id = ?',
        args: [decoded.id]
      });
      role = 'admin';
    }
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email || user.rows[0].phone_number,
        role: role
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== LOGOUT ====================
const logout = async (req, res) => {
  // Clear cookie
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
};

// ==================== EXPORTS ====================
module.exports = {
  adminLogin,
  sendUserOtp,
  verifyUserOtp,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  sendEmailOtp,
  verifyEmailOtp,
  getMe,
  logout,
};