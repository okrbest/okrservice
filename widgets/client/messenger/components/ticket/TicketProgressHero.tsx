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
import { ProgressStep } from './progressHelpers';
import { useOriginalImageLinks } from './useOriginalImageLinks';

const IMAGE_EXTENSIONS = ['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'svg'];

type Props = {
  ticket: any;
  steps: ProgressStep[];
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
      >
        <img src={readFile(attachment.url)} alt={downloadName} />
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
const TicketProgressHero: React.FC<Props> = ({ ticket, steps }) => {
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

  useOriginalImageLinks(descriptionRef, [description]);

  return (
    <section className="tp-hero">
      <div className="tp-hero-row">
        <span className="tp-number">#{number}</span>
        {(stage?.name || status) && (
          <span className="tp-status">
            <i aria-hidden />
            {__(stage?.name || status)}
          </span>
        )}
      </div>
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
