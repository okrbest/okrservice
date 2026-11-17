// SelectWithSearch(담당자·부서·지점 등 검색 선택 상자)의 목록 규칙 — 순수 함수

type Option = { value: string };

/**
 * 새로 받은 목록으로 보여 줄 항목을 만든다: 선택된 항목 + 이번에 받은 항목 전체(같은 값은 한 번).
 * 예전에는 "이미 보였던 항목"을 빼고 새 항목만 붙여서, 다시 받은 결과가 전부 이미 보였던
 * 항목이면 목록이 선택된 항목만 남아 비어 보였다(담당자 여러 명 고를 때 직원 목록이 안 뜸).
 */
export const mergeLoadedOptions = <T extends Option>({
  selectedOptions,
  loadedOptions,
  exactFilter,
}: {
  selectedOptions?: T[];
  loadedOptions: T[];
  exactFilter?: boolean;
}): T[] => {
  const seen = new Set<string>();

  return [
    ...(exactFilter ? [] : selectedOptions || []),
    ...loadedOptions,
  ].filter((option) => {
    if (!option || seen.has(option.value)) {
      return false;
    }

    seen.add(option.value);
    return true;
  });
};

/**
 * 입력칸 변화 → 검색어. 검색하지 않아야 하면 null.
 * react-select는 항목을 고르거나(set-value) 메뉴를 닫거나(menu-close) 포커스를 잃을 때(input-blur)도
 * 입력칸을 비우며 알려 준다 — 이것까지 검색으로 보면 열린 목록 조회가 취소되고 "선택된 항목만" 조회로 바뀐다.
 * 사용자가 입력을 다 지우면 전체 목록(reload)을 다시 받는다.
 */
export const nextSearchValue = (
  inputValue: string,
  action?: string,
): string | null => {
  if (action && action !== 'input-change') {
    return null;
  }

  return inputValue ? inputValue : 'reload';
};

/** 선택된 값마다 알고 있는 항목(여러 목록 중 앞의 것 우선)에서 찾아 순서대로 돌려준다 */
export const pickSelectedOptions = <T extends Option>(
  values: string[] = [],
  ...pools: Array<T[] | undefined>
): T[] => {
  const known = new Map<string, T>();

  pools.forEach((pool) =>
    (pool || []).forEach((option) => {
      if (option && !known.has(option.value)) {
        known.set(option.value, option);
      }
    }),
  );

  return values
    .map((value) => known.get(value))
    .filter((option): option is T => Boolean(option));
};

/** 두 값 목록의 내용이 같은가(순서 포함) */
export const sameValues = (a?: string[], b?: string[]): boolean => {
  const left = a || [];
  const right = b || [];

  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

/**
 * 목록을 열 때 목록 조회를 미뤄야 하나 — 처음 "현재 선택값" 조회(searchValue '')가 아직 오는 중이면 미룬다.
 * 바로 목록 조회를 시작하면 그 조회가 취소돼 선택 칩이 안 그려지고(목록은 "No options"/닫힘),
 * 그 상태로 다른 항목을 고르면 원래 선택값이 빠진 채 저장된다(응답이 느릴 때 "바로 누르면" 생김).
 */
export const shouldDeferReload = ({
  loading,
  searchValue,
}: {
  loading?: boolean;
  searchValue?: string;
}): boolean => Boolean(loading) && !searchValue;
