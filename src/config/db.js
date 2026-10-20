const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

// Workaround for Windows/router DNS servers failing SRV lookup (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {
  // fallback silently
}

const connectDB = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

module.exports = connectDB;
