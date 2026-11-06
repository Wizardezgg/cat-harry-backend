import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Studio } from '../models/Studio';

let cachedConnection: typeof mongoose | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1 && cachedConnection) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studiospace';

  try {
    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    cachedConnection = connection;
    console.log('[Database] MongoDB connected successfully');

    // Auto-seed only on cold start if empty
    await autoSeedDatabase();
    return connection;
  } catch (err: any) {
    console.error(`[Database Warning] Could not connect to MongoDB: ${err?.message || err}`);
    throw err;
  }
}

export async function autoSeedDatabase(): Promise<void> {
  try {
    // Active Studio Catalog Count Check
    const studioCount = await Studio.countDocuments();
    console.log(`[Database] Active studios in network: ${studioCount}`);
  } catch (seedErr: any) {
    console.error(`[Database Warning] Status check encountered an issue: ${seedErr?.message || seedErr}`);
  }
}
