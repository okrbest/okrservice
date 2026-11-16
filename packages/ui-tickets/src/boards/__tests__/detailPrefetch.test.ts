// 실행: specs/007-stage-scroll-window/quickstart.md 1절과 같은 방식 (testMatch만 이 파일로)
import { isDetailPrefetchFresh, markDetailPrefetched } from '../detailPrefetch';

describe('detailPrefetch', () => {
  it('미리 받은 적 없으면 새로 받아야 한다', () => {
    expect(isDetailPrefetchFresh('none', 1000)).toBe(false);
  });

  it('10초 안에 미리 받았으면 다시 받지 않는다', () => {
    markDetailPrefetched('a', 1000);
    expect(isDetailPrefetchFresh('a', 1000)).toBe(true);
    expect(isDetailPrefetchFresh('a', 10999)).toBe(true);
  });

  it('10초가 지나면 다시 받는다', () => {
    markDetailPrefetched('b', 1000);
    expect(isDetailPrefetchFresh('b', 11000)).toBe(false);
  });

  it('티켓마다 따로 기억한다', () => {
    markDetailPrefetched('c', 1000);
    expect(isDetailPrefetchFresh('d', 1000)).toBe(false);
  });
});
