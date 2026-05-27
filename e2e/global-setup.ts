import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost/erxes';
const CLIENT_ID = 'e2e-test-client';

export default async function globalSetup() {
  const conn = await mongoose.connect(MONGO_URL);

  try {
    const db = conn.connection.db!;

    // 0. rpa_messages sparse unique 인덱스 보장
    // 기존 중복 데이터 제거 후 인덱스 생성 (같은 loginId+messageCode 중 가장 최신 1개 유지)
    const dupPipeline = [
      { $match: { messageCode: { $exists: true, $nin: [null, ''] } } },
      { $sort: { receivedAt: -1 } },
      {
        $group: {
          _id: { loginId: '$loginId', messageCode: '$messageCode' },
          keepId: { $first: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ];
    const duplicates = await db.collection('rpa_messages').aggregate(dupPipeline as any[]).toArray();
    for (const dup of duplicates) {
      await db.collection('rpa_messages').deleteMany({
        loginId: dup._id.loginId,
        messageCode: dup._id.messageCode,
        _id: { $ne: dup.keepId },
      });
    }
    await db.collection('rpa_messages').createIndex(
      { loginId: 1, messageCode: 1 },
      { unique: true, sparse: true, background: true },
    );

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

    // 2. Get Brand code for widget URL
    // Widget erxesSettings.messenger.brand_id = brands.code (NOT brands._id or integrations._id)
    if (!process.env.TEST_BRAND_ID) {
      const integration = await db.collection('integrations').findOne(
        { kind: 'messenger', brandId: { $exists: true } },
        { projection: { brandId: 1 } }
      );
      if (!integration?.brandId) {
        throw new Error(
          '[E2E globalSetup] messenger 타입 Integration이 DB에 없습니다.\n' +
          '해결방법: 관리자 UI에서 채널/통합을 생성하거나 TEST_BRAND_ID 환경변수를 설정하세요.'
        );
      }
      const brand = await db.collection('brands').findOne(
        { _id: integration.brandId },
        { projection: { code: 1 } }
      );
      if (!brand?.code) {
        throw new Error(`[E2E globalSetup] Brand를 찾을 수 없습니다 (brandId: ${integration.brandId})`);
      }
      process.env.TEST_BRAND_ID = brand.code;
    }

    console.log('[E2E] TEST_BRAND_ID:', process.env.TEST_BRAND_ID);
  } finally {
    await mongoose.disconnect();
  }
}
