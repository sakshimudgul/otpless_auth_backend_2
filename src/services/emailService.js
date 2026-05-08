const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with RichSol settings
const createTransporter = () => {
  // Try different common ports for Indian hosting providers
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Important for some hosting providers
    },
    connectionTimeout: 10000,
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email using RichSol
const sendEmailOTP = async (email, otp, name = 'User') => {
  console.log(`📧 Attempting to send OTP to ${email} via RichSol...`);
  
  const templateId = process.env.EMAIL_TEMPLATE_ID;
  const templateName = process.env.EMAIL_TEMPLATE_NAME;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 500px; margin: 50px auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; text-align: center; }
        .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 8px; font-family: monospace; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .template-id { font-size: 11px; color: #999; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 OTP Verification</h1>
          <p>Template: ${templateName} (ID: ${templateId})</p>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your One-Time Password (OTP) for verification is:</p>
          <div class="otp-code">${otp}</div>
          <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          <p>For security reasons, do not share this OTP with anyone.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p class="template-id">Template ID: ${templateId}</p>
          <p>&copy; 2024 OTPless Auth. All rights reserved.</p>
        </div>
      </div>
    </html>
  `;
  
  const transporter = createTransporter();
  
  try {
    // Verify connection
    await transporter.verify();
    console.log('📧 RichSol SMTP connection verified');
    
    const info = await transporter.sendMail({
      from: `"OTPless Auth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your OTP Code - ${templateName}`,
      html: htmlContent,
      text: `Your OTP code is: ${otp}. Valid for 10 minutes.`,
    });
    
    console.log(`📧 Email sent successfully! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ RichSol Email error:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Check EMAIL_USER and EMAIL_PASS');
    } else if (error.code === 'ESOCKET') {
      console.error('   Connection failed. Check EMAIL_HOST and EMAIL_PORT');
    }
    return false;
  }
};

module.exports = { generateOTP, sendEmailOTP };