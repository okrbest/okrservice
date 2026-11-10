import { getEnv } from '../../../utils';
import { connection } from '../../connection';

/**
 * 회사 사규 문서 — 위젯 서버 /ai-chat/company-documents 프록시 경유로
 * TeamplGPT embed 회사 문서 API 호출 (teamplgpt specs/021).
 * 회사 구분 = 고객사 페이지가 넘기는 companyData.name(앞뒤 공백 제거).
 */

export type CompanyDocStatus = 'processing' | 'ready' | 'failed';

export interface CompanyDoc {
  id: number;
  filename: string;
  uploaderName: string | null;
  status: CompanyDocStatus;
  error: string | null;
  createdAt: string;
}

export const COMPANY_DOC_MAX_BYTES = 50 * 1024 * 1024;

// TeamplGPT collector가 받는 형식 전부 + HWP·HWPX (specs/021 D10)
export const COMPANY_DOC_EXTENSIONS = [
  '.pdf',
  '.hwp',
  '.hwpx',
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.txt',
  '.md',
  '.org',
  '.adoc',
  '.rst',
  '.csv',
  '.json',
  '.html',
  '.epub',
  '.mbox',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.wav',
  '.mp4',
  '.mpeg',
];

export type FileCheckError = 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE';

export function checkCompanyDocFile(file: {
  name: string;
  size: number;
}): FileCheckError | null {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!COMPANY_DOC_EXTENSIONS.includes(ext)) return 'UNSUPPORTED_TYPE';
  if (file.size > COMPANY_DOC_MAX_BYTES) return 'FILE_TOO_LARGE';
  return null;
}

export function getCompanyName(): string {
  const name = connection.setting?.companyData?.name;
  return typeof name === 'string' ? name.trim() : '';
}

const DOCS_INTRO_SEEN_KEY = 'chatbot-company-docs-intro-seen';

// localStorage 차단(시크릿 모드·서드파티 쿠키 차단) 시 매번 뜨는 대신 안 띄운다
export function hasSeenCompanyDocsIntro(): boolean {
  try {
    return localStorage.getItem(DOCS_INTRO_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markCompanyDocsIntroSeen(): void {
  try {
    localStorage.setItem(DOCS_INTRO_SEEN_KEY, '1');
  } catch {
    // 저장 실패 시 다음 방문에 다시 보일 뿐
  }
}

export function getUploaderName(): string | undefined {
  const { name, email } = connection.setting || {};
  for (const v of [name, email]) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function baseUrl(): string {
  const { ROOT_URL } = getEnv();
  return `${(ROOT_URL || '').replace(/\/$/, '')}/ai-chat/company-documents`;
}

export class CompanyDocsError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function errorFrom(response: Response): Promise<CompanyDocsError> {
  let code = `HTTP_${response.status}`;
  try {
    const body = await response.json();
    if (body && typeof body.error === 'string') code = body.error;
  } catch {
    // 본문이 JSON이 아니면 상태 코드로
  }
  return new CompanyDocsError(code);
}

export async function listCompanyDocs(
  companyName: string,
): Promise<CompanyDoc[]> {
  const response = await fetch(
    `${baseUrl()}?companyName=${encodeURIComponent(companyName)}`,
  );
  if (!response.ok) throw await errorFrom(response);
  const body = await response.json();
  return Array.isArray(body?.documents) ? body.documents : [];
}

export async function uploadCompanyDoc(
  companyName: string,
  file: File,
  uploaderName?: string,
): Promise<CompanyDoc> {
  const form = new FormData();
  form.append('companyName', companyName);
  if (uploaderName) form.append('uploaderName', uploaderName);
  form.append('file', file, file.name);
  const response = await fetch(baseUrl(), { method: 'POST', body: form });
  if (!response.ok) throw await errorFrom(response);
  const body = await response.json();
  return body.document;
}

export async function deleteCompanyDoc(
  companyName: string,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/${id}?companyName=${encodeURIComponent(companyName)}`,
    { method: 'DELETE' },
  );
  if (!response.ok) throw await errorFrom(response);
}
