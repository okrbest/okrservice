import * as React from 'react';

import { __ } from '../../../utils';
import { ticketGuideRows } from './ticketGuideRules';

// "원본" 버튼과 같은 확대 아이콘
const ExpandIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Props = {
  // "새 탭에서 보기" 버튼이 화면에 있는지(없으면 그 줄을 빼서 없는 버튼을 안내하지 않는다)
  canOpenNewTab: boolean;
  onClose: () => void;
};

// 진행 상황 화면에 처음 온 고객에게 크게 보는 방법을 알려 준다.
// 줄마다 왼쪽 칸에 실제 버튼과 같은 모양, 오른쪽 칸에 설명 — 두 줄의 설명이 같은 위치에서 시작한다.
const TicketGuide: React.FC<Props> = ({ canOpenNewTab, onClose }) => (
  <section className="tp-guide" aria-label={__('To see your ticket bigger')}>
    <div className="tp-guide-head">
      <span className="tp-guide-icon">
        <ExpandIcon size={11} />
      </span>
      {__('To see your ticket bigger')}
    </div>
    <dl className="tp-guide-rows">
      {ticketGuideRows(canOpenNewTab).map((row) =>
        row === 'newTab' ? (
          <React.Fragment key={row}>
            <dt>
              <span className="tp-guide-chip is-newtab">
                {__('Open in new tab')}
              </span>
            </dt>
            <dd>{__('See the ticket on a wide screen')}</dd>
          </React.Fragment>
        ) : (
          <React.Fragment key={row}>
            <dt>
              <span className="tp-guide-chip is-original">
                <ExpandIcon size={8} />
                {__('Original')}
              </span>
            </dt>
            <dd>{__('Open photos large in a new tab')}</dd>
          </React.Fragment>
        ),
      )}
    </dl>
    <button type="button" className="tp-guide-ok" onClick={onClose}>
      {__('Got it')}
    </button>
  </section>
);

export default TicketGuide;
