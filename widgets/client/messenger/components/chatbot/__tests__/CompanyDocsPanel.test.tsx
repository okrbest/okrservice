import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  fireEvent,
  screen,
  act,
  waitFor,
} from '@testing-library/react';
import CompanyDocsPanel, { COMPANY_DOCS_POLL_MS } from '../CompanyDocsPanel';
import {
  CompanyDoc,
  CompanyDocsError,
  deleteCompanyDoc,
  getCompanyDocContent,
  listCompanyDocs,
  uploadCompanyDoc,
} from '../companyDocs';

jest.mock('../companyDocs', () => {
  const actual = jest.requireActual('../companyDocs');
  return {
    ...actual,
    listCompanyDocs: jest.fn(),
    uploadCompanyDoc: jest.fn(),
    deleteCompanyDoc: jest.fn(),
    getCompanyDocContent: jest.fn(),
  };
});

const listMock = listCompanyDocs as jest.Mock;
const uploadMock = uploadCompanyDoc as jest.Mock;
const deleteMock = deleteCompanyDoc as jest.Mock;
const contentMock = getCompanyDocContent as jest.Mock;

function doc(partial: Partial<CompanyDoc>): CompanyDoc {
  return {
    id: 1,
    filename: '취업규칙.pdf',
    uploaderName: '홍길동',
    status: 'ready',
    error: null,
    createdAt: '2026-11-10T01:00:00.000Z',
    ...partial,
  };
}

function renderPanel() {
  return render(
    <CompanyDocsPanel
      companyName="오이사공"
      uploaderName="홍길동"
      onClose={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.useRealTimers();
  listMock.mockReset();
  uploadMock.mockReset();
  deleteMock.mockReset();
  contentMock.mockReset();
});

describe('CompanyDocsPanel', () => {
  it('공유 범위·형식·용량·반영 시점·우선순위·개인정보 주의를 안내한다', async () => {
    listMock.mockResolvedValue([]);
    renderPanel();
    const guide = await screen.findByTestId('company-docs-guide');
    expect(guide).toHaveTextContent(/take priority/);
    expect(guide).toHaveTextContent(
      /Only people at your company can see the list/,
    );
    expect(guide).toHaveTextContent(/HWP\/HWPX/);
    expect(guide).toHaveTextContent(/50MB/);
    expect(guide).toHaveTextContent(/Ready/);
    expect(guide).toHaveTextContent(/personal information/);
  });

  it('문서가 없으면 빈 상태 안내를 보여준다', async () => {
    listMock.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/No documents yet/)).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith('오이사공');
  });

  it('파일 이름·올린 사람·날짜·상태와 실패 사유를 보여준다', async () => {
    listMock.mockResolvedValue([
      doc({ id: 1 }),
      doc({
        id: 2,
        filename: '사규.hwp',
        uploaderName: null,
        status: 'failed',
        error: 'DRM',
      }),
      doc({ id: 3, status: 'failed', error: 'SOMETHING_NEW' }),
    ]);
    renderPanel();
    const rows = await screen.findAllByTestId('company-doc-row');
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent('This document could not be processed');
    expect(rows[0]).toHaveTextContent('취업규칙.pdf');
    expect(rows[0]).toHaveTextContent('홍길동');
    expect(rows[0]).toHaveTextContent('2026-11-10');
    expect(rows[0]).toHaveTextContent('Ready');
    expect(rows[1]).toHaveTextContent('Unknown');
    expect(rows[1]).toHaveTextContent('Failed');
    expect(rows[1]).toHaveTextContent(
      'This document is DRM-protected and cannot be read',
    );
  });

  it('허용 파일은 순서대로 하나씩 올리고, 허용되지 않는 파일은 사유만 보여준다', async () => {
    listMock.mockResolvedValue([]);
    const order: string[] = [];
    uploadMock.mockImplementation(async (_c: string, file: File) => {
      order.push(file.name);
      return doc({
        id: order.length,
        filename: file.name,
        status: 'processing',
      });
    });
    renderPanel();
    await screen.findByText(/No documents yet/);

    const files = [
      new File(['a'], 'a.pdf'),
      new File(['b'], 'old.doc'),
      new File(['c'], 'b.hwp'),
    ];
    await act(async () => {
      fireEvent.change(screen.getByTestId('company-docs-input'), {
        target: { files },
      });
    });

    expect(order).toEqual(['a.pdf', 'b.hwp']);
    expect(uploadMock).toHaveBeenCalledWith('오이사공', files[0], '홍길동');
    expect(
      screen.getByText(/old\.doc: Unsupported file type/),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('company-doc-row')).toHaveLength(2);
  });

  it('처리 중 문서가 있는 동안만 5초마다 목록을 다시 읽는다', async () => {
    jest.useFakeTimers();
    listMock
      .mockResolvedValueOnce([doc({ status: 'processing' })])
      .mockResolvedValueOnce([doc({ status: 'processing' })])
      .mockResolvedValue([doc({ status: 'ready' })]);
    renderPanel();
    await act(async () => {
      await Promise.resolve();
    });
    expect(listMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(COMPANY_DOCS_POLL_MS);
    });
    expect(listMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(COMPANY_DOCS_POLL_MS);
    });
    expect(listMock).toHaveBeenCalledTimes(3);

    // 모두 ready가 되면 더 이상 읽지 않는다
    await act(async () => {
      jest.advanceTimersByTime(COMPANY_DOCS_POLL_MS * 3);
    });
    expect(listMock).toHaveBeenCalledTimes(3);
  });

  it('삭제를 확인하면 목록에서 빠진다', async () => {
    listMock.mockResolvedValue([doc({ id: 9 })]);
    deleteMock.mockResolvedValue(undefined);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPanel();
    await screen.findByTestId('company-doc-row');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });

    expect(deleteMock).toHaveBeenCalledWith('오이사공', 9);
    await waitFor(() =>
      expect(screen.queryByTestId('company-doc-row')).not.toBeInTheDocument(),
    );
    confirmSpy.mockRestore();
  });

  it('삭제를 취소하면 아무 일도 없다', async () => {
    listMock.mockResolvedValue([doc({ id: 9 })]);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();
    await screen.findByTestId('company-doc-row');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('company-doc-row')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});

describe('CompanyDocsPanel - 본문 보기', () => {
  it('사용 가능 문서에만 보기 버튼이 있고, 처리 중·실패 문서엔 삭제만 있다', async () => {
    listMock.mockResolvedValue([
      doc({ id: 1 }),
      doc({ id: 2, status: 'processing' }),
      doc({ id: 3, status: 'failed', error: 'DRM' }),
    ]);
    renderPanel();
    const rows = await screen.findAllByTestId('company-doc-row');
    expect(rows[0]).toContainElement(
      screen.getAllByRole('button', { name: 'View' })[0],
    );
    expect(screen.getAllByRole('button', { name: 'View' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(3);
  });

  it('보기를 누르면 같은 패널에 본문이 열리고, 목록으로 돌아오면 목록 그대로다', async () => {
    listMock.mockResolvedValue([
      doc({ id: 1 }),
      doc({ id: 2, filename: '경비규정.hwp' }),
    ]);
    contentMock.mockResolvedValue({
      document: doc({ id: 2 }),
      content: '제1조(목적)',
    });
    renderPanel();
    await screen.findAllByTestId('company-doc-row');

    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);

    expect(await screen.findByTestId('company-doc-content')).toHaveTextContent(
      '제1조(목적)',
    );
    expect(contentMock).toHaveBeenCalledWith(
      '오이사공',
      2,
      expect.any(AbortSignal),
    );
    expect(
      screen.getByRole('dialog', { name: 'Company documents' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('company-doc-row')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Upload files' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to list/ }));

    const rows = await screen.findAllByTestId('company-doc-row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('경비규정.hwp');
  });

  it('이미 삭제된 문서였으면 목록을 새로 읽는다', async () => {
    listMock.mockResolvedValueOnce([doc({ id: 1 })]).mockResolvedValueOnce([]);
    contentMock.mockRejectedValue(new CompanyDocsError('NOT_FOUND'));
    renderPanel();
    await screen.findByTestId('company-doc-row');

    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(
      await screen.findByText('This document has already been deleted'),
    ).toBeInTheDocument();
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: /Back to list/ }));
    expect(await screen.findByText(/No documents yet/)).toBeInTheDocument();
  });
});

describe('CompanyDocsPanel - 처리 중 진행 막대', () => {
  it('처리 중 문서에만 진행 막대가 있다', async () => {
    listMock.mockResolvedValue([
      doc({ id: 1, status: 'processing' }),
      doc({ id: 2 }),
      doc({ id: 3, status: 'failed', error: 'DRM' }),
    ]);
    renderPanel();
    const rows = await screen.findAllByTestId('company-doc-row');
    expect(rows[0].querySelector('[role="progressbar"]')).not.toBeNull();
    expect(rows[1].querySelector('[role="progressbar"]')).toBeNull();
    expect(rows[2].querySelector('[role="progressbar"]')).toBeNull();
  });
});
