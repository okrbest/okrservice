// 실행(widgets의 jest 사용):
// cd widgets && npx jest --config '{"rootDir":"../packages/erxes-ui","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/src/components/__tests__/selectWithSearchOptions.test.ts"]}'
import {
  mergeLoadedOptions,
  nextSearchValue,
  pickSelectedOptions,
  sameValues,
} from '../selectWithSearchOptions';

const opt = (value: string) => ({ value, label: value });

describe('mergeLoadedOptions', () => {
  it('선택된 항목 + 이번에 받은 항목 전체 — 이미 보였던 항목도 버리지 않는다', () => {
    // 담당자 1명을 고른 뒤 다시 받은 목록에 이미 보였던 직원(u)이 다시 온 경우
    expect(
      mergeLoadedOptions({
        selectedOptions: [opt('yeji')],
        loadedOptions: [opt('u')],
      }).map((o) => o.value),
    ).toEqual(['yeji', 'u']);
  });

  it('같은 항목은 한 번만', () => {
    expect(
      mergeLoadedOptions({
        selectedOptions: [opt('a')],
        loadedOptions: [opt('a'), opt('b'), opt('b')],
      }).map((o) => o.value),
    ).toEqual(['a', 'b']);
  });

  it('exactFilter면 선택된 항목을 섞지 않는다(기존 동작)', () => {
    expect(
      mergeLoadedOptions({
        selectedOptions: [opt('a')],
        loadedOptions: [opt('b')],
        exactFilter: true,
      }).map((o) => o.value),
    ).toEqual(['b']);
  });

  it('선택·받은 항목이 없으면 빈 목록', () => {
    expect(mergeLoadedOptions({ loadedOptions: [] })).toEqual([]);
  });
});

describe('nextSearchValue', () => {
  it('사용자가 글자를 입력할 때만 검색한다', () => {
    expect(nextSearchValue('kim', 'input-change')).toBe('kim');
  });

  it('입력을 다 지우면 선택된 사람만이 아니라 전체 목록을 다시 받는다', () => {
    expect(nextSearchValue('', 'input-change')).toBe('reload');
  });

  it('선택·메뉴 닫기·포커스 잃기로 입력칸이 비는 것은 검색이 아니다', () => {
    expect(nextSearchValue('', 'set-value')).toBeNull();
    expect(nextSearchValue('', 'menu-close')).toBeNull();
    expect(nextSearchValue('', 'input-blur')).toBeNull();
  });

  it('동작 정보가 없으면(예전 호출) 예전처럼 입력값으로 검색한다', () => {
    expect(nextSearchValue('kim', undefined)).toBe('kim');
    expect(nextSearchValue('', undefined)).toBe('reload');
  });
});

describe('pickSelectedOptions', () => {
  it('선택된 값마다 알고 있는 항목 전체에서 찾는다 — 방금 고른 항목이 이번 목록에 없어도 남는다', () => {
    // 담당자를 2명 고른 뒤, 목록 조회는 "이미 선택된 사람 제외"라 빈 결과가 온 경우
    expect(
      pickSelectedOptions(
        ['yeji', 'u'],
        [opt('yeji')], // 이번에 계산한 목록
        [opt('yeji'), opt('u')], // 직전 선택 항목
      ).map((o) => o.value),
    ).toEqual(['yeji', 'u']);
  });

  it('고른 순서를 지키고, 정보가 없는 값은 건너뛴다', () => {
    expect(
      pickSelectedOptions(['b', 'x', 'a'], [opt('a'), opt('b')]).map(
        (o) => o.value,
      ),
    ).toEqual(['b', 'a']);
  });
});

describe('sameValues', () => {
  it('내용이 같으면 같은 값(배열 객체가 새로 만들어져도)', () => {
    expect(sameValues(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameValues([], undefined)).toBe(true);
  });

  it('내용이 다르면 다른 값', () => {
    expect(sameValues(['a'], ['a', 'b'])).toBe(false);
    expect(sameValues(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});
