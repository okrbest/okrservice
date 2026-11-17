import { openReadFileImageInNewTab } from '../../../../utils';

// 1x1 투명 PNG
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('openReadFileImageInNewTab — 사진 원본 새 탭 열기', () => {
  let open: jest.SpyInstance;
  let createObjectURL: jest.Mock;

  beforeEach(() => {
    open = jest.spyOn(window, 'open').mockImplementation(() => null);
    createObjectURL = jest.fn(() => 'blob:http://localhost/abc');
    (URL as any).createObjectURL = createObjectURL;
  });

  afterEach(() => {
    open.mockRestore();
  });

  it('글 속에 데이터로 들어간 사진(data:)은 브라우저가 막으므로 blob 주소로 연다', () => {
    openReadFileImageInNewTab(PNG_DATA_URL);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    expect(open).toHaveBeenCalledWith(
      'blob:http://localhost/abc',
      '_blank',
      'noopener,noreferrer',
    );
    expect(open.mock.calls[0][0]).not.toMatch(/^data:/);
  });

  it('같은 사진을 다시 열면 blob을 새로 만들지 않는다', () => {
    const gif = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    openReadFileImageInNewTab(gif);
    openReadFileImageInNewTab(gif);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('read-file 주소는 그대로 실제 주소로 연다(inline=true)', () => {
    openReadFileImageInNewTab('https://x.com/read-file?key=a.png');

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(open.mock.calls[0][0]).toContain('/read-file?');
    expect(open.mock.calls[0][0]).toContain('inline=true');
  });
});
