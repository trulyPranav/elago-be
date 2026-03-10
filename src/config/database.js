'use strict';

// Force Node.js DNS to prefer IPv4 — fixes querySrv ECONNREFUSED on Windows
require('dns').setDefaultResultOrder('ipv4first');

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,  // force IPv4 — prevents SRV resolution failures on Windows
  });

  isConnected = true;

  const { host, port, name } = mongoose.connection;
  console.log(`MongoDB connected → ${host}:${port}/${name}`);

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
    isConnected = false;
  });
};

module.exports = { connectDB };
