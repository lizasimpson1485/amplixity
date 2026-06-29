const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create sessions table if it doesn't exist
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(20) PRIMARY KEY,
        client_name VARCHAR(255),
        data JSONB,
        outputs JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database ready');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}
initDB();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API: Generate output via Anthropic proxy
app.post('/api/generate', async (req, res) => {
  const key = process.env.ANTHROPIC_KEY || '';
  console.log('Generate request, key present:', !!key);
  if (!key) return res.status(500).json({ error: 'API key not configured' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    console.log('Anthropic status:', r.status);
    res.status(r.status).json(data);
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: Save session
app.post('/api/sessions', async (req, res) => {
  const { id, clientName, data, outputs } = req.body;
  if (!id) return res.status(400).json({ error: 'Session ID required' });
  try {
    await pool.query(`
      INSERT INTO sessions (id, client_name, data, outputs, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE
      SET client_name = $2, data = $3, outputs = $4, updated_at = NOW()
    `, [id, clientName || 'Unnamed', data || {}, outputs || {}]);
    res.json({ success: true, id, url: `/?session=${id}` });
  } catch (err) {
    console.error('Save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: Load session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Load error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: List all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, client_name, created_at, updated_at, outputs FROM sessions ORDER BY updated_at DESC');
    res.json(result.rows.map(r => ({
      id: r.id,
      clientName: r.client_name,
      updatedAt: r.updated_at,
      outputCount: Object.keys(r.outputs || {}).length
    })));
  } catch (err) {
    console.error('List error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: Delete session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve app for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Amplixity Workshop running on port ${PORT}`));
