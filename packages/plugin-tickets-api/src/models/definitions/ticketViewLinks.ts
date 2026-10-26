import { field } from '@erxes/api-utils/src';
import { Document, Schema } from 'mongoose';

// 위젯 티켓 "새 탭에서 보기" 링크 열쇠. 열쇠 원문은 저장하지 않고 지문(tokenHash)만 둔다.
export interface ITicketViewLink {
  tokenHash: string;
  ticketId: string;
  customerId: string;
  createdAt: Date;
  lastUsedAt: Date;
  // 마지막 사용 + 24시간. 지나면 TTL 인덱스가 문서를 지운다
  expiresAt: Date;
  // 같은 티켓·고객 링크 수 상한으로 폐기된 시각. 있으면 열리지 않는다
  revokedAt?: Date | null;
}

export interface ITicketViewLinkDocument extends ITicketViewLink, Document {
  _id: string;
}

export const ticketViewLinkSchema = new Schema({
  _id: field({ pkey: true }),
  tokenHash: field({ type: String, label: 'Token hash', unique: true }),
  ticketId: field({ type: String, label: 'Ticket id' }),
  customerId: field({ type: String, label: 'Customer id' }),
  createdAt: field({ type: Date, label: 'Created at' }),
  lastUsedAt: field({ type: Date, label: 'Last used at' }),
  expiresAt: field({ type: Date, label: 'Expires at' }),
  revokedAt: field({ type: Date, label: 'Revoked at', optional: true }),
});

// 만료 시각이 지나면 Mongo가 문서를 지운다(삭제는 지연될 수 있어 사용할 때 시각도 함께 확인)
ticketViewLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// 같은 티켓·고객 링크 수 상한 정리, 고객당 발급 빈도 확인용
ticketViewLinkSchema.index({ ticketId: 1, customerId: 1, createdAt: -1 });
ticketViewLinkSchema.index({ customerId: 1, createdAt: -1 });
