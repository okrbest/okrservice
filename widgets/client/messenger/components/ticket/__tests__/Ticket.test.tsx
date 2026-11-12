import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Ticket from '../Ticket';
import { connection } from '../../../connection';

jest.mock('../../../context/Ticket', () => ({
  useTicket: () => ({ unreadTicketCount: 0 }),
}));

jest.mock('../../common/Container', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Button의 classnames 네임스페이스 import가 ts-jest 타입 검사에 걸린다 — 숨김 푸터라 대체
jest.mock('../../common/Button', () => ({
  __esModule: true,
  default: () => null,
}));

const props = {
  loading: false,
  activeRoute: 'ticket-submit',
  handleSubmit: jest.fn(),
  handleButtonClick: jest.fn(),
};

describe('Ticket - 우리 회사 문서 메뉴', () => {
  beforeEach(() => {
    connection.data = {};
    connection.setting = {};
    // 패널이 열리면 목록을 불러온다 — 응답 없이 대기시킨다
    (global as any).fetch = jest.fn(() => new Promise(() => {}));
  });

  afterEach(() => {
    connection.setting = {};
  });

  it('companyData.name이 없으면 회사 문서 메뉴가 없다', () => {
    render(<Ticket {...props} />);
    expect(screen.queryByText('Company documents')).not.toBeInTheDocument();
  });

  it('companyData.name이 있으면 매뉴얼 바로 아래에 회사 문서 메뉴가 있다', () => {
    connection.setting = { companyData: { name: '오이사공' } };
    render(<Ticket {...props} />);

    const titles = Array.from(
      document.querySelectorAll('.ticket-menu-title'),
    ).map((el) => el.firstChild?.textContent); // 새 기능 표시 글자는 빼고 제목만
    expect(titles.slice(-2)).toEqual(['Manual', 'Company documents']);
  });

  it('메뉴를 누르면 문서 패널이 열리고, 닫으면 메뉴로 돌아온다', () => {
    connection.setting = { companyData: { name: '오이사공' } };
    render(<Ticket {...props} />);

    fireEvent.click(screen.getByText('Company documents'));
    expect(
      screen.getByRole('dialog', { name: 'Company documents' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});

describe('Ticket - 우리 회사 문서 새 기능 표시', () => {
  beforeEach(() => {
    localStorage.clear();
    connection.data = {};
    connection.setting = { companyData: { name: '오이사공' } };
    (global as any).fetch = jest.fn(() => new Promise(() => {}));
  });

  afterEach(() => {
    connection.setting = {};
  });

  it('한 번도 열지 않았으면 새 기능 표시가 보인다', () => {
    render(<Ticket {...props} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('메뉴를 한 번 열면 표시가 사라지고 다시 와도 안 보인다', () => {
    const { unmount } = render(<Ticket {...props} />);
    fireEvent.click(screen.getByText('Company documents'));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('New')).not.toBeInTheDocument();

    unmount();
    render(<Ticket {...props} />);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });

  it('브라우저 저장소를 못 쓰면 매번 띄우는 대신 표시하지 않는다', () => {
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    render(<Ticket {...props} />);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
