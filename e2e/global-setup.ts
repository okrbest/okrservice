import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/erxes';
const CLIENT_ID = 'e2e-test-client';

export default async function globalSetup() {
  await mongoose.connect(MONGO_URL);

  try {
    const db = mongoose.connection.db!;

    // 1. RPA Client seed
    await db.collection('clients').deleteMany({ clientId: CLIENT_ID });

    const clientSecret = await bcrypt.hash('e2e-test-secret', 10);
    await db.collection('clients').insertOne({
      _id: nanoid(),
      name: 'e2e-test-client',
      clientId: CLIENT_ID,
      clientSecret,
      refreshToken: '',
      whiteListedIps: [],
      createdAt: new Date(),
    } as any);

    // 2. Get existing Integration brand_id for widget URL
    // integrations._id is used as brand_id in erxes widget settings
    if (!process.env.TEST_BRAND_ID) {
      const integration = await db.collection('integrations').findOne(
        { kind: 'messenger' },
        { projection: { _id: 1 } }
      );
      if (!integration) {
        throw new Error(
          '[E2E globalSetup] messenger 타입 Integration이 DB에 없습니다.\n' +
          '해결방법: 관리자 UI에서 채널/통합을 생성하거나 TEST_BRAND_ID 환경변수를 설정하세요.'
        );
      }
      process.env.TEST_BRAND_ID = integration._id.toString();
    }

    console.log('[E2E] TEST_BRAND_ID:', process.env.TEST_BRAND_ID);
  } finally {
    await mongoose.disconnect();
  }
}
