const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/intelligent-hrm-attendance').then(async () => {
  const User = require('./backend/models/User');
  const users = await User.find({ faceEmbedding: { $ne: [] } });
  users.forEach(u => console.log(u.name, u.email, u._id, u.faceEmbedding.length));
  process.exit(0);
});
