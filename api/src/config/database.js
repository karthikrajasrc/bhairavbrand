import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI must be configured');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to MongoDB database "${mongoose.connection.name}"`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
