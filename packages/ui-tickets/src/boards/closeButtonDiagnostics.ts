// 티켓 창 X가 "눌러도 반응 없음" 진단용 — 가려졌는지, 눌렸는데 안 닫혔는지 Sentry로 남긴다

// 진단 기록에 남길 짧은 요소 이름 (예: DIV#id.class1.class2.class3)
export const describeElement = (el: Element | null): string | null => {
  if (!el) {
    return null;
  }

  const id = el.id ? `#${el.id}` : '';
  const classes = (el.getAttribute('class') || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((name) => `.${name}`)
    .join('');

  return `${el.tagName}${id}${classes}`;
};

// 누른 자리가 보이는 X 버튼 위인데 클릭을 다른 요소가 받았으면 그 X를 돌려준다
export const findCoveredCloseButton = (
  buttons: Array<HTMLElement | null>,
  x: number,
  y: number,
  target: Element | null,
): HTMLElement | null => {
  for (const button of buttons) {
    if (!button) {
      continue;
    }

    const box = button.getBoundingClientRect();
    const isVisible = box.width > 0 && box.height > 0;
    const isInside =
      x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;

    if (isVisible && isInside && !(target && button.contains(target))) {
      return button;
    }
  }

  return null;
};
