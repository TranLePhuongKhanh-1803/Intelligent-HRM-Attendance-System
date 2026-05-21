const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const dbName = conn.connection.name;
    const host = conn.connection.host;
    const port = conn.connection.port;
    console.log(`✅ MongoDB Connected: ${host}:${port}/${dbName}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
