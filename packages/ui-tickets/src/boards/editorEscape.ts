// 편집기(ProseMirror)는 ESC를 늘 "처리함"으로 표시해서, 티켓 창(headlessui Dialog)이
// ESC를 무시한다. 창 안 편집기에서 누른 ESC는 직접 닫기로 넘긴다.
// 멘션·/명령 추천 창이 떠 있으면 그 ESC는 추천 창을 닫는 데 쓰인다.
export const isEditorEscapeToClose = (
  event: KeyboardEvent,
  panel: HTMLElement | null,
): boolean => {
  if (event.key !== 'Escape' || !panel) {
    return false;
  }

  const target = event.target as HTMLElement | null;

  if (!target || !target.closest || !panel.contains(target)) {
    return false;
  }

  if (!target.closest('.ProseMirror')) {
    return false;
  }

  return !document.querySelector(
    '[data-tippy-root] .tippy-box[data-state="visible"]',
  );
};
