const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/intelligent-hrm-attendance').then(async () => {
  const User = require('./backend/models/User');
  const users = await User.find();
  console.log('--- ALL USERS WITH FACE DATA ---');
  let hasFaceDataUsers = users.filter(u => u.faceEmbedding && u.faceEmbedding.length > 0);
  
  if(hasFaceDataUsers.length === 0) {
      console.log("NO USERS HAVE FACE DATA.");
  } else {
      hasFaceDataUsers.forEach(u => {
        console.log(`Name: ${u.name} | Role: ${u.role} | Email: ${u.email} | ID: ${u._id} | Length: ${u.faceEmbedding.length}`);
      });
  }
  console.log('----------------------------');
  process.exit(0);
}).catch(console.error);
