const nodemailer = require('nodemailer');
require('dotenv').config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Try multiple SMTP configurations
const getTransporter = async () => {
  const configs = [
    { host: 'mail.richsol.com', port: 587, secure: false },
    { host: 'mail.richsol.com', port: 25, secure: false },
    { host: 'smtp.richsol.com', port: 587, secure: false },
    { host: 'richsol.com', port: 587, secure: false },
    { host: 'localhost', port: 25, secure: false }, // If email is on same server
  ];
  
  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: 'developer.intern@richsol.com',
          pass: 'Intel@2026',
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 5000,
      });
      
      await transporter.verify();
      console.log(`✅ Found working SMTP: ${config.host}:${config.port}`);
      return transporter;
    } catch (error) {
      console.log(`❌ Failed ${config.host}:${config.port}`);
    }
  }
  return null;
};

// Send OTP via SMTP
const sendEmailOTP = async (email, otpCode, name = 'User') => {
  console.log(`📧 Sending email OTP to ${email}...`);
  
  const transporter = await getTransporter();
  
  if (!transporter) {
    console.log(`❌ No working SMTP configuration found`);
    return false;
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center; }
        .otp { font-size: 32px; font-weight: bold; color: #667eea; padding: 20px; text-align: center; letter-spacing: 5px; }
        .content { padding: 20px; text-align: center; }
        .footer { font-size: 12px; color: #999; text-align: center; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 OTP Verification</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div class="otp">${otpCode}</div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>Do not share this code with anyone.</p>
        </div>
        <div class="footer">
          <p>Rich System Solutions PVT LTD.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const info = await transporter.sendMail({
      from: '"Rich System Solutions PVT LTD." <developer.intern@richsol.com>',
      to: email,
      subject: 'Your OTP Code',
      html: htmlContent,
      text: `Your OTP code is: ${otpCode}. Valid for 10 minutes.`,
    });
    
    console.log(`✅ Email sent! Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

module.exports = { generateOTP, sendEmailOTP };