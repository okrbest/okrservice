import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy, { GetReferenceClientRect } from 'tippy.js';
import {
  SlashCommandList,
  SlashCommandItem,
} from '../nodes/SlashCommandList';
import { CalloutPicker } from '../nodes/CalloutPicker';

function showCalloutPicker(editor: any, range: any) {
  let pickerRenderer: ReactRenderer<any>;
  let pickerPopup: any;

  const destroy = () => {
    setTimeout(() => {
      pickerPopup?.[0]?.destroy();
      pickerRenderer?.destroy();
    });
  };

  const coords = editor.view.coordsAtPos(range.from);
  const getReferenceClientRect = () => ({
    width: 0,
    height: 0,
    top: coords.top,
    bottom: coords.bottom,
    left: coords.left,
    right: coords.left,
  } as DOMRect);

  pickerRenderer = new ReactRenderer(CalloutPicker, {
    props: {
      onInsert: (attrs: { emoji: string; bg: string; border: string }) => {
        editor.chain().focus().deleteRange(range).setCallout(attrs).run();
        destroy();
      },
      onCancel: () => {
        editor.chain().focus().deleteRange(range).run();
        destroy();
      },
    },
    editor,
  });

  pickerPopup = tippy('body', {
    getReferenceClientRect,
    appendTo: () => document.body,
    content: pickerRenderer.element,
    showOnCreate: true,
    interactive: true,
    trigger: 'manual',
    placement: 'bottom-start',
  });
}

const SlashCommandPluginKey = new PluginKey('slashCommand');

const COMMANDS: SlashCommandItem[] = [
  {
    title: '제목 1',
    description: '큰 섹션 제목',
    icon: 'H₁',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: '제목 2',
    description: '중간 섹션 제목',
    icon: 'H₂',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: '제목 3',
    description: '작은 섹션 제목',
    icon: 'H₃',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: '글머리 목록',
    description: '순서 없는 목록',
    icon: '•',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: '번호 목록',
    description: '순서 있는 번호 목록',
    icon: '1.',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: '인용',
    description: '인용문 블럭',
    icon: '❝',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: '코드 블럭',
    description: '코드 작성 블럭',
    icon: '</>',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: '구분선',
    description: '가로 구분선 삽입',
    icon: '—',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: '콜아웃',
    description: '이모지와 색상을 직접 지정하는 강조 박스',
    icon: '💡',
    command: ({ editor, range }) =>
      showCalloutPicker(editor, range),
  },
];

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        pluginKey: SlashCommandPluginKey,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) =>
          COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 12),
        render: () => {
          let component: ReactRenderer<any>;
          let popup: InstanceType<any> | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy('body', {
                getReferenceClientRect:
                  props.clientRect as GetReferenceClientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                maxWidth: '320px',
              });
            },

            onUpdate(props) {
              component.updateProps(props);
              if (!props.clientRect) return;
              popup?.[0]?.setProps({
                getReferenceClientRect:
                  props.clientRect as GetReferenceClientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              return component.ref?.onKeyDown(props);
            },

            onExit() {
              setTimeout(() => {
                popup?.[0]?.destroy();
                component.destroy();
              });
            },
          };
        },
      }),
    ];
  },
});
