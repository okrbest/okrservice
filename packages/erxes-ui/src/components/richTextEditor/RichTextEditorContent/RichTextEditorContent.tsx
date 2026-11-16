import React, { useCallback } from 'react';
import { EditorContent, BubbleMenu, isTextSelection } from '@tiptap/react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { useRichTextEditorContext } from '../RichTextEditor.context';
import { ProseMirrorWrapper } from '../styles';
import TableMenuControls from '../RichTextEditorControl/TableMenuControls';
import { BubbleMenuShowProps } from '../RichTextEditorControl/TableControl';

export interface IRichTextEditorContentProps {
  /** The height of the editing area that includes the editor content. */
  height?: number | string;
  /** Whether editing area automatically expand and shrink vertically depending on the amount and size of content entered in its editing area. */
  autoGrow?: boolean;
  /** The maximum height that the editor can assume when adjusting to content by using the Auto Grow feature. */
  autoGrowMaxHeight?: number | string;
  /** The The minimum height that the editor can assume when adjusting to content by using the Auto Grow feature. */
  autoGrowMinHeight?: number | string;
}
// 코드 보기 편집기 설정은 한 번만 만든다 — 렌더마다 새로 넘기면 글자마다 전체 재설정(스타일 재주입)이 일어난다
const SOURCE_EXTENSIONS = [
  html({ matchClosingTags: true, selfClosingTags: true }).extension,
];
const SOURCE_STYLE = { outline: 'none' };

// @codemirror/view 6.28은 편집기를 닫아도 Chrome EditContext 연결을 끊지 않아,
// 편집기와 그 위의 화면(티켓 상세 창 전체)이 메모리에 남는다(6.31에서 수정됨).
// EditContext 대신 기존 입력 방식(Firefox·Safari와 같은 방식)을 쓰게 한다.
(EditorView as unknown as { EDIT_CONTEXT: boolean }).EDIT_CONTEXT = false;

export const RichTextEditorContent = (props: IRichTextEditorContentProps) => {
  const { editor, isSourceEnabled, codeMirrorRef, onChange } =
    useRichTextEditorContext();
  const {
    height = 120,
    autoGrowMinHeight = 120,
    autoGrowMaxHeight = 0,
    autoGrow = false,
  } = props;
  const editorStyle = {
    ...(autoGrow && { minHeight: autoGrowMinHeight }),
    ...(autoGrow && { maxHeight: autoGrowMaxHeight }),
    ...(!autoGrow && { height }),
  };
  function convertToPx(value: string | number) {
    // Check if the value is a number
    if (typeof value === 'number') {
      // Convert the number to a string with "px" suffix
      return `${value}px`;
    }
    return value;
  }

  const shouldShow = useCallback(
    ({ view, state, from, to }: BubbleMenuShowProps) => {
      if (
        state.selection.$anchor.node(1) &&
        state.selection.$anchor.node(1).type.name === 'table'
      ) {
        return true;
      }
      // Sometime check for `empty` is not enough
      const isEmptyTextBlock =
        !state.doc.textBetween(from, to).length &&
        isTextSelection(state.selection);

      if (!view.hasFocus() || state.selection.empty || isEmptyTextBlock) {
        return false;
      }
      return false;
    },
    [editor],
  );

  const onSourceChange = useCallback(
    (value: string) => {
      onChange && onChange(value);
    },
    [onChange],
  );

  return (
    <ProseMirrorWrapper
      data-prose-mirror-editor={true}
      $height={autoGrow ? undefined : convertToPx(height)}
      $autoGrow={autoGrow}
      $minHeight={convertToPx(autoGrow ? autoGrowMinHeight : height)}
      $maxHeight={convertToPx(autoGrow ? autoGrowMaxHeight : height)}
      style={{ flex: 1 }}
    >
      <CodeMirror
        ref={codeMirrorRef}
        style={SOURCE_STYLE}
        hidden={!isSourceEnabled}
        height={autoGrow ? undefined : convertToPx(height)}
        minHeight={convertToPx(autoGrow ? autoGrowMinHeight : height)}
        maxHeight={convertToPx(autoGrow ? autoGrowMaxHeight : height)}
        autoFocus={true}
        extensions={SOURCE_EXTENSIONS}
        onChange={onSourceChange}
      />
      <EditorContent
        hidden={isSourceEnabled}
        editor={editor}
        style={editorStyle}
      />

      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey="tableMenu"
          updateDelay={0}
          shouldShow={shouldShow}
        >
          <TableMenuControls />
        </BubbleMenu>
      )}
    </ProseMirrorWrapper>
  );
};
