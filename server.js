require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool, initDB } = require('./db');
const { sendEmailNotification } = require('./email');
const { sendWhatsAppNotification } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

// Rate limiter: max 10 enquiry submissions per IP per hour
const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: "Bunny's Kids Backend", time: new Date().toISOString() });
});

// ── POST /api/enquiry — Submit enquiry form ───────────────────────────────────
app.post('/api/enquiry', enquiryLimiter, async (req, res) => {
  const { parent_name, child_name, phone, child_age, program, message } = req.body;

  // Validate required fields
  if (!parent_name || !child_name || !phone) {
    return res.status(400).json({
      success: false,
      error: 'Parent name, child name, and phone number are required.',
    });
  }

  // Basic phone validation
  const cleanPhone = phone.replace(/\s/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ success: false, error: 'Please enter a valid phone number.' });
  }

  try {
    // 1. Save to database
    const result = await pool.query(
      `INSERT INTO enquiries (parent_name, child_name, phone, child_age, program, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, submitted_at`,
      [parent_name.trim(), child_name.trim(), cleanPhone, child_age || null, program || null, message || null]
    );

    const enquiryId = result.rows[0].id;
    const submittedAt = result.rows[0].submitted_at;
    const enquiry = { parent_name, child_name, phone: cleanPhone, child_age, program, message };

    console.log(`✅ Enquiry #${enquiryId} saved — ${parent_name} (${phone})`);

    // 2. Send notifications (in background — don't block response)
    Promise.allSettled([
      sendEmailNotification(enquiry),
      sendWhatsAppNotification(enquiry),
    ]).then(results => {
      const emailResult = results[0];
      const waResult = results[1];
      if (emailResult.status === 'rejected') console.error('Email failed:', emailResult.reason?.message);
      if (waResult.status === 'rejected') console.error('WhatsApp failed:', waResult.reason?.message);

      // Mark as notified in DB
      pool.query('UPDATE enquiries SET notified = TRUE WHERE id = $1', [enquiryId]).catch(() => {});
    });

    // 3. Respond immediately to user
    res.status(201).json({
      success: true,
      message: "Thank you! We've received your enquiry and will call you within 24 hours. 🎉",
      enquiry_id: enquiryId,
      submitted_at: submittedAt,
    });

  } catch (err) {
    console.error('❌ Enquiry error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again or call us directly at 99695-13499.',
    });
  }
});

// ── GET /api/enquiries — Admin: list all enquiries ────────────────────────────
// Simple token auth — protect this endpoint
app.get('/api/enquiries', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM enquiries ORDER BY submitted_at DESC LIMIT 100'
    );
    res.json({ success: true, count: result.rows.length, enquiries: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stats — Admin: quick stats ──────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const total = await pool.query('SELECT COUNT(*) FROM enquiries');
    const today = await pool.query(
      "SELECT COUNT(*) FROM enquiries WHERE submitted_at::date = CURRENT_DATE"
    );
    const byProgram = await pool.query(
      "SELECT program, COUNT(*) as count FROM enquiries WHERE program IS NOT NULL GROUP BY program ORDER BY count DESC"
    );
    res.json({
      success: true,
      stats: {
        total_enquiries: parseInt(total.rows[0].count),
        today: parseInt(today.rows[0].count),
        by_program: byProgram.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🐰 Bunny's Kids backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
    console.log(`📬 Enquiry endpoint: POST http://localhost:${PORT}/api/enquiry\n`);
  });
});
