import mongoose from "mongoose";

// Exercises the real MongoDB connection (the same one used for `npm run dev`).
// Each caller passes its own namespace so test files that touch the database
// can run as separate Jest workers in parallel without racing each other's
// deleteMany()/create() calls against a shared database. Requires MongoDB
// running at MONGODB_URI (see web/backend/.env).
export async function connectTestDb(namespace) {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017", {
    dbName: `countdown_timer_test_${namespace}`,
  });
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
