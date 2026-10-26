import * as React from 'react';
import { useMutation } from '@apollo/client';

import { TICKET_VIEW_LINK_CREATE } from '../../graphql/mutations';
import {
  IssuedLink,
  buildTicketViewUrl,
  isLinkFresh,
} from '../../components/ticket/openTicketView';
import { connection } from '../../connection';
import { getEnv, normalizeLanguageCode } from '../../../utils';

// 같은 티켓을 다시 열면 받아 둔 링크를 다시 쓴다(위젯이 떠 있는 동안만 기억)
const issuedLinks = new Map<string, IssuedLink>();

// 위젯과 같은 규칙(messenger/index.ts)으로 정한 언어를 새 탭에 넘긴다
const widgetLanguage = () => {
  const language = normalizeLanguageCode(
    connection.setting?.language || connection.data?.languageCode || 'ko',
  );

  return ['ko', 'ja'].includes(language) ? language : 'en';
};

type LinkState = {
  // 이 상태가 어느 티켓·고객 것인지 — 티켓을 바꿔 열면 앞 티켓의 링크·응답을 쓰지 않는다
  key: string;
  link?: IssuedLink;
  failed?: boolean;
  // 이 고객이 볼 수 없는 티켓(번호로 조회한 남의 티켓 등) — 버튼을 아예 숨긴다
  notAllowed?: boolean;
};

/**
 * 진행 상황 화면을 열 때 "새 탭에서 보기" 링크를 미리 받아 둔다.
 * 버튼을 처음부터 일반 링크(target=_blank)로 그려서, 누르자마자 열리고 팝업 차단에 걸리지 않는다.
 */
export const useTicketViewLink = (ticketId?: string, customerId?: string) => {
  const key = ticketId && customerId ? `${customerId}:${ticketId}` : '';
  const keyRef = React.useRef(key);
  const inFlightRef = React.useRef('');
  const [createViewLink] = useMutation(TICKET_VIEW_LINK_CREATE);
  const [state, setState] = React.useState<LinkState>(() => ({
    key,
    link: isLinkFresh(issuedLinks.get(key)) ? issuedLinks.get(key) : undefined,
  }));

  keyRef.current = key;

  const issue = React.useCallback(async () => {
    if (!key || inFlightRef.current === key) {
      return;
    }

    inFlightRef.current = key;
    setState({ key });

    try {
      const { data } = await createViewLink({
        variables: { customerId, ticketId },
      });
      const { token, expiresAt } = data.widgetsTicketViewLinkCreate;
      const next = {
        url: buildTicketViewUrl({
          rootUrl: getEnv().ROOT_URL,
          token,
          lang: widgetLanguage(),
        }),
        expiresAt: new Date(expiresAt).getTime(),
      };

      issuedLinks.set(key, next);

      if (keyRef.current === key) {
        setState({ key, link: next });
      }
    } catch (e) {
      const notAllowed = /TICKET_VIEW_NOT_ALLOWED/.test(
        String((e && (e as any).message) || ''),
      );

      if (keyRef.current === key) {
        setState({ key, failed: !notAllowed, notAllowed });
      }
    } finally {
      if (inFlightRef.current === key) {
        inFlightRef.current = '';
      }
    }
  }, [key, customerId, ticketId, createViewLink]);

  React.useEffect(() => {
    if (!key) {
      return;
    }

    const cached = issuedLinks.get(key);

    if (isLinkFresh(cached)) {
      setState({ key, link: cached });
      return;
    }

    issue();
  }, [key, issue]);

  const current: LinkState = state.key === key ? state : { key };
  const fresh = isLinkFresh(current.link);

  // 화면을 오래 열어 둬 받아 둔 링크의 만료가 다가오면 다시 받는다
  React.useEffect(() => {
    if (key && current.link && !fresh) {
      issue();
    }
  });

  return {
    url: fresh ? current.link!.url : undefined,
    failed: Boolean(current.failed),
    retry: issue,
    // 고객이 아니거나(방문자) 볼 수 없는 티켓이면 버튼을 그리지 않는다
    unavailable: !key || Boolean(current.notAllowed),
  };
};
