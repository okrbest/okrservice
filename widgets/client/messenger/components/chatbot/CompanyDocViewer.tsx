import * as React from 'react';
import { __ } from '../../../utils';
import { chatbotTheme } from './chatbotTheme';
import {
  CompanyDoc,
  formatCompanyDocDate,
  getCompanyDocContent,
} from './companyDocs';

const T = chatbotTheme;

interface Props {
  companyName: string;
  doc: CompanyDoc;
  onBack: () => void;
  // 그 사이 삭제된 문서 — 패널이 목록을 새로 읽는다
  onMissing: () => void;
}

type ViewState =
  | { kind: 'loading' }
  | { kind: 'loaded'; content: string }
  | { kind: 'error'; code: string };

// 서버 오류 코드 → 안내 (contracts/company-doc-content-api.md)
function errorMessage(code: string): string {
  if (code === 'NOT_FOUND') return __('This document has already been deleted');
  if (code === 'NOT_READY') return __('This document is still being processed');
  return __("Couldn't load the content. Please try again");
}

const noticeStyle: React.CSSProperties = {
  padding: '24px 8px',
  textAlign: 'center',
  fontSize: '12px',
  color: T.color.mutedForeground,
  lineHeight: 1.6,
};

/**
 * 회사 문서 본문 보기 (specs/005-company-doc-view) — 챗봇이 읽는 글을 서식 없이 보여준다.
 * 본문은 텍스트 노드로만 넣는다: 문서 안 꺾쇠 문자가 화면 코드로 해석되지 않게.
 */
const CompanyDocViewer: React.FC<Props> = ({
  companyName,
  doc,
  onBack,
  onMissing,
}) => {
  const [state, setState] = React.useState<ViewState>({ kind: 'loading' });
  const [attempt, setAttempt] = React.useState(0);
  const onMissingRef = React.useRef(onMissing);
  onMissingRef.current = onMissing;

  React.useEffect(() => {
    const controller = new AbortController();
    setState({ kind: 'loading' });
    getCompanyDocContent(companyName, doc.id, controller.signal)
      .then(({ content }) => {
        if (controller.signal.aborted) return;
        setState({
          kind: 'loaded',
          content: typeof content === 'string' ? content : '',
        });
      })
      .catch((e: any) => {
        if (controller.signal.aborted) return;
        const code = e?.code || 'GENERIC';
        setState({ kind: 'error', code });
        if (code === 'NOT_FOUND') onMissingRef.current();
      });
    return () => controller.abort();
  }, [companyName, doc.id, attempt]);

  const renderBody = () => {
    if (state.kind === 'loading')
      return <div style={noticeStyle}>{__('Loading…')}</div>;
    if (state.kind === 'error') {
      return (
        <div style={noticeStyle}>
          {errorMessage(state.code)}
          {state.code !== 'NOT_FOUND' && state.code !== 'NOT_READY' && (
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                style={{
                  border: `1px solid ${T.color.border}`,
                  background: T.color.background,
                  borderRadius: T.radius.sm,
                  padding: '4px 10px',
                  fontSize: '12px',
                  color: T.color.foreground,
                  cursor: 'pointer',
                }}
              >
                {__('Try again')}
              </button>
            </div>
          )}
        </div>
      );
    }
    if (!state.content.trim())
      return <div style={noticeStyle}>{__('There is no content to show')}</div>;
    return (
      <div
        data-testid="company-doc-content"
        style={{
          padding: '12px',
          background: T.color.card,
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.md,
          fontSize: '12px',
          lineHeight: 1.7,
          color: T.color.foreground,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {state.content}
      </div>
    );
  };

  return (
    <>
      <div style={{ padding: '0 16px 10px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: T.color.accent,
            cursor: 'pointer',
          }}
        >
          ← {__('Back to list')}
        </button>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: T.color.foreground,
            wordBreak: 'break-all',
          }}
        >
          {doc.filename}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: T.color.mutedForeground,
            marginTop: '2px',
          }}
        >
          {doc.uploaderName || __('Unknown')} ·{' '}
          {formatCompanyDocDate(doc.createdAt)}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: T.color.mutedForeground,
            marginTop: '4px',
          }}
        >
          {__('This is the text the chatbot reads from this document')}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '0 16px 16px',
        }}
      >
        {renderBody()}
      </div>
    </>
  );
};

export default CompanyDocViewer;
