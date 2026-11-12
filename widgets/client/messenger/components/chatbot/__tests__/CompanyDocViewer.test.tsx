import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import CompanyDocViewer from '../CompanyDocViewer';
import {
  CompanyDoc,
  CompanyDocsError,
  getCompanyDocContent,
} from '../companyDocs';

jest.mock('../companyDocs', () => {
  const actual = jest.requireActual('../companyDocs');
  return { ...actual, getCompanyDocContent: jest.fn() };
});

const contentMock = getCompanyDocContent as jest.Mock;

const DOC: CompanyDoc = {
  id: 12,
  filename: '2026 취업규칙.pdf',
  uploaderName: '홍길동',
  status: 'ready',
  error: null,
  createdAt: '2026-11-10T01:00:00.000Z',
};

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderViewer(
  props: Partial<React.ComponentProps<typeof CompanyDocViewer>> = {},
) {
  const onBack = jest.fn();
  const onMissing = jest.fn();
  const utils = render(
    <CompanyDocViewer
      companyName="오이사공"
      doc={DOC}
      onBack={onBack}
      onMissing={onMissing}
      {...props}
    />,
  );
  return { ...utils, onBack, onMissing };
}

beforeEach(() => contentMock.mockReset());

describe('CompanyDocViewer - 본문 보기', () => {
  it('불러오는 동안 안내 후 머리글과 본문 전체를 보여준다', async () => {
    const d = deferred<{ document: CompanyDoc; content: string }>();
    contentMock.mockReturnValue(d.promise);
    renderViewer();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(contentMock).toHaveBeenCalledWith(
      '오이사공',
      12,
      expect.any(AbortSignal),
    );

    await act(async () => {
      d.resolve({
        document: DOC,
        content: '제1장 총칙\n제16조(근로시간) 09:30',
      });
    });

    expect(screen.getByText('2026 취업규칙.pdf')).toBeInTheDocument();
    expect(screen.getByText(/홍길동/)).toHaveTextContent('2026-11-10');
    expect(
      screen.getByText('This is the text the chatbot reads from this document'),
    ).toBeInTheDocument();
    const body = screen.getByTestId('company-doc-content');
    expect(body.textContent).toBe('제1장 총칙\n제16조(근로시간) 09:30');
    expect(body).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('본문 속 꺾쇠 문자는 글자 그대로 보이고 요소가 되지 않는다', async () => {
    contentMock.mockResolvedValue({
      document: DOC,
      content: '<b>굵게</b><img src=x onerror="alert(1)">',
    });
    renderViewer();
    const body = await screen.findByTestId('company-doc-content');
    expect(body.textContent).toBe('<b>굵게</b><img src=x onerror="alert(1)">');
    expect(body.querySelector('b, img')).toBeNull();
  });

  it('본문이 비어 있으면 안내한다', async () => {
    contentMock.mockResolvedValue({ document: DOC, content: '   ' });
    renderViewer();
    expect(
      await screen.findByText('There is no content to show'),
    ).toBeInTheDocument();
  });

  it('목록 버튼은 onBack을 부른다', async () => {
    contentMock.mockResolvedValue({ document: DOC, content: 'x' });
    const { onBack } = renderViewer();
    await screen.findByTestId('company-doc-content');
    fireEvent.click(screen.getByRole('button', { name: /Back to list/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('화면이 사라지면 요청을 취소하고 늦은 응답은 무시한다', async () => {
    const d = deferred<{ document: CompanyDoc; content: string }>();
    contentMock.mockReturnValue(d.promise);
    const { unmount, onMissing } = renderViewer();
    const signal: AbortSignal = contentMock.mock.calls[0][2];

    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      d.reject(new CompanyDocsError('NOT_FOUND'));
    });
    expect(onMissing).not.toHaveBeenCalled();
  });
});

describe('CompanyDocViewer - 문서가 바뀌는 경우', () => {
  it('다른 문서로 바뀌면 이전 요청을 취소하고 늦게 온 이전 본문을 보여주지 않는다', async () => {
    const first = deferred<{ document: CompanyDoc; content: string }>();
    const second = deferred<{ document: CompanyDoc; content: string }>();
    contentMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { rerender, onBack, onMissing } = renderViewer();
    const firstSignal: AbortSignal = contentMock.mock.calls[0][2];

    const other = { ...DOC, id: 13, filename: '경비규정.hwp' };
    rerender(
      <CompanyDocViewer
        companyName="오이사공"
        doc={other}
        onBack={onBack}
        onMissing={onMissing}
      />,
    );
    expect(firstSignal.aborted).toBe(true);
    expect(contentMock).toHaveBeenLastCalledWith(
      '오이사공',
      13,
      expect.any(AbortSignal),
    );

    await act(async () => {
      second.resolve({ document: other, content: '경비 본문' });
    });
    await act(async () => {
      first.resolve({ document: DOC, content: '이전 본문' });
    });
    expect(screen.getByTestId('company-doc-content').textContent).toBe(
      '경비 본문',
    );
  });

  it('본문이 문자열이 아니면 빈 본문 안내로 보여준다', async () => {
    contentMock.mockResolvedValue({ document: DOC, content: null });
    renderViewer();
    expect(
      await screen.findByText('There is no content to show'),
    ).toBeInTheDocument();
  });
});

describe('CompanyDocViewer - 볼 수 없는 경우', () => {
  it('이미 삭제된 문서면 안내하고 onMissing을 부른다', async () => {
    contentMock.mockRejectedValue(new CompanyDocsError('NOT_FOUND'));
    const { onMissing } = renderViewer();
    expect(
      await screen.findByText('This document has already been deleted'),
    ).toBeInTheDocument();
    expect(onMissing).toHaveBeenCalledTimes(1);
  });

  it('아직 처리 중이면 처리 중 안내', async () => {
    contentMock.mockRejectedValue(new CompanyDocsError('NOT_READY'));
    renderViewer();
    expect(
      await screen.findByText('This document is still being processed'),
    ).toBeInTheDocument();
  });

  it('그 외 오류는 다시 시도할 수 있다', async () => {
    contentMock
      .mockRejectedValueOnce(new CompanyDocsError('CONTENT_MISSING'))
      .mockResolvedValueOnce({ document: DOC, content: '제1조' });
    const { onMissing } = renderViewer();
    expect(
      await screen.findByText("Couldn't load the content. Please try again"),
    ).toBeInTheDocument();
    expect(onMissing).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('company-doc-content')).toHaveTextContent(
      '제1조',
    );
    expect(contentMock).toHaveBeenCalledTimes(2);
  });
});
