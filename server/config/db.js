import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  try {
    if (uri) {
      console.log(`📡 [MongoDB] Connecting to ${uri.startsWith('mongodb+srv') ? 'MongoDB Atlas' : 'MongoDB URI'}...`);
      await mongoose.connect(uri);
      console.log('✅ [MongoDB] Connected successfully');
      return;
    }

    // In-memory fallback for local development & testing without live Atlas cluster
    console.warn('⚠️ [MongoDB] No MONGODB_URI set in environment. Launching in-memory MongoDB server...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create();
    uri = mongoMemoryServer.getUri();
    await mongoose.connect(uri);
    console.log(`✅ [MongoDB] In-memory MongoDB running at: ${uri}`);
  } catch (error) {
    console.error(`❌ [MongoDB] Connection error: ${error.message}`);
    // If external Atlas connection failed, try falling back to MongoMemoryServer in dev
    if (!mongoMemoryServer && process.env.NODE_ENV !== 'production') {
      try {
        console.warn('⚠️ [MongoDB] Falling back to MongoMemoryServer for development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create();
        const fallbackUri = mongoMemoryServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`✅ [MongoDB] Fallback in-memory MongoDB running at: ${fallbackUri}`);
        return;
      } catch (memErr) {
        console.error(`❌ [MongoDB] Failed to start in-memory fallback: ${memErr.message}`);
      }
    }
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
};
