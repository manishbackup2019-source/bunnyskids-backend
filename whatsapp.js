const twilio = require('twilio');

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_account_sid_here') {
    return null; // Twilio not configured yet
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendWhatsAppNotification(enquiry) {
  const client = getClient();
  if (!client) {
    console.log('⚠️  Twilio not configured — skipping WhatsApp notification');
    return;
  }

  const { parent_name, child_name, phone, child_age, program } = enquiry;

  const messageBody = `🐰 *New Enquiry — Bunny's Kids*

👨‍👩‍👧 *Parent:* ${parent_name}
👶 *Child:* ${child_name}
📞 *Phone:* ${phone}
🎂 *Age:* ${child_age || 'Not specified'}
📚 *Program:* ${program || 'Not specified'}

Please follow up within 24 hours! 🌟`;

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.ADMIN_WHATSAPP,
      body: messageBody,
    });
    console.log(`💬 WhatsApp notification sent for enquiry from ${parent_name}`);
  } catch (err) {
    console.error('❌ WhatsApp send failed:', err.message);
    // Don't throw — WhatsApp failure shouldn't break the form submission
  }
}

module.exports = { sendWhatsAppNotification };
