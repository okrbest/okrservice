import * as mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/erxes';
const LOGIN_ID = 'e2e-user@test.com';
const CLIENT_ID = 'e2e-test-client';

export default async function globalTeardown() {
  const conn = await mongoose.connect(MONGO_URL);

  try {
    const db = conn.connection.db!;
    // Remove seeded test client
    await db.collection('clients').deleteMany({ clientId: CLIENT_ID });
    // Remove RPA messages created by tests (tests use loginId = LOGIN_ID)
    await db.collection('rpa_messages').deleteMany({ loginId: LOGIN_ID });
  } finally {
    await mongoose.disconnect();
  }
}
