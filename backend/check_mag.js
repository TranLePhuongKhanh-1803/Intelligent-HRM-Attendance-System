const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/intelligent-hrm-attendance').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ faceEmbedding: [Number] }));
  const user = await User.findOne({ faceEmbedding: { $ne: [] } });
  if (user) {
    const emb = user.faceEmbedding.slice(0, 512);
    let sum = 0;
    for(let val of emb) sum += val * val;
    console.log('Magnitude:', Math.sqrt(sum));
    console.log('First 5:', emb.slice(0, 5));
  } else {
    console.log("No user found");
  }
  process.exit(0);
});
