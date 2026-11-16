// 티켓 요청 구분(저장 값은 그대로) — 한 줄 설명을 칩에 늘 보여준다
// "챗봇"(저장 값 widget)은 고객사가 아니라 운영자 보드로 들어간다(서버가 정함, specs/006)
export const WIDGET_REQUEST_TYPE = 'widget';

export const REQUEST_TYPES = [
  { value: 'inquiry', label: '단순문의', hint: '궁금한 점' },
  { value: 'error', label: '오류처리', hint: '버그·오류 신고' },
  { value: 'improvement', label: '개선요청', hint: '기능 개선' },
  { value: 'usage_guide', label: '사용안내', hint: '사용 방법' },
  { value: 'config', label: '설정변경', hint: '설정 바꾸기' },
  { value: 'data_work', label: '데이터작업', hint: '데이터 요청' },
  { value: 'additional_development', label: '추가개발', hint: '새 기능 개발' },
  { value: WIDGET_REQUEST_TYPE, label: '챗봇', hint: '챗봇 관련 문의' },
];

/** 고칠 때는 위젯 ↔ 다른 유형으로 못 바꾼다 — 티켓은 처음 들어간 보드에 남기 때문 */
export const selectableRequestTypes = (
  isEdit: boolean,
  originalType?: string,
) => {
  if (!isEdit) {
    return REQUEST_TYPES;
  }

  const isWidget = originalType === WIDGET_REQUEST_TYPE;

  return REQUEST_TYPES.filter(
    (type) => (type.value === WIDGET_REQUEST_TYPE) === isWidget,
  );
};
