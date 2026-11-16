// ui-tickets에는 테스트 실행 환경이 없어 widgets의 jest로 돌린다:
// cd widgets && npx jest --config '{"rootDir":"../packages/ui-tickets","testEnvironment":"<rootDir>/../../widgets/node_modules/jest-environment-jsdom","moduleNameMapper":{"^@erxes/ui/(.*)$":"<rootDir>/../erxes-ui/$1"},"transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/src/boards/__tests__/editorEscape.test.ts"]}'
import { isEditorEscapeToClose } from '../editorEscape';

const setup = () => {
  document.body.innerHTML = `
    <div id="panel">
      <div class="ProseMirror" contenteditable="true"><p id="inside">글</p></div>
      <textarea id="title"></textarea>
    </div>
    <div class="ProseMirror" id="outside-editor"></div>
  `;

  return document.getElementById('panel') as HTMLElement;
};

const escapeOn = (id: string, key = 'Escape') => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  Object.defineProperty(event, 'target', {
    value: document.getElementById(id),
  });

  return event;
};

describe('isEditorEscapeToClose', () => {
  it('티켓 창 안 편집기에서 누른 ESC는 닫기로 본다', () => {
    const panel = setup();
    expect(isEditorEscapeToClose(escapeOn('inside'), panel)).toBe(true);
  });

  it('ESC가 아닌 키는 무시한다', () => {
    const panel = setup();
    expect(isEditorEscapeToClose(escapeOn('inside', 'Enter'), panel)).toBe(
      false,
    );
  });

  it('편집기가 아닌 곳(제목 칸)은 원래 동작에 맡긴다', () => {
    const panel = setup();
    expect(isEditorEscapeToClose(escapeOn('title'), panel)).toBe(false);
  });

  it('티켓 창 밖 편집기는 무시한다', () => {
    const panel = setup();
    expect(isEditorEscapeToClose(escapeOn('outside-editor'), panel)).toBe(
      false,
    );
  });

  it('멘션·/명령 추천 창이 떠 있으면 ESC는 추천 창만 닫는다', () => {
    const panel = setup();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div data-tippy-root><div class="tippy-box" data-state="visible"></div></div>',
    );
    expect(isEditorEscapeToClose(escapeOn('inside'), panel)).toBe(false);
  });

  it('창이 없으면 닫지 않는다', () => {
    setup();
    expect(isEditorEscapeToClose(escapeOn('inside'), null)).toBe(false);
  });
});
