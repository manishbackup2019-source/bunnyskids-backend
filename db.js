const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
});

// Create the enquiries table if it doesn't exist
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id            SERIAL PRIMARY KEY,
        parent_name   VARCHAR(200) NOT NULL,
        child_name    VARCHAR(200) NOT NULL,
        phone         VARCHAR(30)  NOT NULL,
        child_age     VARCHAR(50),
        program       VARCHAR(100),
        message       TEXT,
        submitted_at  TIMESTAMPTZ  DEFAULT NOW(),
        notified      BOOLEAN      DEFAULT FALSE
      );
    `);
    console.log('✅ Database table ready');
  } catch (err) {
    console.error('❌ DB init error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
