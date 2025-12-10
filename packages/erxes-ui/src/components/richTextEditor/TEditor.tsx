import * as controls from "./RichTextEditorControl/controls";

import { DEFAULT_LABELS, IRichTextEditorLabels } from "./labels";
import { DropdownControlType, getToolbar } from "./utils/getToolbarControl";
import { Editor, useEditor } from "@tiptap/react";
import {
  IRichTextEditorContentProps,
  RichTextEditorContent,
} from "./RichTextEditorContent/RichTextEditorContent";
import {
  MoreButtonControl,
  RichTextEditorColorControl,
  RichTextEditorFontControl,
  RichTextEditorHighlightControl,
  RichTextEditorImageControl,
  RichTextEditorLinkControl,
  RichTextEditorPlaceholderControl,
  RichTextEditorSourceControl,
  TableControl,
} from "./RichTextEditorControl";
import { RichTextEditorControlBase } from "./RichTextEditorControl/RichTextEditorControl";

import { Popover } from "@headlessui/react";
import { CompactPicker } from "react-color";
import {
  MenuItem,
  ColorPickerWrapper,
  PickerAction,
} from "./RichTextEditorControl/styles";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  replaceMentionsWithText,
  replaceSpanWithMention,
} from "./utils/replaceMentionNode";
import useExtensions, {
  generateHTML,
  useGenerateJSON,
} from "./hooks/useExtensions";
import { MentionSuggestionParams } from "./utils/getMentionSuggestions";
import { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { RichTextEditorControl } from "./RichTextEditorControl/RichTextEditorControl";
import { RichTextEditorControlsGroup } from "./RichTextEditorControlsGroup/RichTextEditorControlsGroup";
import { RichTextEditorProvider } from "./RichTextEditor.context";
import { RichTextEditorToolbar } from "./RichTextEditorToolbar/RichTextEditorToolbar";
import { RichTextEditorWrapper } from "./styles";
import Separator from "./RichTextEditorControlsGroup/Separator";

const POSITION_TOP = "top";
const POSITION_BOTTOM = "bottom";
type toolbarLocationOption = "bottom" | "top";
type ToolbarItem = string | DropdownControlType;
export type EditorMethods = {
  getIsFocused: () => boolean | undefined;
  getEditor: () => Editor | null;
  focus: (position?: "start" | "end" | "all" | number | boolean | null) => void;
};
export interface IRichTextEditorProps extends IRichTextEditorContentProps {
  placeholder?: string;
  /** Controlled value */
  content?: string;
  /** Exposing editor onChange to outer component via props */
  onChange?: (editorHtml: string) => void;
  labels?: IRichTextEditorLabels;
  toolbarLocation?: toolbarLocationOption;
  autoFocus?: boolean;
  /** Toolbar controls config */
  toolbar?: ToolbarItem[];
  name?: string;
  isSubmitted?: boolean;
  /** Mention suggestion string list */
  mentionSuggestion?: MentionSuggestionParams;
  /** Mention suggestion string list */
  placeholderProp?: any;
  showMentions?: boolean;
  /** Character count limit. */
  limit?: number;
  contentType?: string;
  integrationKind?: string;
  onCtrlEnter?: () => void;
  additionalToolbarContent?: (props: {
    onClick: (placeholder: string) => void;
  }) => React.ReactNode;
  /** Optional initial color for custom block background */
  initialBlockColor?: string;
}

const RichTextEditor = forwardRef(function RichTextEditor(
  props: IRichTextEditorProps,
  ref: React.ForwardedRef<EditorMethods>
) {
  const {
    placeholder = "",
    content = "",
    onChange,
    labels,
    toolbarLocation = POSITION_TOP,
    height,
    autoGrow,
    autoGrowMaxHeight,
    autoGrowMinHeight,
    name,
    isSubmitted,
    showMentions = false,
    mentionSuggestion,
    placeholderProp,
    integrationKind,
    limit,
    toolbar,
    autoFocus,
    onCtrlEnter,
    additionalToolbarContent,
  } = props;
  const formattedContent = content ? content.replace(/\n/g, "<br />") : "";
  const editorContentProps = {
    height,
    autoGrow,
    autoGrowMaxHeight,
    autoGrowMinHeight,
  };
  const editorRef: React.MutableRefObject<Editor | null> = useRef(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null);
  const [isSourceEnabled, setIsSourceEnabled] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const isInitialContentSet = useRef(false); // 초기 content 설정 여부 추적
  const hasRestoredFromLocalStorage = useRef(false); // localStorage 복원 여부 추적
  const extensions = useExtensions({
    placeholder,
    mentionSuggestion,
    limit,
  });

  // ⭐ 초기 content를 useEditor에 전달하여 히스토리에 추가되지 않도록 함
  const initialContent = useMemo(() => {
    // ⭐ 서버 사이드 렌더링 체크: localStorage는 브라우저에만 존재
    if (typeof window === 'undefined') {
      return content || '';
    }
    
    // localStorage 우선
    if (name) {
      try {
        const storedData = localStorage.getItem(name);
        if (storedData) {
          let storedContent: string;
          
          // JSON 형식으로 저장된 경우 (타임스탬프 포함)
          try {
            const parsed = JSON.parse(storedData);
            storedContent = parsed.content || storedData;
          } catch (e) {
            // 기존 형식 (문자열만 저장된 경우) - 하위 호환성
            storedContent = storedData;
          }
          
          if (storedContent) {
            const storedContentAsJson = useGenerateJSON(storedContent);
            return replaceSpanWithMention(storedContentAsJson);
          }
        }
      } catch (e) {
        // localStorage 접근 실패 시 content prop 사용
        console.warn('localStorage access failed:', e);
      }
    }
    // localStorage 없으면 content prop 사용
    return content || '';
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  const editor = useEditor({
    extensions,
    content: initialContent,  // ⭐ 초기 content 전달
    parseOptions: { preserveWhitespace: true },
    autofocus: autoFocus,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
  });

  useEffect(() => {
    const handleEditorChange = ({ editor }) => {
      const editorContent = editor.getHTML();
      onChange && onChange(editorContent);
      if (name && typeof window !== 'undefined') {
        // 타임스탬프와 함께 저장
        const dataToStore = JSON.stringify({
          content: editorContent,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem(name, dataToStore);
      }
    };
    editor && editor.on("update", handleEditorChange);
    return () => {
      editor && editor.off("update", handleEditorChange);
    };
  }, [editor, onChange, name]);

  useEffect(() => {
    setShowMention(showMentions);

    if (editor) {
      const currentContent = editor.getJSON();
      //** If editor had mention node and mention is not allowed, clear mention nodes */
      if (!showMentions) {
        editor.commands.setContent(replaceMentionsWithText(currentContent));
        onChange &&
          onChange(generateHTML(replaceMentionsWithText(currentContent)));
      } else {
        // Regenerate content: When reloading, mention nodes might become spanMarks, so convert them back to mention node
        const regeneratedContent = replaceSpanWithMention(currentContent);
        // Set the regenerated content to the editor
        editor.commands.setContent(regeneratedContent, false, {
          preserveWhitespace: true,
        });

        // If onChange function is provided, generate HTML from the content and call onChange
        onChange && onChange(generateHTML(regeneratedContent));
      }
    }
  }, [showMentions]);

  // ⭐ 에디터 초기화 후 히스토리 강제 클리어
  useEffect(() => {
    if (editor && !isInitialContentSet.current) {
      const initialHTML = editor.getHTML();
      console.log('🔍 [TEditor] Editor initialized with content:', {
        contentLength: initialHTML.length,
        contentPreview: initialHTML.substring(0, 100),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo()
      });
      
      // ⭐ 히스토리 강제 클리어: Tiptap이 초기 content도 히스토리에 추가하는 버그
      setTimeout(() => {
        if (editor && editor.view && editor.state) {
          console.log('🔍 [TEditor] Starting history clear...');
          
          // 원래 내용 저장
          const originalContent = editor.getHTML();
          
          console.log('🔍 [TEditor] Before clear:', {
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            contentLength: originalContent.length
          });
          
          // ⭐ 모든 undo 실행하여 히스토리 스택 비우기
          let undoCount = 0;
          while (editor.can().undo() && undoCount < 100) {
            editor.commands.undo();
            undoCount++;
          }
          
          console.log('🔍 [TEditor] After undoing all:', {
            undoCount,
            canUndo: editor.can().undo(),
            currentContent: editor.getHTML().substring(0, 50)
          });
          
          // 원래 내용으로 다시 설정 (히스토리에 추가하지 않음)
          editor.commands.setContent(originalContent, false);
          
          // Redo 스택도 비우기
          while (editor.can().redo()) {
            editor.commands.redo();
          }
          
          console.log('🔍 [TEditor] After forced history clear:', {
            canUndo: editor.can().undo(),
            canRedo: editor.can().redo(),
            content: editor.getHTML().substring(0, 100)
          });
        }
      }, 100);
      
      // 초기 content onChange 호출
      onChange && onChange(initialHTML);
      isInitialContentSet.current = true;
      
      if (name && typeof window !== 'undefined' && localStorage.getItem(name)) {
        hasRestoredFromLocalStorage.current = true;
      }
    }
  }, [editor]);

  useEffect(() => {
    if (name && isSubmitted && typeof window !== 'undefined') {
      localStorage.removeItem(name);
    }
  }, [name, isSubmitted]);

  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editorRef.current,
      getIsFocused: () => editorRef.current?.isFocused,
      focus: (position) => editorRef.current?.commands.focus(position),
    }),
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyEvents);
    return () => window.removeEventListener("keydown", handleKeyEvents);
  }, [handleKeyEvents]);

  function handleKeyEvents(event: KeyboardEvent) {
    const isFocused = editorRef?.current?.isFocused;

    if (!isFocused) return;

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      onCtrlEnter && onCtrlEnter();
    }
  }

  const mergedLabels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels]
  );

  // State for custom block background color
  // Use initialBlockColor only for initial value, then manage via setSelectedColor
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return props.initialBlockColor ?? "";
  });
  // Ref to keep track of the last inserted custom block
  const lastInsertedBlockRef = useRef<HTMLDivElement | null>(null);

  const editorParts = useMemo(
    () => [
      <RichTextEditorComponent.Toolbar key="rich-text-editor-toolbar-key">
        {placeholderProp && (
          <>
            <RichTextEditorComponent.Placeholder
              placeholderProp={placeholderProp}
            />
            <RichTextEditorComponent.Separator />
            {additionalToolbarContent
              ? additionalToolbarContent({
                  onClick: (placeHolder) =>
                    editor
                      ?.chain()
                      .focus()
                      .insertContent(`{{ ${placeHolder} }}`)
                      .run(),
                })
              : ""}
            <RichTextEditorComponent.Separator />
          </>
        )}
        {toolbar ? (
          getToolbar({ toolbar, toolbarLocation })
        ) : (
          <>
            <RichTextEditorComponent.FontSize />
            <RichTextEditorComponent.Separator />
            {integrationKind !== "telnyx" && (
              <RichTextEditorComponent.ControlsGroup
                isDropdown={true}
                controlNames={["heading"]}
                toolbarPlacement={toolbarLocation}
              >
                <RichTextEditorComponent.H1 />
                <RichTextEditorComponent.H2 />
                <RichTextEditorComponent.H3 />
              </RichTextEditorComponent.ControlsGroup>
            )}
            <RichTextEditorComponent.Separator />
            <RichTextEditorComponent.ControlsGroup>
              <RichTextEditorComponent.ColorControl />
              <RichTextEditorComponent.HighlightControl />
            </RichTextEditorComponent.ControlsGroup>
            <RichTextEditorComponent.Separator />
            {integrationKind !== "telnyx" && (
              <RichTextEditorComponent.ControlsGroup>
                <RichTextEditorComponent.Bold />
                <RichTextEditorComponent.Italic />
                <RichTextEditorComponent.Underline />
                <RichTextEditorComponent.Strikethrough />
              </RichTextEditorComponent.ControlsGroup>
            )}
            <RichTextEditorComponent.Separator />
            <RichTextEditorComponent.ControlsGroup
              isDropdown={true}
              controlNames={[
                { textAlign: "left" },
                { textAlign: "center" },
                { textAlign: "right" },
                { textAlign: "justify" },
              ]}
              toolbarPlacement={toolbarLocation}
            >
              <RichTextEditorComponent.AlignLeft />
              <RichTextEditorComponent.AlignRight />
              <RichTextEditorComponent.AlignCenter />
              <RichTextEditorComponent.AlignJustify />
            </RichTextEditorComponent.ControlsGroup>
            {integrationKind !== "telnyx" && (
              <RichTextEditorComponent.ControlsGroup
                isDropdown={true}
                controlNames={["orderedList", "bulletList"]}
                toolbarPlacement={toolbarLocation}
              >
                <RichTextEditorComponent.BulletList />
                <RichTextEditorComponent.OrderedList />
              </RichTextEditorComponent.ControlsGroup>
            )}
            <RichTextEditorComponent.Separator />
            <RichTextEditorComponent.ControlsGroup>
              <RichTextEditorComponent.SourceControl />
              <RichTextEditorComponent.MoreControl
                toolbarPlacement={toolbarLocation}
              >
                {integrationKind !== "telnyx" && (
                  <>
                    <RichTextEditorComponent.Blockquote />
                    <RichTextEditorComponent.HorizontalRule />
                    <RichTextEditorComponent.Link />
                    <RichTextEditorComponent.Unlink />
                  </>
                )}
                <RichTextEditorComponent.ImageControl />
                <RichTextEditorComponent.TableControl />
                {/* Custom Block Button */}
                {/*
                  CustomBlockIcon is declared below and used here as the icon for the control.
                */}
                <RichTextEditorComponent.ControlsGroup>
                  <RichTextEditorComponent.Control
                    icon={CustomBlockIcon}
                    onClick={() => {
                      // Use a fallback neutral color if selectedColor is empty
                      const newColor = selectedColor || "#f0f0f0";
                      const newBlockHTML = `<div style="background-color:${newColor}; padding:12px; border-radius:6px;" data-custom-block="true"><span style="color:inherit;">사용자 정의 블록 내용</span></div><p></p>`;
                      editor?.chain().focus().insertContent(newBlockHTML).run();
                      // After insertion, update the last inserted block and apply color
                      const blocks = wrapperRef.current?.querySelectorAll(
                        '[data-custom-block="true"]'
                      );
                      if (blocks && blocks.length > 0) {
                        lastInsertedBlockRef.current = blocks[
                          blocks.length - 1
                        ] as HTMLDivElement;
                        lastInsertedBlockRef.current.setAttribute(
                          "style",
                          `background-color:${newColor}; padding:12px; border-radius:6px;`
                        );
                      }
                    }}
                    data-tooltip="Custom Block"
                  />
                  {/* Color picker for custom block background */}
                  <Popover id="custom-block-color-picker">
                    {({ close }) => (
                      <>
                        <Popover.Button as="span">
                          <RichTextEditorControlBase
                            icon={CustomBlockIcon}
                            title="Block background"
                            active={false}
                          />
                        </Popover.Button>
                        <Popover.Panel>
                          <ColorPickerWrapper>
                            <CompactPicker
                              color={selectedColor}
                              onChange={(colorResult) => {
                                const newColor = colorResult.hex;
                                setSelectedColor(newColor);
                              }}
                              onChangeComplete={(colorResult) => {
                                const newColor = colorResult.hex;
                                setSelectedColor(newColor);
                                // Use a fallback neutral color if newColor is empty
                                const finalColor = newColor || "#f0f0f0";
                                const newBlockHTML = `<div style="background-color:${finalColor}; padding:12px; border-radius:6px;" data-custom-block="true"><span style="color:inherit;">사용자 정의 블록 내용</span></div><p></p>`;
                                editor
                                  ?.chain()
                                  .focus()
                                  .insertContent(newBlockHTML)
                                  .run();

                                const editorContent = editor?.getHTML();
                                onChange && onChange(editorContent);

                                close(); // Close the popover after color selection
                              }}
                            />
                            {/* <MenuItem onClick={() => setIsPickerVisible(true)}>
                              <Icon icon="paintpalette" />
                              Color picker
                            </MenuItem> */}
                          </ColorPickerWrapper>
                        </Popover.Panel>
                      </>
                    )}
                  </Popover>
                </RichTextEditorComponent.ControlsGroup>
              </RichTextEditorComponent.MoreControl>
            </RichTextEditorComponent.ControlsGroup>
          </>
        )}
      </RichTextEditorComponent.Toolbar>,
      <RichTextEditorContent
        {...editorContentProps}
        key="erxes-rte-content-key"
      />,
    ],
    [selectedColor]
  );

  const renderEditor = useCallback(() => {
    if (toolbarLocation === POSITION_TOP) {
      return (
        <>
          {editorParts[0]}
          {editorParts[1]}
        </>
      );
    }
    return (
      <>
        {editorParts[1]}
        {editorParts[0]}
      </>
    );
  }, []);

  const toggleSourceView = () => {
    const editorContent = editor?.getHTML() || "";
    onChange && onChange(editorContent);

    if (name && typeof window !== 'undefined') {
      // 타임스탬프와 함께 저장
      const dataToStore = JSON.stringify({
        content: editorContent,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(name, dataToStore);
    }

    setIsSourceEnabled(!isSourceEnabled);
  };

  if (!editor) return null;
  editorRef.current = editor;
  return (
    <RichTextEditorProvider
      value={{
        editor,
        labels: mergedLabels,
        isSourceEnabled,
        toggleSourceView,
        codeMirrorRef,
        showMention,
        onChange,
      }}
    >
      <RichTextEditorWrapper ref={wrapperRef} $position={toolbarLocation}>
        {renderEditor()}
      </RichTextEditorWrapper>
    </RichTextEditorProvider>
  );
});

interface RichTextEditorType
  extends React.ForwardRefExoticComponent<
    IRichTextEditorProps & React.RefAttributes<EditorMethods>
  > {
  Content: typeof RichTextEditorContent;
  Control: typeof RichTextEditorControl;
  Toolbar: typeof RichTextEditorToolbar;
  ControlsGroup: typeof RichTextEditorControlsGroup;
  Separator: typeof Separator;
  Bold: typeof controls.BoldControl;
  Italic: typeof controls.ItalicControl;
  Underline: typeof controls.UnderlineControl;
  Strikethrough: typeof controls.StrikeThroughControl;
  H1: typeof controls.H1Control;
  H2: typeof controls.H2Control;
  H3: typeof controls.H3Control;
  BulletList: typeof controls.BulletListControl;
  OrderedList: typeof controls.OrderedListControl;
  Blockquote: typeof controls.BlockquoteControl;
  Link: typeof RichTextEditorLinkControl;
  Unlink: typeof controls.UnlinkControl;
  HorizontalRule: typeof controls.HorizontalRuleControl;
  AlignLeft: typeof controls.AlignLeftControl;
  AlignRight: typeof controls.AlignRightControl;
  AlignCenter: typeof controls.AlignCenterControl;
  AlignJustify: typeof controls.AlignJustifyControl;
  FontSize: typeof RichTextEditorFontControl;
  ImageControl: typeof RichTextEditorImageControl;
  ColorControl: typeof RichTextEditorColorControl;
  HighlightControl: typeof RichTextEditorHighlightControl;
  SourceControl: typeof RichTextEditorSourceControl;
  Placeholder: typeof RichTextEditorPlaceholderControl;
  TableControl: typeof TableControl;
  MoreControl: typeof MoreButtonControl;
  Undo: typeof controls.UndoControl;
  Redo: typeof controls.RedoControl;
}

const RichTextEditorComponent = RichTextEditor as RichTextEditorType;

// Generic components
RichTextEditorComponent.Content = RichTextEditorContent;
RichTextEditorComponent.Control = RichTextEditorControl;
RichTextEditorComponent.Toolbar = RichTextEditorToolbar;
RichTextEditorComponent.ControlsGroup = RichTextEditorControlsGroup;
RichTextEditorComponent.Separator = Separator;

// Controls components
RichTextEditorComponent.Bold = controls.BoldControl;
RichTextEditorComponent.Italic = controls.ItalicControl;
RichTextEditorComponent.Underline = controls.UnderlineControl;
RichTextEditorComponent.Strikethrough = controls.StrikeThroughControl;
RichTextEditorComponent.H1 = controls.H1Control;
RichTextEditorComponent.H2 = controls.H2Control;
RichTextEditorComponent.H3 = controls.H3Control;
RichTextEditorComponent.BulletList = controls.BulletListControl;
RichTextEditorComponent.OrderedList = controls.OrderedListControl;
RichTextEditorComponent.Blockquote = controls.BlockquoteControl;
RichTextEditorComponent.Link = RichTextEditorLinkControl;
RichTextEditorComponent.Unlink = controls.UnlinkControl;
RichTextEditorComponent.HorizontalRule = controls.HorizontalRuleControl;
RichTextEditorComponent.AlignLeft = controls.AlignLeftControl;
RichTextEditorComponent.AlignRight = controls.AlignRightControl;
RichTextEditorComponent.AlignCenter = controls.AlignCenterControl;
RichTextEditorComponent.AlignJustify = controls.AlignJustifyControl;

RichTextEditorComponent.FontSize = RichTextEditorFontControl;

RichTextEditorComponent.ImageControl = RichTextEditorImageControl;

RichTextEditorComponent.ColorControl = RichTextEditorColorControl;
RichTextEditorComponent.HighlightControl = RichTextEditorHighlightControl;

RichTextEditorComponent.SourceControl = RichTextEditorSourceControl;
RichTextEditorComponent.Placeholder = RichTextEditorPlaceholderControl;
RichTextEditorComponent.TableControl = TableControl;

RichTextEditorComponent.MoreControl = MoreButtonControl;

RichTextEditorComponent.Undo = controls.UndoControl;
RichTextEditorComponent.Redo = controls.RedoControl;

export { RichTextEditorComponent as RichTextEditor, RichTextEditorType };

// Custom block SVG icon component
const CustomBlockIcon: React.FC<{ style: React.CSSProperties }> = ({
  style,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    style={style}
  >
    <path d="M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57-1.709 0-2.687-1.08-2.687-2.57V3.136zM12.5 15h-9v-1h9v1z" />
  </svg>
);
