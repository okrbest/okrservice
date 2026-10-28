import * as React from 'react';
import dayjs from 'dayjs';
import xss from 'xss';

import { IAttachment } from '../../types';
import {
  __,
  openReadFileImageInNewTab,
  readFile,
  readFileViewInline,
  sanitizeAttachmentDownloadBasename,
} from '../../../utils';
import FileTypeIcon from '../common/FileTypeIcon';
import { ProgressStep, progressTone } from './progressHelpers';
import { useOriginalImageLinks } from './useOriginalImageLinks';

const IMAGE_EXTENSIONS = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'svg'];

// 위젯에서만 쓰는 "새 탭에서 보기". 새 탭 페이지는 넘기지 않아 버튼이 안 보인다.
// 링크는 화면을 열 때 미리 받아 두어 일반 링크로 그린다 — 누르자마자 열리고 팝업 차단에 걸리지 않는다.
export type NewTabControl = {
  // 받아 둔 새 탭 주소(받는 중이면 비어 있음)
  url?: string;
  // 받기에 실패했을 때 다시 받기
  onRetry?: () => void;
  notice?: string;
};

type Props = {
  ticket: any;
  steps: ProgressStep[];
  newTab?: NewTabControl;
};

const StepBar = ({ steps }: { steps: ProgressStep[] }) => (
  <ol className="tp-steps" aria-label={__('Ticket progress')}>
    {steps.map((step) => (
      <li
        key={step._id}
        className={`tp-step is-${step.state}`}
        aria-current={step.state === 'now' ? 'step' : undefined}
      >
        <span className="tp-step-dot" aria-hidden>
          {step.state === 'done' ? '✓' : null}
        </span>
        <span className="tp-step-name">{step.name}</span>
      </li>
    ))}
  </ol>
);

const AttachmentItem = ({ attachment }: { attachment: IAttachment }) => {
  const rawName = (attachment.name || attachment.url || '').trim();
  const extension =
    (attachment.url || attachment.name || '').split('.').pop()?.toLowerCase() ||
    '';
  const downloadName = sanitizeAttachmentDownloadBasename(rawName) || 'file';

  if (IMAGE_EXTENSIONS.includes(extension)) {
    const openOriginal = (e: React.MouseEvent) => {
      e.preventDefault();
      openReadFileImageInNewTab(readFileViewInline(attachment.url));
    };

    return (
      <button
        type="button"
        className="tp-thumb"
        onClick={openOriginal}
        title={downloadName}
        aria-label={`${downloadName} — ${__('Original')}`}
      >
        <img src={readFile(attachment.url)} alt={downloadName} />
        {/* 누르면 원본이 열린다는 표시(설명 속 사진의 "원본" 버튼과 같은 모양, 썸네일 전체가 버튼) */}
        <span className="tp-thumb-badge" aria-hidden>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {__('Original')}
        </span>
      </button>
    );
  }

  const downloadUrl =
    attachment.url && attachment.url.includes('http')
      ? attachment.url
      : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;

  return (
    <a
      className="tp-file"
      href={downloadUrl}
      download={downloadName}
      target="_blank"
      rel="noopener noreferrer"
      title={`${downloadName} — ${__('Download')}`}
    >
      <FileTypeIcon extension={extension} size={28} />
      <span>{downloadName}</span>
    </a>
  );
};

// 위: 번호·현재 단계·제목·접수일, 단계 막대, 내용과 첨부
const TicketProgressHero: React.FC<Props> = ({ ticket, steps, newTab }) => {
  const descriptionRef = React.useRef<HTMLDivElement>(null);
  const {
    number,
    name,
    stage,
    status,
    requestType,
    type,
    createdAt,
    description,
    attachments,
  } = ticket || {};
  const category = requestType || type;
  // 단계 표시·단계 막대 색 — 목록 뱃지와 같은 색
  const tone = progressTone(steps, stage);

  useOriginalImageLinks(descriptionRef, [description]);

  return (
    <section className={`tp-hero tp-tone--${tone}`}>
      <div className="tp-hero-row">
        <span className="tp-number">#{number}</span>
        {(stage?.name || status) && (
          <span className="tp-status">
            <i aria-hidden />
            {__(stage?.name || status)}
          </span>
        )}
        {newTab &&
          (newTab.url ? (
            <a
              className="tp-newtab"
              href={newTab.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {__('Open in new tab')}
            </a>
          ) : (
            <button
              type="button"
              className="tp-newtab"
              onClick={newTab.onRetry}
              disabled={!newTab.onRetry}
            >
              {__('Open in new tab')}
            </button>
          ))}
      </div>
      {newTab && newTab.notice && (
        <div className="tp-newtab-note" role="status">
          {newTab.notice}
        </div>
      )}
      <h2 className="tp-title">{name}</h2>
      <div className="tp-meta">
        {[
          category ? __(category) : '',
          createdAt
            ? `${dayjs(createdAt).format(__('MMM D'))} ${__('submitted')}`
            : '',
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {steps.length > 0 && <StepBar steps={steps} />}
      {description ? (
        <div
          ref={descriptionRef}
          className="tp-description ticket-description-content"
          dangerouslySetInnerHTML={{
            __html: xss(description.replace(/\n/g, '<br />')),
          }}
        />
      ) : null}
      {attachments && attachments.length > 0 && (
        <div className="tp-attachments">
          {attachments.map((attachment: IAttachment, index: number) => (
            <AttachmentItem
              key={`${attachment.url}-${index}`}
              attachment={attachment}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TicketProgressHero;
