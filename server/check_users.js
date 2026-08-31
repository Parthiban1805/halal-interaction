const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');

  const users = await User.find({});
  console.log("Users in DB:");
  users.forEach(u => {
    console.log(u.name, u.email, u._id, u.role);
  });

  process.exit(0);
});
