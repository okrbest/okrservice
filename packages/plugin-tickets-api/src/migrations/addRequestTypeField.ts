import { MongoClient } from 'mongodb';

export const addRequestTypeField = async (db: any) => {
  try {
    console.log('Adding requestType field to tickets collection...');
    
    // 기존 티켓 컬렉션에 requestType 필드 추가 (기본값: null)
    const result = await db.collection('tickets').updateMany(
      { requestType: { $exists: false } },
      { $set: { requestType: null } }
    );
    
    console.log(`Updated ${result.modifiedCount} tickets with requestType field`);
    
    // requestType 필드에 인덱스 추가 (선택사항)
    await db.collection('tickets').createIndex({ requestType: 1 });
    console.log('Created index on requestType field');
    
    return { success: true, updatedCount: result.modifiedCount };
  } catch (error) {
    console.error('Error adding requestType field:', error);
    throw error;
  }
};
