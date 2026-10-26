import * as React from 'react';
import * as classNames from 'classnames';

import Button from '../common/Button';
import Container from '../common/Container';
import { __ } from '../../../utils';
import { useConfig } from '../../context/Config';
import { canSubmitTicket, contactSummary } from './submitHelpers';
import { FileWithUrl, useAttachUpload } from './useAttachUpload';

type Props = {
  loading: boolean;
  isSubmitted: boolean;
  ticketNumber: string;
  formData: any;
  customerLoading: boolean;
  handleSubmit: (e: any) => void;
  handleChange: (e: any) => void;
  handleButtonClick: () => void;
  handleFiles: (files: any) => void;
  files?: FileWithUrl[];
};

// 요청 구분 7가지(저장 값은 그대로) — 한 줄 설명을 칩에 늘 보여준다
const REQUEST_TYPES = [
  { value: 'inquiry', label: '단순문의', hint: '궁금한 점' },
  { value: 'error', label: '오류처리', hint: '버그·오류 신고' },
  { value: 'improvement', label: '개선요청', hint: '기능 개선' },
  { value: 'usage_guide', label: '사용안내', hint: '사용 방법' },
  { value: 'config', label: '설정변경', hint: '설정 바꾸기' },
  { value: 'data_work', label: '데이터작업', hint: '데이터 요청' },
  { value: 'additional_development', label: '추가개발', hint: '새 기능 개발' },
];

const VISIBILITY = [
  {
    value: 'public',
    label: '회사에 공개',
    help: '회사 동료가 “회사 티켓”에서 볼 수 있어요',
  },
  {
    value: 'private',
    label: '나만 보기',
    help: '민감한 내용이면 나만 보기로 두세요',
  },
];

// 칩·전환 버튼도 기존 입력칸처럼 id/value로 저장한다
const change = (handleChange: (e: any) => void, id: string, value: string) =>
  handleChange({ target: { id, value } });

const TicketSubmitForm: React.FC<Props> = ({
  handleSubmit,
  isSubmitted,
  loading,
  ticketNumber,
  customerLoading,
  formData,
  handleChange,
  handleFiles,
  handleButtonClick,
  files = [],
}) => {
  const { email, firstName, lastName, phone } = formData;
  const { isAuthFieldsVisible } = useConfig();
  const summary = contactSummary({ email, firstName, lastName, phone });
  const [editingContact, setEditingContact] = React.useState(false);
  const attach = useAttachUpload(files, handleFiles);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);

  // 연락처가 비어 있으면 처음부터 펼쳐서 받는다
  const showContactFields = isAuthFieldsVisible && (editingContact || !summary);

  React.useEffect(() => {
    const el = descriptionRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 260)}px`;
    }
  }, [formData.description]);

  // 접수가 끝나면 티켓 목록으로
  React.useEffect(() => {
    if (isSubmitted) {
      handleButtonClick();
    }
  }, [isSubmitted, ticketNumber, handleButtonClick]);

  const visibility =
    VISIBILITY.find((option) => option.value === formData.visibility) ||
    VISIBILITY[0];

  const renderTypes = () => (
    <fieldset className="ts-section">
      <legend className="ts-label">{__('어떤 요청인가요?')}</legend>
      <div className="ts-types" role="radiogroup">
        {REQUEST_TYPES.map((type) => {
          const active = formData.ticketType === type.value;

          return (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={classNames('ts-type', { 'is-active': active })}
              onClick={() => change(handleChange, 'ticketType', type.value)}
            >
              <span className="ts-type-name">{__(type.label)}</span>
              <span className="ts-type-hint">{__(type.hint)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const renderAttach = () => (
    <div className="ts-attach">
      <button
        type="button"
        className="ts-attach-btn"
        onClick={attach.openPicker}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 11.5 12.6 19.9a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {__('Attach file')}
      </button>
      <input
        ref={attach.inputRef}
        type="file"
        multiple={true}
        hidden={true}
        accept={attach.accept}
        onChange={attach.onPick}
      />
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
      {attach.uploading > 0 && (
        <span className="tp-chip is-uploading">{__('Uploading…')}</span>
      )}
    </div>
  );

  const renderVisibility = () => (
    <fieldset className="ts-section">
      <legend className="ts-label">{__('공개 설정')}</legend>
      <div className="tl-tabs" role="radiogroup">
        {VISIBILITY.map((option) => {
          const active = visibility.value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={classNames('tl-tab', { 'is-active': active })}
              onClick={() => change(handleChange, 'visibility', option.value)}
            >
              {__(option.label)}
            </button>
          );
        })}
      </div>
      <p className="ts-help">{__(visibility.help)}</p>
    </fieldset>
  );

  const renderContact = () => {
    if (!isAuthFieldsVisible) {
      return null;
    }

    if (!showContactFields) {
      return (
        <div className="ts-contact">
          <span className="ts-contact-text">
            {__('Contact')} <b>{summary}</b>
          </span>
          <button type="button" onClick={() => setEditingContact(true)}>
            {__('Edit')}
          </button>
        </div>
      );
    }

    return (
      <fieldset className="ts-section">
        <legend className="ts-label">{__('Contact')}</legend>
        <div className="ts-grid">
          <input
            id="firstName"
            className="ts-input"
            placeholder={String(__('First name'))}
            value={firstName || ''}
            onChange={handleChange}
          />
          <input
            id="lastName"
            className="ts-input"
            placeholder={String(__('Last name'))}
            value={lastName || ''}
            onChange={handleChange}
          />
          <input
            id="email"
            className="ts-input"
            type="email"
            placeholder={String(__('Email'))}
            value={email || ''}
            onChange={handleChange}
          />
          <input
            id="phone"
            className="ts-input"
            type="tel"
            inputMode="numeric"
            placeholder={String(__('Phone number'))}
            value={phone || ''}
            onChange={handleChange}
          />
        </div>
      </fieldset>
    );
  };

  const renderForm = () => (
    <form id="ticket-form" className="ts-form" onSubmit={handleSubmit}>
      {renderTypes()}
      <div className="ts-section">
        <label className="ts-label" htmlFor="title">
          {__('Ticket title')}
        </label>
        <input
          id="title"
          className="ts-input"
          value={formData.title}
          onChange={handleChange}
          placeholder={String(__('한 줄로 요약해 주세요'))}
          required={true}
        />
      </div>
      <div className="ts-section">
        <label className="ts-label" htmlFor="description">
          {__('Describe the problem')}
          <small>{__('언제·어디서·무엇이')}</small>
        </label>
        <textarea
          ref={descriptionRef}
          id="description"
          className="ts-input ts-textarea"
          value={formData.description}
          onChange={handleChange}
          placeholder={String(__('어떤 상황인지 적어주세요'))}
          required={true}
        />
        {renderAttach()}
      </div>
      {renderVisibility()}
      {renderContact()}
    </form>
  );

  const ready = canSubmitTicket(formData) && attach.uploading === 0;

  return (
    <Container
      withBottomNavBar={true}
      title={__('Submit a ticket')}
      backRoute="ticket"
      persistentFooter={
        !isSubmitted ? (
          <div className="ts-footer">
            <Button
              form="ticket-form"
              type="submit"
              full
              disabled={!ready || loading}
            >
              {loading ? (
                <div className="loader" />
              ) : (
                <span className="font-semibold">{__('문의 접수하기')}</span>
              )}
            </Button>
          </div>
        ) : null
      }
    >
      <div className="ts-screen">
        {loading || customerLoading ? <div className="loader" /> : renderForm()}
      </div>
    </Container>
  );
};

export default TicketSubmitForm;
