import * as React from 'react';

import { __ } from '../../../utils';
import { FileWithUrl, useAttachUpload } from './useAttachUpload';

type Props = {
  comment: string;
  setComment: (comment: string) => void;
  onSend: () => void;
  files?: FileWithUrl[];
  handleFiles?: (files: FileWithUrl[]) => void;
};

const MAX_TEXTAREA_HEIGHT = 120;

// 채팅처럼 한 줄 입력: 📎 첨부 · 입력칸(자동으로 커짐) · 보내기. 첨부는 위에 칩으로 쌓인다.
const TicketComposer: React.FC<Props> = ({
  comment,
  setComment,
  onSend,
  files = [],
  handleFiles,
}) => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const attach = useAttachUpload(files, handleFiles);
  const { uploading } = attach;

  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [comment]);

  const canSend = (!!comment.trim() || files.length > 0) && uploading === 0;

  const send = () => {
    if (canSend) {
      onSend();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter는 줄바꿈, ⌘/Ctrl+Enter로 보내기(한글 조합 중 Enter는 무시)
    if (
      e.key === 'Enter' &&
      (e.metaKey || e.ctrlKey) &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="tp-composer">
      {(files.length > 0 || uploading > 0) && (
        <div className="tp-chips">
          {files.map((file) => (
            <span key={file.name} className="tp-chip">
              <span className="tp-chip-name">{file.name}</span>
              <button
                type="button"
                aria-label={__('Remove')}
                onClick={() => attach.removeFile(file.name)}
              >
                ×
              </button>
            </span>
          ))}
          {uploading > 0 && (
            <span className="tp-chip is-uploading">{__('Uploading…')}</span>
          )}
        </div>
      )}
      <div className="tp-composer-row">
        {handleFiles && (
          <>
            <button
              type="button"
              className="tp-icon-btn"
              aria-label={__('Attach file')}
              title={__('Attach file')}
              onClick={attach.openPicker}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M21 11.5 12.6 19.9a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              ref={attach.inputRef}
              type="file"
              multiple={true}
              hidden={true}
              accept={attach.accept}
              onChange={attach.onPick}
            />
          </>
        )}
        <textarea
          ref={inputRef}
          className="tp-input"
          rows={1}
          value={comment}
          placeholder={__('Write a message…')}
          aria-label={__('Add a comment')}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="tp-send"
          aria-label={__('Send comment')}
          title={__('Send comment')}
          disabled={!canSend}
          onClick={send}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 19V5M5 12l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TicketComposer;
