// 위젯 "위젯"(위젯·챗봇 관련 문의) 유형은 고객사 보드가 아니라 운영자 보드로 받는다(specs/006).
// 들어갈 단계는 운영 설정값 WIDGET_TICKET_STAGE_ID — 고객 화면이 보낸 단계보다 우선한다.
import { IModels } from './connectionResolver';

export const WIDGET_REQUEST_TYPE = 'widget';

/** 설정이 비었거나 그 단계가 없으면 원래 단계 — 제출은 실패시키지 않는다 */
export const resolveWidgetTicketStageId = async (
  models: IModels,
  doc: { type?: string; stageId?: string },
  configuredStageId?: string,
) => {
  const target = (configuredStageId || '').trim();

  if (doc.type !== WIDGET_REQUEST_TYPE || !target) {
    return doc.stageId;
  }

  if (!(await models.Stages.exists({ _id: target }))) {
    console.warn(
      `[widgets.createTicket] WIDGET_TICKET_STAGE_ID=${target} 단계가 없어 원래 보드로 보냅니다`,
    );
    return doc.stageId;
  }

  return target;
};

/** 수정에서 위젯 ↔ 다른 유형으로 바꾸면 티켓이 엉뚱한 보드에 남는다 */
export const isWidgetTypeSwitch = (currentType?: string, nextType?: string) =>
  nextType !== undefined &&
  nextType !== currentType &&
  (currentType === WIDGET_REQUEST_TYPE || nextType === WIDGET_REQUEST_TYPE);
