import { getHrBaseUrl, buildHrUrl } from '../getHrBaseUrl';

jest.mock('../../../connection', () => ({
  connection: {
    setting: {},
    browserInfo: {},
  },
}));

import { connection } from '../../../connection';

const mockConnection = connection as any;

beforeEach(() => {
  mockConnection.setting = {};
  mockConnection.browserInfo = {};
  delete (window as any).erxesEnv;
  delete process.env.HR_BASE_URL;
});

describe('getHrBaseUrl', () => {
  describe('우선순위 1: connection.setting.hrBaseUrl', () => {
    it('hrBaseUrl이 있으면 해당 값을 반환한다', () => {
      mockConnection.setting = { hrBaseUrl: 'https://xxx.okr.best' };
      expect(getHrBaseUrl()).toBe('https://xxx.okr.best');
    });

    it('trailing slash를 제거한다', () => {
      mockConnection.setting = { hrBaseUrl: 'https://xxx.okr.best/' };
      expect(getHrBaseUrl()).toBe('https://xxx.okr.best');
    });

    it('hrBaseUrl이 빈 문자열이면 다음 순위로 넘어간다', () => {
      mockConnection.setting = { hrBaseUrl: '' };
      mockConnection.browserInfo = { hostname: 'https://company.example.com' };
      expect(getHrBaseUrl()).toBe('https://company.example.com');
    });
  });

  describe('우선순위 2: connection.browserInfo.hostname (자동 감지)', () => {
    it('hrBaseUrl 없고 hostname이 있으면 hostname을 반환한다', () => {
      mockConnection.browserInfo = { hostname: 'https://company.example.com' };
      expect(getHrBaseUrl()).toBe('https://company.example.com');
    });

    it('hostname이 localhost이면 건너뛴다', () => {
      mockConnection.browserInfo = { hostname: 'http://localhost:3000' };
      (window as any).erxesEnv = { HR_BASE_URL: 'https://env.example.com' };
      expect(getHrBaseUrl()).toBe('https://env.example.com');
    });

    it('hostname이 127.0.0.1이면 건너뛴다', () => {
      mockConnection.browserInfo = { hostname: 'http://127.0.0.1:3000' };
      (window as any).erxesEnv = { HR_BASE_URL: 'https://env.example.com' };
      expect(getHrBaseUrl()).toBe('https://env.example.com');
    });

    it('hostname trailing slash를 제거한다', () => {
      mockConnection.browserInfo = { hostname: 'https://company.example.com/' };
      expect(getHrBaseUrl()).toBe('https://company.example.com');
    });
  });

  describe('우선순위 3: window.erxesEnv.HR_BASE_URL', () => {
    it('hrBaseUrl/hostname 없고 erxesEnv가 있으면 해당 값을 반환한다', () => {
      (window as any).erxesEnv = { HR_BASE_URL: 'https://env.example.com' };
      expect(getHrBaseUrl()).toBe('https://env.example.com');
    });
  });

  describe('우선순위 4: process.env.HR_BASE_URL', () => {
    it('erxesEnv 없고 process.env가 있으면 해당 값을 반환한다', () => {
      process.env.HR_BASE_URL = 'https://processenv.example.com';
      expect(getHrBaseUrl()).toBe('https://processenv.example.com');
    });
  });

  describe('우선순위 5: 하드코딩 폴백', () => {
    it('모든 소스가 없으면 기본값을 반환한다', () => {
      expect(getHrBaseUrl()).toBe('https://api.5240.cloud');
    });
  });

  describe('우선순위 체인', () => {
    it('hrBaseUrl이 있으면 hostname을 무시한다', () => {
      mockConnection.setting = { hrBaseUrl: 'https://explicit.example.com' };
      mockConnection.browserInfo = { hostname: 'https://host.example.com' };
      expect(getHrBaseUrl()).toBe('https://explicit.example.com');
    });

    it('hrBaseUrl이 있으면 erxesEnv를 무시한다', () => {
      mockConnection.setting = { hrBaseUrl: 'https://explicit.example.com' };
      (window as any).erxesEnv = { HR_BASE_URL: 'https://env.example.com' };
      expect(getHrBaseUrl()).toBe('https://explicit.example.com');
    });
  });
});

describe('buildHrUrl', () => {
  it('빈 문자열이면 base URL만 반환한다', () => {
    mockConnection.setting = { hrBaseUrl: 'https://xxx.okr.best' };
    expect(buildHrUrl('')).toBe('https://xxx.okr.best');
  });

  it('절대 URL은 그대로 반환한다', () => {
    expect(buildHrUrl('https://other.example.com/path')).toBe('https://other.example.com/path');
  });

  it('상대 경로는 base URL과 결합한다', () => {
    mockConnection.setting = { hrBaseUrl: 'https://xxx.okr.best' };
    expect(buildHrUrl('/MobileMain.do')).toBe('https://xxx.okr.best/MobileMain.do');
  });

  it('슬래시 없는 상대 경로도 슬래시 추가 후 결합한다', () => {
    mockConnection.setting = { hrBaseUrl: 'https://xxx.okr.best' };
    expect(buildHrUrl('MobileMain.do')).toBe('https://xxx.okr.best/MobileMain.do');
  });
});
