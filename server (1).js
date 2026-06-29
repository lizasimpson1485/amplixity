const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const key = process.env.ANTHROPIC_KEY || '';
  // Inject the key as a window variable before the closing </head>
  const injected = html.replace(
    '</head>',
    `<script>window.ANTHROPIC_KEY = "${key}";</script></head>`
  );
  res.send(injected);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Amplixity Workshop running on port ${PORT}`);
});
