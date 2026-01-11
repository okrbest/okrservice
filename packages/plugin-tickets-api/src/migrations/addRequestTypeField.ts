import { MongoClient } from 'mongodb';

export const addRequestTypeField = async (db: any) => {
  try {
    // 기존 티켓 컬렉션에 requestType 필드 추가 (기본값: null)
    const result = await db.collection('tickets').updateMany(
      { requestType: { $exists: false } },
      { $set: { requestType: null } }
    );
    
    // requestType 필드에 인덱스 추가 (선택사항)
    await db.collection('tickets').createIndex({ requestType: 1 });
    
    return { success: true, updatedCount: result.modifiedCount };
  } catch (error) {
    throw error;
  }
};
