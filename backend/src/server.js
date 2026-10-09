require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'TimberBooks Backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Static Web App serving (if mobile/dist is built)
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../../mobile/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error Handler
app.use(errorHandler);

// Server startup
async function startServer(portOverride) {
  try {
    await connectDB();
    const listenPort = portOverride || PORT;
    return new Promise((resolve, reject) => {
      const server = app.listen(listenPort, '0.0.0.0', () => {
        console.log(`===============================================`);
        console.log(`🌲 TimberBooks Backend running on port ${listenPort}`);
        console.log(`🌲 Health Check: http://localhost:${listenPort}/health`);
        console.log(`===============================================`);
        resolve(server);
      });
      server.on('error', reject);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
