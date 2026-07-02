import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from '../nodes/CalloutView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { emoji?: string; bg?: string; border?: string }) => ReturnType;
      toggleCallout: (attrs?: { emoji?: string; bg?: string; border?: string }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      emoji: { default: '💡' },
      bg: { default: '#F1F1EF' },
      border: { default: '#9B9A97' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': 'true',
        style: [
          `background:${HTMLAttributes.bg || '#F1F1EF'}`,
          `border-left:4px solid ${HTMLAttributes.border || '#9B9A97'}`,
          `border-radius:6px`,
          `padding:14px 16px`,
          `margin:8px 0`,
          `display:flex`,
          `gap:10px`,
          `align-items:flex-start`,
        ].join(';'),
      }),
      [
        'span',
        {
          contenteditable: 'false',
          style: 'font-size:20px;flex-shrink:0;line-height:1.4;',
        },
        HTMLAttributes.emoji || '💡',
      ],
      ['div', { style: 'flex:1;min-width:0;' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs = {}) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
    };
  },
});
