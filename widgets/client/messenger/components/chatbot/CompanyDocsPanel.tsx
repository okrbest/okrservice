import * as React from 'react';
import { __ } from '../../../utils';
import { chatbotTheme } from './chatbotTheme';
import {
  CompanyDoc,
  COMPANY_DOC_EXTENSIONS,
  checkCompanyDocFile,
  deleteCompanyDoc,
  formatCompanyDocDate,
  listCompanyDocs,
  uploadCompanyDoc,
} from './companyDocs';
import CompanyDocProgress from './CompanyDocProgress';
import CompanyDocViewer from './CompanyDocViewer';

const T = chatbotTheme;

export const COMPANY_DOCS_POLL_MS = 5000;

interface Props {
  companyName: string;
  uploaderName?: string;
  onClose: () => void;
}

interface RejectedFile {
  name: string;
  reason: string;
}

const STATUS_LABEL: Record<CompanyDoc['status'], string> = {
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

const STATUS_COLOR: Record<CompanyDoc['status'], string> = {
  processing: T.color.mutedForeground,
  ready: T.status.good,
  failed: T.color.destructive,
};

const GUIDE_LINES = [
  "Upload your company's rules (work rules, policies, benefits, etc.) and the chatbot will refer to them when answering. If they differ from the general guidance, your company's documents take priority.",
  'Only people at your company can see the list of uploaded documents, and anyone at your company can delete a document uploaded by mistake.',
  'PDF, Hangul (HWP/HWPX), Word, Excel, PowerPoint, text files and more, up to 50MB per file.',
  'Documents are used for answers once their status shows Ready, usually within a few minutes. Deleted documents stop being used from the next question.',
  'Please do not upload documents containing personal information such as resident registration numbers or pay details.',
];

// 서버는 처리 실패 사유를 코드로 준다 (contracts/embed-company-docs-api.md)
const PROCESSING_ERROR_LABEL: Record<string, string> = {
  DRM: 'This document is DRM-protected and cannot be read',
  ENCRYPTED: 'This document is password-protected and cannot be read',
  NO_TEXT: 'No text was found in this document',
  GENERIC: 'This document could not be processed',
  INTERRUPTED: 'Processing was interrupted. Please upload it again',
};

function processingErrorMessage(code: string): string {
  return __(PROCESSING_ERROR_LABEL[code] || PROCESSING_ERROR_LABEL.GENERIC);
}

function uploadErrorMessage(code: string): string {
  if (code === 'UNSUPPORTED_TYPE') return __('Unsupported file type');
  if (code === 'FILE_TOO_LARGE') return __('File is larger than 50MB');
  return __('Upload failed. Please try again.');
}

const CompanyDocsPanel: React.FC<Props> = ({
  companyName,
  uploaderName,
  onClose,
}) => {
  const [docs, setDocs] = React.useState<CompanyDoc[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [uploading, setUploading] = React.useState(0);
  const [rejected, setRejected] = React.useState<RejectedFile[]>([]);
  // 본문 보기 중인 문서 — null이면 목록
  const [viewing, setViewing] = React.useState<CompanyDoc | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      setDocs(await listCompanyDocs(companyName));
    } catch {
      // 목록 실패는 다음 갱신에서 다시 시도
    } finally {
      setLoaded(true);
    }
  }, [companyName]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const hasProcessing = docs.some((d) => d.status === 'processing');
  React.useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(refresh, COMPANY_DOCS_POLL_MS);
    return () => clearInterval(timer);
  }, [hasProcessing, refresh]);

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    const nextRejected: RejectedFile[] = [];
    const accepted = files.filter((file) => {
      const err = checkCompanyDocFile(file);
      if (err)
        nextRejected.push({ name: file.name, reason: uploadErrorMessage(err) });
      return !err;
    });
    setRejected(nextRejected);

    setUploading(accepted.length);
    for (const file of accepted) {
      try {
        const doc = await uploadCompanyDoc(companyName, file, uploaderName);
        setDocs((prev) => [doc, ...prev]);
      } catch (e: any) {
        nextRejected.push({
          name: file.name,
          reason: uploadErrorMessage(e?.code || ''),
        });
        setRejected([...nextRejected]);
      }
      setUploading((n) => n - 1);
    }
  };

  const handleDelete = async (doc: CompanyDoc) => {
    if (
      !window.confirm(
        __('Delete this document? It will no longer be used for answers.'),
      )
    )
      return;
    try {
      await deleteCompanyDoc(companyName, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      refresh();
    }
  };

  return (
    <div
      role="dialog"
      aria-label={__('Company documents')}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        background: T.color.threadBackground,
        fontFamily: T.font.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 6px',
        }}
      >
        <strong style={{ fontSize: '14px', color: T.color.foreground }}>
          {__('Company documents')}
        </strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={__('Close')}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: T.color.mutedForeground,
          }}
        >
          ×
        </button>
      </div>
      {viewing ? (
        <CompanyDocViewer
          companyName={companyName}
          doc={viewing}
          onBack={() => setViewing(null)}
          onMissing={refresh}
        />
      ) : (
        <>
          <ul
            data-testid="company-docs-guide"
            style={{
              margin: '0 16px 10px',
              paddingLeft: '16px',
              fontSize: '12px',
              color: T.color.mutedForeground,
              lineHeight: 1.5,
            }}
          >
            {GUIDE_LINES.map((line) => (
              <li key={line} style={{ marginBottom: '2px' }}>
                {__(line)}
              </li>
            ))}
          </ul>
          <div style={{ padding: '0 16px 10px' }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={COMPANY_DOC_EXTENSIONS.join(',')}
              data-testid="company-docs-input"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={uploading > 0}
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '9px 0',
                border: 'none',
                borderRadius: T.radius.md,
                background:
                  uploading > 0
                    ? '#c4cfe6'
                    : `linear-gradient(135deg, ${T.color.accent}, ${T.color.accent2})`,
                color: T.color.accentForeground,
                fontSize: '13px',
                fontWeight: 600,
                cursor: uploading > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {__('Upload files')}
            </button>
            {rejected.map((r) => (
              <div
                key={r.name}
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: T.color.destructive,
                }}
              >
                {r.name}: {r.reason}
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '0 16px 16px',
            }}
          >
            {loaded && docs.length === 0 && (
              <div
                style={{
                  padding: '24px 8px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: T.color.mutedForeground,
                  lineHeight: 1.6,
                }}
              >
                {__(
                  "No documents yet. Use Upload files above to add your company's rules.",
                )}
              </div>
            )}
            {docs.map((doc) => (
              <div
                key={doc.id}
                data-testid="company-doc-row"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  background: T.color.card,
                  border: `1px solid ${T.color.border}`,
                  borderRadius: T.radius.md,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: T.color.foreground,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={doc.filename}
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
                    {formatCompanyDocDate(doc.createdAt)} ·{' '}
                    <span style={{ color: STATUS_COLOR[doc.status] }}>
                      {__(STATUS_LABEL[doc.status])}
                    </span>
                  </div>
                  {doc.status === 'failed' && doc.error && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: T.color.destructive,
                        marginTop: '2px',
                      }}
                    >
                      {processingErrorMessage(doc.error)}
                    </div>
                  )}
                  {doc.status === 'processing' && (
                    <CompanyDocProgress createdAt={doc.createdAt} />
                  )}
                </div>
                {doc.status === 'ready' && (
                  <button
                    type="button"
                    onClick={() => setViewing(doc)}
                    style={{
                      flexShrink: 0,
                      border: `1px solid ${T.color.border}`,
                      background: T.color.background,
                      borderRadius: T.radius.sm,
                      padding: '3px 8px',
                      fontSize: '11px',
                      color: T.color.accent,
                      cursor: 'pointer',
                    }}
                  >
                    {__('View')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  style={{
                    flexShrink: 0,
                    border: `1px solid ${T.color.border}`,
                    background: T.color.background,
                    borderRadius: T.radius.sm,
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: T.color.destructive,
                    cursor: 'pointer',
                  }}
                >
                  {__('Delete')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyDocsPanel;
