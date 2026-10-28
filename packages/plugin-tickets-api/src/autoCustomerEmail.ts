// 직원이 위젯 댓글을 달고 10분 동안 "Send Email"을 누르지 않으면 고객 알림 메일을 자동으로 1통 보낸다.
// - 댓글 때 티켓에 autoEmailDueAt(마지막 댓글 + 10분)을 적고(덮어쓰기라 마지막 댓글 기준)
// - 1분마다 예정이 지난 티켓을 하나씩 가져가며 지운 뒤(여러 서버여도 한 서버만 가져감) 트리거를 보낸다.
// - "Send Email" 버튼과 같은 자동화를 쓰지만 emailSent는 바꾸지 않아 버튼은 켜진 채 남는다.
import { IModels } from './connectionResolver';
import { BOARD_STATUSES } from './models/definitions/constants';

export const AUTO_CUSTOMER_EMAIL_DELAY_MS = 10 * 60 * 1000;
export const AUTO_CUSTOMER_EMAIL_CHECK_MS = 60 * 1000;
// 한 번 확인에서 처리할 최대 티켓 수(밀린 예약이 많아도 한 주기를 오래 붙잡지 않게)
export const AUTO_CUSTOMER_EMAIL_BATCH_LIMIT = 50;

// 단일 테넌트(VERSION=os)에서는 subdomain 값과 상관없이 같은 DB를 쓴다
const OS_SUBDOMAIN = 'os';

type SendFn = (payload: any) => Promise<unknown>;

export function computeAutoEmailDueAt(now: Date): Date {
  return new Date(now.getTime() + AUTO_CUSTOMER_EMAIL_DELAY_MS);
}

// "Send Email" 버튼(mutations/utils.ts manualEmailRequest)과 같은 트리거
function manualEmailTrigger(subdomain: string, ticket: any) {
  return {
    subdomain,
    serviceName: 'automations',
    action: 'trigger',
    data: {
      type: 'tickets:ticket',
      // 버튼 흐름과 같이 "발송 전" 상태로 넘긴다(DB의 emailSent는 바꾸지 않음)
      targets: [{ ...ticket, manualEmailRequest: true, emailSent: false }],
      triggerSource: 'manualEmailRequest',
    },
  };
}

async function claimNextDueTicket(models: IModels, now: Date) {
  const claimed = await models.Tickets.findOneAndUpdate(
    { autoEmailDueAt: { $lte: now } },
    { $unset: { autoEmailDueAt: '' } },
  );

  if (!claimed) return null;

  return claimed.toObject ? claimed.toObject() : { ...claimed };
}

// 전송 계층 오류(메시지 서버 끊김 등)로 못 보낸 예약을 다음 확인 때로 되돌린다.
// 그사이 새 댓글이 더 최신 예약을 남겼으면 덮지 않는다.
async function restoreReservation(
  models: IModels,
  ticketId: string,
  now: Date,
) {
  await models.Tickets.updateOne(
    { _id: ticketId, autoEmailDueAt: { $exists: false } },
    {
      $set: {
        autoEmailDueAt: new Date(now.getTime() + AUTO_CUSTOMER_EMAIL_CHECK_MS),
      },
    },
  );
}

// 예정 시각이 지난 예약을 처리하고 실제로 트리거를 보낸 수를 돌려준다
export async function processDueAutoCustomerEmails(
  models: IModels,
  subdomain: string,
  now: Date,
  send: SendFn,
): Promise<number> {
  let sent = 0;

  for (let i = 0; i < AUTO_CUSTOMER_EMAIL_BATCH_LIMIT; i += 1) {
    const ticket = await claimNextDueTicket(models, now);

    if (!ticket) break;
    if (ticket.status === BOARD_STATUSES.ARCHIVED) continue;

    try {
      await send(manualEmailTrigger(subdomain, ticket));
      sent += 1;
    } catch (error) {
      console.error(
        `자동 고객 알림 메일 트리거 실패 (ticket ${ticket._id}):`,
        error,
      );
      // 다음 티켓도 같은 이유로 실패하므로 이번 확인은 멈추고, 이 예약만 다음 확인 때 다시 시도
      await restoreReservation(models, ticket._id, now).catch(() => undefined);
      break;
    }
  }

  return sent;
}

async function runCheck() {
  const { generateModels } = await import('./connectionResolver');
  const { sendMessage } = await import('@erxes/api-utils/src/core');
  const models = await generateModels(OS_SUBDOMAIN);

  await processDueAutoCustomerEmails(
    models,
    OS_SUBDOMAIN,
    new Date(),
    sendMessage,
  );
}

export function startAutoCustomerEmailScheduler(): NodeJS.Timeout | null {
  // 단일 테넌트 판단은 createGenerateModels와 같게(VERSION이 있고 saas가 아닐 때)
  const VERSION = process.env.VERSION;

  if (!VERSION || VERSION === 'saas') {
    console.log(
      '자동 고객 알림 메일: 단일 테넌트(VERSION=os)가 아니라 시작하지 않음',
    );
    return null;
  }

  // 한 확인이 1분을 넘기면 다음 확인은 건너뛴다(겹쳐 쌓이지 않게)
  let running = false;

  return setInterval(async () => {
    if (running) return;
    running = true;

    try {
      await runCheck();
    } catch (error) {
      console.error('자동 고객 알림 메일 확인 실패:', error);
    } finally {
      running = false;
    }
  }, AUTO_CUSTOMER_EMAIL_CHECK_MS);
}
