const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const email = 'agent_test_99@example.com';
  const password = 'password123';

  await User.deleteOne({ email });
  const user = await User.create({ name: 'Agent', email, password, role: 'agent' });
  
  const fetchedUser = await User.findOne({ email }).select('+password');
  console.log("Hashed password:", fetchedUser.password);

  const isMatch = await fetchedUser.matchPassword(password);
  console.log("Password matches?", isMatch);
  
  process.exit(0);
});
