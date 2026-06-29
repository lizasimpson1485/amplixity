const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.post('/api/generate', async (req, res) => {
  const key = process.env.ANTHROPIC_KEY || '';
  console.log('Request received, key present:', !!key, 'starts:', key.slice(0,12));
  if (!key) return res.status(500).json({ error: 'No API key found' });
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
    console.log('Anthropic status:', r.status, JSON.stringify(data).slice(0,100));
    res.status(r.status).json(data);
  } catch (err) {
    console.log('Fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Running on port', PORT));
