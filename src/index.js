const express = require('express');
const dns = require('dns');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { config, logConfigStatus } = require('./config');
const { authenticateToken } = require('./middleware/auth');
const { sendMail } = require('./mailer');

// Force DNS resolution to prefer IPv4 over IPv6 on cloud hosts like Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();

// Trust reverse proxy headers (Cloudflare, Render, Railway, etc.)
app.set('trust proxy', 1);

/**
 * 1. CORS Configuration
 * Restricts cross-origin browser requests to the authorized frontend origin.
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server curl / reverse proxy without Origin header)
    if (!origin) return callback(null, true);

    const allowed = config.frontendOrigin.split(',').map((o) => o.trim());
    if (allowed.includes('*') || allowed.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS policy violation: Origin ${origin} not permitted.`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

/**
 * 2. Health Check Endpoint
 * Minimal, fast endpoint for Render health probes and monitoring.
 * GET /health
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Request body size limit
app.use(express.json({ limit: '100kb' }));

// Graceful JSON parse error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON syntax.',
    });
  }
  next(err);
});

// Rate limiting for email dispatch
const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 dispatches per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    status: 'error',
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Manual email testing limit reached. Please retry later.',
  },
});

/**
 * Request validation helper
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRequest(body) {
  const errors = [];
  const { to, subject, text, html } = body || {};

  if (!to || typeof to !== 'string' || !EMAIL_REGEX.test(to.trim()) || to.length > 254) {
    errors.push('A valid "to" email address is required (e.g., recipient@example.com).');
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('A non-empty "subject" string is required.');
  } else if (subject.length > 250) {
    errors.push('"subject" must not exceed 250 characters.');
  }

  const hasText = typeof text === 'string' && text.trim().length > 0;
  const hasHtml = typeof html === 'string' && html.trim().length > 0;

  if (!hasText && !hasHtml) {
    errors.push('Either "text" or "html" message content must be provided.');
  }

  return errors;
}

/**
 * Protected Email Sending Endpoint
 * POST /api/send-email
 */
app.post('/api/send-email', emailRateLimiter, authenticateToken, async (req, res) => {
  const errors = validateRequest(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: 'Validation Error',
      details: errors,
    });
  }

  const { to, subject, text, html } = req.body;

  try {
    const result = await sendMail({
      to: to.trim(),
      subject: subject.trim(),
      text: typeof text === 'string' ? text.trim() : undefined,
      html: typeof html === 'string' ? html.trim() : undefined,
    });

    console.log(`[Backend Log] Dispatched email: ID ${result.messageId} to ${to.trim()}`);

    return res.status(200).json({
      status: 'success',
      message: 'Email accepted by SMTP server for delivery',
      details: {
        messageId: result.messageId,
        recipient: to.trim(),
        accepted: result.accepted,
        rejected: result.rejected,
      },
      note: 'The SMTP server has accepted the message for delivery. Final inbox arrival depends on destination mail filtering and spam policies.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Backend Log Error] Dispatch failed to ${to}:`, error.message, error.code || '');

    if (error.code === 'CONFIG_MISSING') {
      return res.status(503).json({
        status: 'error',
        error: 'Service Unavailable',
        message: 'SMTP credentials are not configured on the backend server.',
      });
    }

    const isNetworkTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ESOCKET' || error.code === 'ENETUNREACH';
    const clientMessage = isNetworkTimeout
      ? `SMTP network connection failed (${error.code || 'BLOCKED'}). Ensure IPv4 reachability and open SMTP ports (587).`
      : 'The SMTP server was unable to send the email. Please verify recipient address and SMTP credentials.';

    return res.status(502).json({
      status: 'error',
      error: 'Email Delivery Failed',
      code: error.code || 'SMTP_ERROR',
      message: clientMessage,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Backend Unhandled Error]', err.message);
  res.status(err.status || 500).json({
    status: 'error',
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Start listening
const PORT = config.port;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`[Backend API] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[Backend API] Health check: GET http://0.0.0.0:${PORT}/health`);
  console.log(`[Backend API] Send endpoint: POST http://0.0.0.0:${PORT}/api/send-email`);
  console.log(`===============================================`);
  logConfigStatus();
});

module.exports = { app, server };
