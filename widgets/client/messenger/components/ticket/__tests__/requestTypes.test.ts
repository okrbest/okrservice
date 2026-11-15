import {
  REQUEST_TYPES,
  WIDGET_REQUEST_TYPE,
  selectableRequestTypes,
} from '../requestTypes';

const values = (types: { value: string }[]) => types.map((t) => t.value);

describe('selectableRequestTypes', () => {
  it('접수할 때는 위젯을 포함한 전부 — 위젯은 맨 끝', () => {
    const types = selectableRequestTypes(false);
    expect(values(types)).toEqual(values(REQUEST_TYPES));
    expect(values(types).slice(-1)).toEqual([WIDGET_REQUEST_TYPE]);
  });

  it('위젯 티켓을 고칠 때는 위젯만 — 다른 유형으로 못 바꾼다', () => {
    expect(values(selectableRequestTypes(true, WIDGET_REQUEST_TYPE))).toEqual([
      WIDGET_REQUEST_TYPE,
    ]);
  });

  it('고객사 유형 티켓을 고칠 때는 위젯을 뺀 나머지', () => {
    const types = values(selectableRequestTypes(true, 'inquiry'));
    expect(types).not.toContain(WIDGET_REQUEST_TYPE);
    expect(types).toContain('error');
    expect(types).toHaveLength(REQUEST_TYPES.length - 1);
  });
});
