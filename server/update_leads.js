const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const res = await db.collection('leads').updateMany({}, { $set: { isPipelineLead: true } });
  console.log(res);
  process.exit(0);
});
