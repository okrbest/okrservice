import { Model } from 'mongoose';

import { IModels } from '../connectionResolver';
import {
  ITicketViewLinkDocument,
  ticketViewLinkSchema,
} from './definitions/ticketViewLinks';
import {
  TICKET_VIEW_ISSUE_LIMIT_PER_MINUTE,
  TICKET_VIEW_ISSUE_WINDOW_MS,
  generateToken,
  hashToken,
  isLinkActive,
  linksToPrune,
  nextExpiry,
  revokedExpiry,
  shouldExtend,
} from '../ticketViewLink';

export const TICKET_VIEW_LINK_EXPIRED = 'TICKET_VIEW_LINK_EXPIRED';
export const TICKET_VIEW_RATE_LIMITED = 'TICKET_VIEW_RATE_LIMITED';

type LinkTarget = {
  ticketId: string;
  customerId: string;
};

export interface ITicketViewLinkModel extends Model<ITicketViewLinkDocument> {
  createLink(
    target: LinkTarget,
    now?: Date,
  ): Promise<{ token: string; expiresAt: Date }>;
  useLink(tokenHash: string, now?: Date): Promise<LinkTarget>;
}

export { ticketViewLinkSchema };

export const loadTicketViewLinkClass = (models: IModels) => {
  class TicketViewLink {
    /** 열쇠를 새로 만들어 지문만 저장하고, 원문은 이번 응답으로 한 번만 돌려준다 */
    public static async createLink(
      { ticketId, customerId }: LinkTarget,
      now: Date = new Date(),
    ) {
      // 발급 남용 막기: 고객당 1분 발급 수 제한(폐기된 링크 기록도 센다)
      const recent = await models.TicketViewLinks.countDocuments({
        customerId,
        createdAt: {
          $gte: new Date(now.getTime() - TICKET_VIEW_ISSUE_WINDOW_MS),
        },
      });

      if (recent >= TICKET_VIEW_ISSUE_LIMIT_PER_MINUTE) {
        throw new Error(TICKET_VIEW_RATE_LIMITED);
      }

      const token = generateToken();
      const expiresAt = nextExpiry(now);

      await models.TicketViewLinks.create({
        tokenHash: hashToken(token),
        ticketId,
        customerId,
        createdAt: now,
        lastUsedAt: now,
        expiresAt,
      });

      // 같은 티켓·고객의 링크는 최근 것만 남긴다. 나머지는 바로 못 쓰게 하고,
      // 기록은 발급 수를 세는 1분 뒤 TTL이 지운다
      const links = await models.TicketViewLinks.find(
        { ticketId, customerId, revokedAt: null },
        { _id: 1, createdAt: 1 },
      ).lean();
      const pruneIds = linksToPrune(links as any);

      if (pruneIds.length) {
        await models.TicketViewLinks.updateMany(
          { _id: { $in: pruneIds } },
          { $set: { revokedAt: now, expiresAt: revokedExpiry(now) } },
        );
      }

      return { token, expiresAt };
    }

    /**
     * 열쇠 지문으로 확인하고 쓰는 중이면 만료를 하루 뒤로 늦춘다.
     * 없음·만료·형식 오류는 모두 같은 오류로 답한다(어느 쪽인지 알려 주지 않음).
     */
    public static async useLink(tokenHash: string, now: Date = new Date()) {
      if (typeof tokenHash !== 'string' || !/^[0-9a-f]{64}$/.test(tokenHash)) {
        throw new Error(TICKET_VIEW_LINK_EXPIRED);
      }

      const link = await models.TicketViewLinks.findOne({ tokenHash }).lean();

      if (!link || !isLinkActive(link, now)) {
        throw new Error(TICKET_VIEW_LINK_EXPIRED);
      }

      if (shouldExtend(link, now)) {
        await models.TicketViewLinks.updateOne(
          { _id: link._id },
          { $set: { lastUsedAt: now, expiresAt: nextExpiry(now) } },
        );
      }

      return { ticketId: link.ticketId, customerId: link.customerId };
    }
  }

  ticketViewLinkSchema.loadClass(TicketViewLink);

  return ticketViewLinkSchema;
};
