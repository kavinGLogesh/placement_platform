const http = require('http');

const PORT = 80;
const TARGET_PORT = 5173;

const server = http.createServer((req, res) => {
  const hostHeader = req.headers.host ? req.headers.host.split(':')[0] : 'localhost';
  const targetUrl = `http://${hostHeader}:${TARGET_PORT}${req.url || '/'}`;
  res.writeHead(302, { Location: targetUrl });
  res.end(`Redirecting to ${targetUrl}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Port 80 redirect service running: redirects to port ${TARGET_PORT}`);
});

server.on('error', (err) => {
  console.error('Port 80 redirect service error:', err.message);
});

