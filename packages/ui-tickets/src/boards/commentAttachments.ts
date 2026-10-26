// 티켓 상세 "위젯 댓글" 입력창의 파일 첨부(사진·문서 등 — 실제로 받는 형식은 업로드 설정이 정한다).
// 파일마다 따로 올려 어느 파일이 끝났는지 알 수 있게 하고, 올리는 중에는 저장을 막는다
// (올라가기 전에 저장하면 파일이 빠진 채 댓글이 남는다).
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { IAttachment } from '@erxes/ui/src/types';
import uploadHandler from '@erxes/ui/src/utils/uploadHandler';
import Alert from '@erxes/ui/src/utils/Alert';
import { __ } from 'coreui/utils';

// 올리기 응답이 이만큼 없으면(연결 끊김 등) 실패로 치고 저장 막기를 푼다.
// uploadHandler는 연결 오류 때 afterUpload를 부르지 않는다.
const UPLOAD_TIMEOUT_MS = 60 * 1000;

export type CommentAttachmentsState = {
  // 올리는 중인 파일 id
  pending: string[];
  attachments: IAttachment[];
};

type Action =
  | { type: 'start'; id: string }
  | { type: 'done'; id: string; attachment?: IAttachment }
  | { type: 'remove'; index: number }
  | { type: 'reset' };

export const initialCommentAttachments: CommentAttachmentsState = {
  pending: [],
  attachments: [],
};

export const commentAttachmentsReducer = (
  state: CommentAttachmentsState,
  action: Action,
): CommentAttachmentsState => {
  switch (action.type) {
    case 'start':
      return { ...state, pending: [...state.pending, action.id] };
    case 'done':
      return {
        pending: state.pending.filter((id) => id !== action.id),
        attachments: action.attachment
          ? [...state.attachments, action.attachment]
          : state.attachments,
      };
    case 'remove':
      return {
        ...state,
        attachments: state.attachments.filter(
          (_, index) => index !== action.index,
        ),
      };
    case 'reset':
      return { ...state, attachments: [] };
    default:
      return state;
  }
};

/** 글이나 사진이 있고, 올리는 중인 사진이 없을 때만 저장 */
export const canSubmitComment = (
  content: string,
  { pending, attachments }: CommentAttachmentsState,
): boolean =>
  pending.length === 0 && (content.trim().length > 0 || attachments.length > 0);

/** 미리보기를 그림으로 그릴지(형식 정보가 없으면 깨진 그림 대신 이름 칸) */
export const isImageAttachment = (attachment: { type?: string }) =>
  (attachment.type || '').startsWith('image/');

/** 서버 AttachmentInput 형식으로(업로드 정보의 duration 등은 뺀다) */
export const toAttachmentInputs = (attachments: IAttachment[]) =>
  attachments
    .filter((attachment) => attachment.url)
    .map(({ url, name, type, size }) => ({ url, name, type, size }));

export const useCommentAttachments = () => {
  const [state, dispatch] = useReducer(
    commentAttachmentsReducer,
    initialCommentAttachments,
  );
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout);
    },
    [],
  );

  const finish = useCallback((id: string, attachment?: IAttachment) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    dispatch({ type: 'done', id, attachment });
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      Array.from(files || []).forEach((file, index) => {
        const id = `${Date.now()}-${index}-${file.name}`;

        uploadHandler({
          files: [file] as unknown as FileList,
          // 크기 초과로 건너뛴 파일은 여기까지 오지 않는다(uploadHandler가 안내)
          beforeUpload: () => {
            dispatch({ type: 'start', id });
            timers.current[id] = setTimeout(() => {
              Alert.error(
                `${file.name} — ${__('Uploading the file is taking too long. Please try again.')}`,
              );
              finish(id);
            }, UPLOAD_TIMEOUT_MS);
          },
          afterUpload: ({ status, response, fileInfo }) => {
            if (status !== 'ok') {
              // 서버가 거절 이유를 보내지만 uploadHandler가 넘겨주지 않아, 가장 흔한 이유(허용하지 않는 형식)로 안내
              Alert.error(
                `${file.name} — ${__('Could not upload the file. Its type may not be allowed in the upload settings.')}`,
              );
              finish(id);
              return;
            }

            finish(id, { url: response, ...fileInfo });
          },
        });
      });
    },
    [finish],
  );

  const remove = useCallback(
    (index: number) => dispatch({ type: 'remove', index }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return {
    state,
    attachments: state.attachments,
    uploading: state.pending.length > 0,
    addFiles,
    remove,
    reset,
  };
};
