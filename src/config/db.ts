import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Studio } from '../models/Studio';
import { initialStudios } from '../seeds/seedData';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studiospace';

  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('[Database] MongoDB connected successfully');

    // Run auto-seeding routine
    await autoSeedDatabase();
  } catch (err: any) {
    console.error(`[Database Warning] Could not connect to MongoDB: ${err?.message || err}`);
    console.log('[Database] Operating with resilient error boundary - API routes will handle offline state gracefully.');
  }
}

export async function autoSeedDatabase(): Promise<void> {
  try {
    // 1. Seed Examiner Accounts if not present
    const hostEmail = 'host@studiospace.com';
    const creatorEmail = 'creator@studiospace.com';

    const existingHost = await User.findOne({ email: hostEmail });
    if (!existingHost) {
      const hashedPassword = await bcrypt.hash('Host@1234', 10);
      await User.create({
        name: 'Elena Rostova',
        email: hostEmail,
        password: hashedPassword,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        role: 'host',
      });
      console.log(`[Database Seed] Created default host examiner account: ${hostEmail}`);
    }

    const existingCreator = await User.findOne({ email: creatorEmail });
    if (!existingCreator) {
      const hashedPassword = await bcrypt.hash('Creator@1234', 10);
      await User.create({
        name: 'Marcus Vance',
        email: creatorEmail,
        password: hashedPassword,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        role: 'creator',
      });
      console.log(`[Database Seed] Created default creator examiner account: ${creatorEmail}`);
    }

    // 2. Seed Initial Studios Catalog if empty
    const studioCount = await Studio.countDocuments();
    if (studioCount === 0) {
      await Studio.insertMany(initialStudios);
      console.log(`[Database Seed] Successfully seeded ${initialStudios.length} production studios into catalog.`);
    } else {
      console.log(`[Database] Studio catalog verified with ${studioCount} active stages.`);
    }
  } catch (seedErr: any) {
    console.error(`[Database Seed Warning] Auto-seeding encountered an issue: ${seedErr?.message || seedErr}`);
  }
}
