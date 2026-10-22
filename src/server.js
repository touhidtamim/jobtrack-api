const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const User = require('./models/User');
const Application = require('./models/Application');
const Interview = require('./models/Interview');

const start = async () => {
  await connectDB();
  // Make sure unique / collation indexes exist before accepting requests
  await Promise.all([User.init(), Application.init(), Interview.init()]);

  const server = app.listen(env.port, () => {
    console.log(`JobTrack API running on http://localhost:${env.port}/api (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
