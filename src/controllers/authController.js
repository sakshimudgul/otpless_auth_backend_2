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
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
  
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
  console.log(`=========================================`);
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found in .env`);
    return { success: false, error: 'API key missing' };
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
    return { success: false, error: error.message };
  }
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

// ==================== BUSINESS USER LOGIN (Only admin-created) ====================
const businessUserLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ? AND role = ?',
      args: [email, 'user']
    });

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please contact your administrator for access.' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Account not set up yet. Please contact your administrator.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive. Please contact your administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update login count
    await db.execute({
      sql: 'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?',
      args: [user.id]
    });

    const token = generateToken(user.id, 'user');

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone_number,
        business_name: user.business_name,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Business user login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

// ==================== SMS OTP (Regular Users) ====================
const sendUserOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    const db = getDb();
    console.log(`🔑 Generated OTP: ${otpCode} for ${cleanPhone}`);
    
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
    await db.execute({
      sql: 'INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), cleanPhone, otpCode, expiresAt, userId, 'sms']
    });
    console.log('OTP saved to database');
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

const verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
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

// ==================== WHATSAPP OTP ====================
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
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

// ==================== EMAIL OTP ====================
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
    console.log(`📧 Email OTP for ${email}: ${otpCode}`);
    res.json({ 
      success: true, 
      message: 'Email OTP sent to your inbox',
      demoOtp: otpCode 
    });
  } catch (error) {
    console.error('Send Email OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

const verifyEmailOtp = verifyUserOtp;

// ==================== END USER OTP LOGIN (Auto-Register) ====================
const sendEndUserOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    const cleanPhone = phone.replace(/\D/g, '');
    const db = getDb();
    let endUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    let endUserId;
    if (endUser.rows.length === 0) {
      endUserId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO end_users (id, name, phone_number, is_verified) 
              VALUES (?, ?, ?, ?)`,
        args: [endUserId, name || `User_${cleanPhone.slice(-4)}`, cleanPhone, 0]
      });
      console.log(`✅ New end user created: ${cleanPhone}`);
    } else {
      endUserId = endUser.rows[0].id;
      if (name && name !== 'User') {
        await db.execute({
          sql: 'UPDATE end_users SET name = ? WHERE id = ?',
          args: [name, endUserId]
        });
      }
    }
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    await db.execute({
      sql: 'DELETE FROM otps WHERE phone_number = ? AND is_verified = 0',
      args: [cleanPhone]
    });
    await db.execute({
      sql: 'INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), cleanPhone, otpCode, expiresAt, endUserId, 'enduser']
    });
    console.log(`📱 EndUser OTP for ${cleanPhone}: ${otpCode}`);
    try {
      const smsResult = await sendActualSMS(cleanPhone, otpCode, name || 'User');
      console.log(`📨 SMS send result:`, smsResult);
    } catch (smsError) {
      console.log(`⚠️ SMS sending failed, but OTP is stored:`, smsError.message);
    }
    res.json({ 
      success: true, 
      message: 'OTP sent to your phone',
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send end user OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
  }
};

const verifyEndUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });
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
    let endUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    let endUserId;
    if (endUser.rows.length === 0) {
      endUserId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO end_users (id, name, phone_number, is_verified) 
              VALUES (?, ?, ?, ?)`,
        args: [endUserId, name || `User_${cleanPhone.slice(-4)}`, cleanPhone, 1]
      });
    } else {
      endUserId = endUser.rows[0].id;
      await db.execute({
        sql: 'UPDATE end_users SET is_verified = 1 WHERE id = ?',
        args: [endUserId]
      });
      if (name && name !== 'User') {
        await db.execute({
          sql: 'UPDATE end_users SET name = ? WHERE id = ?',
          args: [name, endUserId]
        });
      }
    }
    const updatedEndUser = await db.execute({
      sql: 'SELECT id, name, phone_number, email FROM end_users WHERE id = ?',
      args: [endUserId]
    });
    const token = generateToken(endUserId, 'enduser');
    res.json({
      success: true,
      token,
      user: {
        id: updatedEndUser.rows[0].id,
        name: updatedEndUser.rows[0].name,
        phone: updatedEndUser.rows[0].phone_number,
        email: updatedEndUser.rows[0].email || null,
        role: 'enduser'
      }
    });
  } catch (error) {
    console.error('Verify end user OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP: ' + error.message });
  }
};

// ==================== CREATE END USER (For Business Users) ====================
const createEndUser = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { name, phone_number, email } = req.body;
    if (!name || !phone_number) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }
    const cleanPhone = phone_number.replace(/\D/g, '');
    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT * FROM end_users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'End user with this phone number already exists' });
    }
    const endUserId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO end_users (id, user_id, name, phone_number, email, is_verified) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [endUserId, userId, name, cleanPhone, email || null, 0]
    });
    const newEndUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE id = ?',
      args: [endUserId]
    });
    res.json({ 
      success: true, 
      message: 'End user created successfully',
      endUser: newEndUser.rows[0]
    });
  } catch (error) {
    console.error('Create end user error:', error);
    res.status(500).json({ error: 'Failed to create end user: ' + error.message });
  }
};

// ==================== GET CURRENT USER ====================
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    let admin = await db.execute({
      sql: 'SELECT id, name, email, role FROM admins WHERE id = ?',
      args: [decoded.id]
    });
    if (admin.rows.length > 0) {
      return res.json({ success: true, user: { ...admin.rows[0], role: 'admin' } });
    }
    let user = await db.execute({
      sql: 'SELECT id, name, email, phone_number, business_name, role FROM users WHERE id = ?',
      args: [decoded.id]
    });
    if (user.rows.length > 0) {
      return res.json({ success: true, user: { ...user.rows[0], role: 'user' } });
    }
    let endUser = await db.execute({
      sql: 'SELECT id, name, phone_number, email FROM end_users WHERE id = ?',
      args: [decoded.id]
    });
    if (endUser.rows.length > 0) {
      return res.json({ success: true, user: { ...endUser.rows[0], role: 'enduser' } });
    }
    return res.status(401).json({ error: 'User not found' });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== LOGOUT ====================
const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
};

// ==================== EXPORTS ====================
module.exports = {
  adminLogin,
  businessUserLogin,
  sendUserOtp,
  verifyUserOtp,
  sendWhatsAppOtp,
  verifyWhatsAppOtp,
  sendEmailOtp,
  verifyEmailOtp,
  getMe,
  logout,
  sendEndUserOtp,
  verifyEndUserOtp,
  createEndUser,
};