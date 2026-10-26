import * as React from 'react';

import { __, openReadFileImageInNewTab } from '../../../utils';

const EXPAND_ICON =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// 글 속 사진을 위젯 폭에 맞추고, 사진을 누르거나 오른쪽 아래 "원본" 버튼으로 원본을 새 탭에 연다
export const useOriginalImageLinks = (
  ref: React.RefObject<HTMLElement>,
  deps: React.DependencyList,
) => {
  React.useEffect(() => {
    const root = ref.current;

    if (!root) {
      return;
    }

    root.querySelectorAll('img:not([data-link-added])').forEach((element) => {
      const img = element as HTMLImageElement;
      const originalSrc = img.src || img.getAttribute('src');

      img.setAttribute('data-link-added', 'true');

      if (!originalSrc || !img.parentNode) {
        return;
      }

      const open = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        openReadFileImageInNewTab(originalSrc);
      };

      const frame = document.createElement('span');
      frame.className = 'tp-zoom';
      img.parentNode.insertBefore(frame, img);
      frame.appendChild(img);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tp-zoom-btn';
      button.setAttribute('aria-label', __('원본 이미지 보기'));
      button.innerHTML = `${EXPAND_ICON}<span></span>`;
      (button.querySelector('span') as HTMLSpanElement).textContent =
        __('Original');
      frame.appendChild(button);

      img.addEventListener('click', open);
      button.addEventListener('click', open);
    });
  }, deps);
};
