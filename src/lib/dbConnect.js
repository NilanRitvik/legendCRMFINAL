import mongoose from 'mongoose';
import { enableDemoMode } from './dbMock';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  console.log(`[dbConnect] entering dbConnect. global.isDemoMode=${global.isDemoMode}, readyState=${mongoose.connection.readyState}, cached.conn=${!!cached.conn}`);
  if (global.isDemoMode) {
    return mongoose;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000, // Fail fast if DB is down/auth fails
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        global.isDemoMode = false;
        return mongooseInstance;
      })
      .catch((err) => {
        global.dbError = err.message;
        enableDemoMode();
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    global.dbError = e.message;
    enableDemoMode();
    return mongoose;
  }

  return cached.conn;
}

export default dbConnect;
