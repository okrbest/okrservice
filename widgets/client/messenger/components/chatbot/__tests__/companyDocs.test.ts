import { connection } from '../../../connection';
import {
  checkCompanyDocFile,
  COMPANY_DOC_MAX_BYTES,
  deleteCompanyDoc,
  getCompanyDocContent,
  getCompanyName,
  getUploaderName,
  listCompanyDocs,
  uploadCompanyDoc,
} from '../companyDocs';

const fetchMock = jest.fn();

beforeEach(() => {
  (window as any).erxesEnv = { ROOT_URL: 'https://widgets.example.com/' };
  (global as any).fetch = fetchMock;
  fetchMock.mockReset();
  connection.setting = {};
});

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('checkCompanyDocFile', () => {
  it.each(['규정.pdf', '취업규칙.HWP', '사규.hwpx', 'a.docx', 'scan.png'])(
    '%s는 허용한다',
    (name) => {
      expect(checkCompanyDocFile({ name, size: 1024 })).toBeNull();
    },
  );

  it.each(['old.doc', 'a.zip', 'noext'])('%s는 형식 미지원', (name) => {
    expect(checkCompanyDocFile({ name, size: 1 })).toBe('UNSUPPORTED_TYPE');
  });

  it('50MB를 넘으면 크기 초과', () => {
    expect(
      checkCompanyDocFile({ name: 'big.pdf', size: COMPANY_DOC_MAX_BYTES + 1 }),
    ).toBe('FILE_TOO_LARGE');
    expect(
      checkCompanyDocFile({ name: 'ok.pdf', size: COMPANY_DOC_MAX_BYTES }),
    ).toBeNull();
  });
});

describe('getCompanyName / getUploaderName', () => {
  it('companyData.name 앞뒤 공백을 지운다', () => {
    connection.setting = { companyData: { name: '  오이사공 ' } };
    expect(getCompanyName()).toBe('오이사공');
  });

  it('companyData가 없거나 공백뿐이면 빈 문자열', () => {
    expect(getCompanyName()).toBe('');
    connection.setting = { companyData: { name: '   ' } };
    expect(getCompanyName()).toBe('');
  });

  it('올린 사람은 이름 → 이메일 순', () => {
    connection.setting = { name: '홍길동', email: 'a@b.c' };
    expect(getUploaderName()).toBe('홍길동');
    connection.setting = { email: 'a@b.c' };
    expect(getUploaderName()).toBe('a@b.c');
    connection.setting = {};
    expect(getUploaderName()).toBeUndefined();
  });
});

describe('API', () => {
  it('목록은 회사 이름을 쿼리로 보낸다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { documents: [{ id: 1 }] }));
    const docs = await listCompanyDocs('오이사공');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://widgets.example.com/ai-chat/company-documents?companyName=%EC%98%A4%EC%9D%B4%EC%82%AC%EA%B3%B5',
    );
    expect(docs).toEqual([{ id: 1 }]);
  });

  it('업로드는 companyName을 file보다 먼저 담은 multipart', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(202, { document: { id: 3, status: 'processing' } }),
    );
    const file = new File(['x'], '규정.hwp');
    const doc = await uploadCompanyDoc('오이사공', file, '홍길동');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://widgets.example.com/ai-chat/company-documents');
    expect(init.method).toBe('POST');
    const keys = Array.from((init.body as FormData).keys());
    expect(keys).toEqual(['companyName', 'uploaderName', 'file']);
    expect(doc).toEqual({ id: 3, status: 'processing' });
  });

  it('실패 응답의 error 코드를 던진다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(413, { error: 'FILE_TOO_LARGE' }));
    await expect(
      uploadCompanyDoc('오이사공', new File(['x'], 'a.pdf')),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('삭제는 문서 ID 경로 + 회사 이름 쿼리', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }));
    await deleteCompanyDoc('오이사공', 7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/ai-chat\/company-documents\/7\?companyName=/);
    expect(init).toEqual({ method: 'DELETE' });
  });
});

describe('getCompanyDocContent (본문 보기)', () => {
  it('문서 ID 경로 + 회사 이름 쿼리로 본문을 받고 signal을 넘긴다', async () => {
    const body = {
      document: { id: 12, filename: '취업규칙.pdf', status: 'ready' },
      content: '제1조(목적)',
    };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    const controller = new AbortController();
    const result = await getCompanyDocContent(
      '오이사공',
      12,
      controller.signal,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://widgets.example.com/ai-chat/company-documents/12/content?companyName=%EC%98%A4%EC%9D%B4%EC%82%AC%EA%B3%B5',
    );
    expect(init).toEqual({ signal: controller.signal });
    expect(result).toEqual(body);
  });

  it('실패 응답의 error 코드를 던진다', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'NOT_FOUND' }));
    await expect(getCompanyDocContent('오이사공', 12)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
