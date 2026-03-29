const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmailNotification(enquiry) {
  const { parent_name, child_name, phone, child_age, program, message } = enquiry;

  // ── Email to Admin ────────────────────────────────────────────────────────
  const adminMail = {
    from: `"Bunny's Kids Website" <${process.env.GMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🎒 New Enquiry from ${parent_name} — ${program || 'Program TBD'}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e8edf3;border-radius:12px;">
        <div style="background:#1a2e4a;padding:20px;border-radius:8px;margin-bottom:24px;">
          <h2 style="color:#f5a623;margin:0;">🐰 Bunny's Kids — New Enquiry</h2>
          <p style="color:#ffffff;margin:6px 0 0;">Received on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr style="border-bottom:1px solid #e8edf3;">
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;width:40%;">Parent Name</td>
            <td style="padding:12px 8px;color:#2c3e50;">${parent_name}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8edf3;">
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;">Child's Name</td>
            <td style="padding:12px 8px;color:#2c3e50;">${child_name}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8edf3;">
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;">Phone</td>
            <td style="padding:12px 8px;color:#2c3e50;"><a href="tel:${phone}" style="color:#1a2e4a;">${phone}</a></td>
          </tr>
          <tr style="border-bottom:1px solid #e8edf3;">
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;">Child's Age</td>
            <td style="padding:12px 8px;color:#2c3e50;">${child_age || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e8edf3;">
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;">Program Interest</td>
            <td style="padding:12px 8px;color:#2c3e50;">${program || '—'}</td>
          </tr>
          <tr>
            <td style="padding:12px 8px;color:#6b7c93;font-weight:bold;">Message</td>
            <td style="padding:12px 8px;color:#2c3e50;">${message || '—'}</td>
          </tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fdf9f3;border-radius:8px;text-align:center;">
          <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" 
             style="background:#25D366;color:#fff;padding:12px 24px;border-radius:100px;text-decoration:none;font-weight:bold;display:inline-block;">
            💬 WhatsApp Parent
          </a>
        </div>
      </div>
    `,
  };

  // ── Confirmation email to Parent ──────────────────────────────────────────
  // Only send if parent provides email (phone is mandatory, email optional on form)
  // For now, we just send admin notification
  await transporter.sendMail(adminMail);
  console.log(`📧 Admin email sent for enquiry from ${parent_name}`);
}

module.exports = { sendEmailNotification };
