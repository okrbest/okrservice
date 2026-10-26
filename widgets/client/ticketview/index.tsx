import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';

import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import client from '../apollo-client';
import { setLocale } from '../utils';
import '../messenger/sass/style.min.css';
import TicketViewPage from './TicketViewPage';

// 위젯(messenger/containers/App.tsx)과 같은 날짜 표기 — 댓글 시각(LT) 등
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

// 위젯 티켓 "새 탭에서 보기" 페이지 — /ticket-view?lang=ko#<열쇠>
// 열쇠는 주소 조각(#)에 있어 서버 요청·접속 기록에 실리지 않는다.
// 읽은 뒤에는 주소창·방문 기록에서 지우고 이 탭의 sessionStorage에만 둔다(새로 고침은 그대로 됨).
const TOKEN_KEY = 'erxes-ticket-view-token';

const readToken = (): string => {
  const fromHash = (window.location.hash || '').replace(/^#/, '');

  try {
    if (fromHash) {
      window.sessionStorage.setItem(TOKEN_KEY, fromHash);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
      return fromHash;
    }

    return window.sessionStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    // 저장소를 못 쓰는 환경이면 주소의 열쇠만 쓴다
    return fromHash;
  }
};

const token = readToken();
const language =
  new URLSearchParams(window.location.search).get('lang') || 'ko';
const root = document.getElementById('root');

if (root) {
  setLocale(language, () => {
    createRoot(root).render(
      <ApolloProvider client={client}>
        <TicketViewPage token={token} />
      </ApolloProvider>,
    );
  });
}
