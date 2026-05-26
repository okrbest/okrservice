import * as mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/erxes';
const LOGIN_ID = 'e2e-user@test.com';
const CLIENT_ID = 'e2e-test-client';

export default async function globalTeardown() {
  await mongoose.connect(MONGO_URL);

  const db = mongoose.connection.db!;
  await db.collection('clients').deleteMany({ clientId: CLIENT_ID });
  await db.collection('rpa_messages').deleteMany({ loginId: LOGIN_ID });

  await mongoose.disconnect();
}
