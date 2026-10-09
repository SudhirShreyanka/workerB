const nodemailer = require('nodemailer');
const { config } = require('./config');

let cachedTransporter = null;

function getTransporter() {
  if (!config.gmailUser || !config.gmailAppPassword) {
    const err = new Error('SMTP credentials are not configured on the server.');
    err.code = 'CONFIG_MISSING';
    throw err;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.gmailUser,
        pass: config.gmailAppPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return cachedTransporter;
}

async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"Worker Service" <${config.gmailUser}>`,
    to,
    subject,
    text,
  };

  if (html) {
    mailOptions.html = html;
  }

  return await transporter.sendMail(mailOptions);
}

module.exports = {
  getTransporter,
  sendMail,
};
