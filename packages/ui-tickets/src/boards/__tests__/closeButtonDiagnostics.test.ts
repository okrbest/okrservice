// ui-tickets에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/ui-tickets","testEnvironment":"<rootDir>/../../widgets/node_modules/jest-environment-jsdom","moduleNameMapper":{"^@erxes/ui/(.*)$":"<rootDir>/../erxes-ui/$1"},"transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/src/boards/__tests__/closeButtonDiagnostics.test.ts"]}'
import {
  describeElement,
  findCoveredCloseButton,
} from '../closeButtonDiagnostics';

const rect = (x: number, y: number, w: number, h: number) =>
  ({
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
  }) as DOMRect;

const setup = () => {
  document.body.innerHTML = `
    <div id="close"><i id="icon"></i></div>
    <div id="cover" class="sticky-header top big extra"></div>
    <div id="hidden-close"></div>
  `;
  const close = document.getElementById('close') as HTMLElement;
  const hidden = document.getElementById('hidden-close') as HTMLElement;
  close.getBoundingClientRect = () => rect(100, 10, 30, 30);
  hidden.getBoundingClientRect = () => rect(0, 0, 0, 0);

  return { close, hidden };
};

const el = (id: string) => document.getElementById(id) as HTMLElement;

describe('findCoveredCloseButton', () => {
  it('X 자리를 눌렀는데 다른 요소가 클릭을 받으면 그 X를 돌려준다', () => {
    const { close } = setup();
    expect(findCoveredCloseButton([close], 110, 20, el('cover'))).toBe(close);
  });

  it('X(안의 아이콘 포함)가 클릭을 받으면 가려진 게 아니다', () => {
    const { close } = setup();
    expect(findCoveredCloseButton([close], 110, 20, el('icon'))).toBeNull();
    expect(findCoveredCloseButton([close], 110, 20, close)).toBeNull();
  });

  it('X 자리 밖을 누른 것은 무시한다', () => {
    const { close } = setup();
    expect(findCoveredCloseButton([close], 300, 300, el('cover'))).toBeNull();
  });

  it('화면에 안 보이는(크기 0) 버튼과 빈 자리는 무시한다', () => {
    const { hidden } = setup();
    expect(
      findCoveredCloseButton([hidden, null], 0, 0, el('cover')),
    ).toBeNull();
  });
});

describe('describeElement', () => {
  it('태그와 앞 클래스 3개, id를 짧게 적는다', () => {
    setup();
    expect(describeElement(el('cover'))).toBe(
      'DIV#cover.sticky-header.top.big',
    );
  });

  it('없으면 null', () => {
    expect(describeElement(null)).toBeNull();
  });
});
