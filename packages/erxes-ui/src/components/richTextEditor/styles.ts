import styled from 'styled-components';

const RichTextEditorWrapper = styled.div<{ $position: string }>`
  position: relative;
  background: #fff;
  overflow-y: auto;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;

  > div {
    overflow: auto;
  }

  .cm-editor.cm-focused {
    outline: none;
  }

  .Select-menu-outer {
    ${({ $position }) =>
    $position === 'bottom' &&
    `
    bottom: 100% !important;
    top: auto !important;
  `}
  }

  /* Bubble Menu */
  .bubble-menu {
    display: flex;
    align-items: center;
    gap: 2px;
    background: #1f2937;
    border-radius: 8px;
    padding: 4px 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);

    button {
      background: transparent;
      border: none;
      color: #e5e7eb;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      min-width: 28px;
      transition: background 0.1s;

      &:hover {
        background: rgba(255,255,255,0.15);
      }

      &.is-active {
        background: rgba(255,255,255,0.25);
        color: #fff;
      }
    }

    .bubble-menu-divider {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.2);
      margin: 0 2px;
    }
  }

  /* Slash Command List */
  .slash-command-list {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    padding: 6px;
    min-width: 260px;
    max-height: 360px;
    overflow-y: auto;
  }

  .slash-command-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: none;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;

    &:hover,
    &.is-selected {
      background: #f3f4f6;
    }
  }

  .slash-command-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #374151;
    flex-shrink: 0;
  }

  .slash-command-title {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .slash-command-desc {
    font-size: 12px;
    color: #6b7280;
    margin-top: 1px;
  }

  /* Callout blocks in editor */
  .callout-content > p,
  .callout-content p {
    margin: 0;
    line-height: 1.6;
  }
`;

const ProseMirrorWrapper = styled.div<{
  $height?: string;
  $minHeight: string;
  $maxHeight: string;
  $autoGrow?: boolean;
}>`
   {
    overflow-y: auto;
    height: ${(props) => (props.$height ? props.$height : 'unset')};
    min-height: ${(props) => (props.$minHeight ? props.$minHeight : 'unset')};
    max-height: ${(props) => (props.$maxHeight ? props.$maxHeight : 'unset')};
    ${({ $autoGrow }) => $autoGrow && `resize: vertical;`}
  }

  .ProseMirror {
    pre {
      background: #f6f8fa !important;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 12px 0;
      overflow-x: auto;

      code {
        background: transparent !important;
        color: #374151 !important;
        font-size: 13px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        padding: 0;
      }
    }

    code:not(pre code) {
      background: #f1f5f9 !important;
      color: #e11d48 !important;
      font-size: 13px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
  }
`;

const VariableWrapper = styled.div`
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 0.375rem;
  border-style: solid;
  border-width: 1px;
  border-color: #93c5fd;
  line-height: 1;
  background-color: #f1f5f9;
`;

const VariableListWrapper = styled.div<{ $hide?: boolean }>`
  z-index: 50;
  padding: 0.25rem;
  border-radius: 0.375rem;
  border-width: 1px;
  border-color: #e5e7eb;
  border-style: solid;
  height: auto;
  background-color: #ffffff;
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  ${({ $hide }) => $hide && `display: none;`}
`;

const VariableListBtn = styled.button<{ $focused?: boolean }>`
  display: flex;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-style: none;
  border-radius: 0.375rem;
  width: 100%;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: left;
  color: #111827;
  background-color: ${({ $focused }) => ($focused ? '#f3f4f6' : '#fff')};

  &:hover {
    cursor: pointer;
    background-color: #f3f4f6;
  }
`;

const VariableLabel = styled.label`
  display: block;
  margin-top: 0.375rem;
  width: 100%;
  line-height: 1;
  > span {
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 400;
    line-height: 1;
  }
  > input {
    display: flex;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    border-radius: 0.375rem;
    border-width: 1px;
    border-color: #e5e7eb;
    border-style: solid;
    --ring-offset-color: #ffffff;
    width: 100%;
    height: 2.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    background-color: #ffffff;
  }
`;

export {
  RichTextEditorWrapper,
  ProseMirrorWrapper,
  VariableWrapper,
  VariableListWrapper,
  VariableListBtn,
  VariableLabel,
};
