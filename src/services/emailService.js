const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Email
const sendEmailOTP = async (email, otp, name = 'User') => {
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
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
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
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"OTPless Auth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your OTP Code - ${templateName}`,
      html: htmlContent,
    });
    
    console.log(`📧 Email OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

module.exports = { generateOTP, sendEmailOTP };