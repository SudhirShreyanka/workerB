require('dotenv').config();

const rawPort = process.env.PORT;
const parsedPort = parseInt(rawPort, 10);
const port = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 5000;

const config = {
  port,
  gmailUser: process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') : '',
  apiSecret: process.env.API_SECRET ? process.env.API_SECRET.trim() : '',
  frontendOrigin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.trim().replace(/\/+$/, '') : '*',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
};

function logConfigStatus() {
  console.log(`[Backend Config] Port: ${config.port} (source: ${rawPort ? 'process.env.PORT' : 'default: 5000'})`);
  console.log(`[Backend Config] GMAIL_USER: ${config.gmailUser ? 'Configured (✓)' : 'MISSING (✗)'}`);
  console.log(`[Backend Config] GMAIL_APP_PASSWORD: ${config.gmailAppPassword ? 'Configured (✓)' : 'MISSING (✗)'}`);
  console.log(`[Backend Config] API_SECRET: ${config.apiSecret ? 'Configured (✓)' : 'MISSING (✗)'}`);
  console.log(`[Backend Config] FRONTEND_ORIGIN: ${config.frontendOrigin}`);
  console.log(`[Backend Config] SMTP Endpoint: ${config.smtpHost}:${config.smtpPort} (Secure: ${config.smtpSecure})`);

  const missing = [];
  if (!config.gmailUser) missing.push('GMAIL_USER');
  if (!config.gmailAppPassword) missing.push('GMAIL_APP_PASSWORD');
  if (!config.apiSecret) missing.push('API_SECRET');

  if (missing.length > 0) {
    console.warn(`[Backend Warning] Missing environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  config,
  logConfigStatus,
};
