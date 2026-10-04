import {
  Content,
  ContentWrapper,
  LeftContainer,
  TitleRow,
} from '../../styles/item';
import {
  EditorActions,
  EditorWrapper,
} from '@erxes/ui-internalnotes/src/components/Form';
import { IItem, IItemParams, IOptions } from '../../types';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react';
import { __, readFile } from 'coreui/utils';
import { extractAttachment } from '@erxes/ui/src/utils';
import {
  descriptionFingerprint,
  hasPendingDescriptionDraft,
  parseDescriptionDraft,
  readDescriptionDraftFromStorage,
} from '@erxes/ui/src/utils/descriptionDraft';
import styled from 'styled-components';
import { useIsMobile } from '../../utils/mobile';

import Actions from './Actions';
import DescriptionHistoryButton, {
  useDescriptionHistory,
} from './DescriptionHistory';
import {
  DescriptionHistoryMeta,
  HISTORY_AUTO_INTERVAL_MS,
} from '../../descriptionHistory';
import { readDescriptionHistoryContent } from '../../descriptionHistoryStore';
import ActivityInputs from '@erxes/ui-log/src/activityLogs/components/ActivityInputs';
import ActivityLogs from '@erxes/ui-log/src/activityLogs/containers/ActivityLogs';
import Button from '@erxes/ui/src/components/Button';
import { RichTextEditor } from '@erxes/ui/src/components/richTextEditor/TEditor';
import Checklists from '../../../checklists/containers/Checklists';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import FormGroup from '@erxes/ui/src/components/form/Group';
import FormControl from '@erxes/ui/src/components/form/Control';
import { IAttachment } from '@erxes/ui/src/types';
import Icon from '@erxes/ui/src/components/Icon';
import Labels from '../label/Labels';
import { MobileCard } from './MobileLayout';
import Uploader from '@erxes/ui/src/components/Uploader';
import { isEnabled } from '@erxes/ui/src/utils/core';

// 모바일용 스타일드 컴포넌트들
// 편집창을 열기 전에도 임시 저장된 글이 있음을 알린다(열어야만 보여서 사라진 줄 아는 일을 막음)
const DraftNotice = styled.div`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 3px;
  background: #fff8e6;
  color: #8a5a00;
  font-size: 12px;
  cursor: pointer;

  i {
    margin-right: 6px;
  }

  &:hover {
    background: #ffefc7;
  }
`;

const MobileContent = styled(Content)<{ isMobile: boolean }>`
  ${(props) =>
    props.isMobile &&
    `
    @media (max-width: 768px) {
      width: 100%;
      max-width: 100%;
      margin: 0;
      box-sizing: border-box;
      font-size: 15px;
      line-height: 1.6;
    }
  `}
`;

const MobileCommentContainer = styled.div<{
  isMobile: boolean;
  isTeam?: boolean;
  $isEditing?: boolean;
}>`
  margin-bottom: 15px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  ${(props) =>
    props.$isEditing &&
    `
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  `}

  ${(props) =>
    props.isMobile &&
    !props.$isEditing &&
    `
    margin-bottom: 12px;
    gap: 4px;
    max-width: 82%;
    margin-left: ${props.isTeam ? 'auto' : '0'};
    margin-right: ${props.isTeam ? '0' : 'auto'};
    flex-direction: column;
    align-items: ${props.isTeam ? 'flex-end' : 'flex-start'};
  `}

  ${(props) =>
    props.isMobile &&
    props.$isEditing &&
    `
    padding: 8px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `}
`;

const CommentBodyColumn = styled.div<{ $teamIndent?: boolean }>`
  flex: 1;
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;

  ${(props) =>
    props.$teamIndent &&
    `
    padding-left: 25px;
  `}
`;

const MobileCommentBubble = styled.div<{ isTeam: boolean; isMobile: boolean }>`
  position: relative;
  background-color: ${(props) => (props.isTeam ? '#f0ecf9' : '#ffffff')};
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 100%;
  min-width: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border: ${(props) =>
    props.isTeam ? '1px solid #f0ecf9' : '1px solid #e1e5e9'};
  font-size: 12px;
  line-height: 1.4;
  box-sizing: border-box;

  ${(props) =>
    props.isMobile &&
    `
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
    border-radius: ${
      props.isTeam ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
    };
  `}
`;

const CommentInputArea = styled.div`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin-top: 15px;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    margin-top: 20px;
  }
`;

const CommentTextarea = styled.textarea`
  display: block;
  width: 100%;
  min-width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  background: #fff;

  @media (max-width: 768px) {
    min-height: 100px;
    font-size: 15px;
    padding: 16px;
  }

  &:focus {
    outline: none;
    border-color: #6569df;
  }
`;

const CommentActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 10px;
`;

const MobileUserName = styled.div<{
  isMobile: boolean;
  isTeam?: boolean;
  $isEditing?: boolean;
}>`
  flex-shrink: 0;
  min-width: 80px;
  max-width: 120px;
  text-align: right;
  font-weight: bold;
  font-size: 12px;
  color: #333;
  padding-top: 5px;

  ${(props) =>
    props.$isEditing &&
    `
    min-width: 0;
    max-width: none;
    width: 100%;
    text-align: left;
    padding-top: 0;
    font-size: 13px;
  `}

  ${(props) =>
    props.isMobile &&
    !props.$isEditing &&
    `
    min-width: 0;
    max-width: 100%;
    width: auto;
    text-align: ${props.isTeam ? 'right' : 'left'};
    font-size: 11px;
    font-weight: 500;
    color: #8a8a8a;
    padding: 0 4px;
  `}

  ${(props) =>
    props.isMobile &&
    props.$isEditing &&
    `
    width: 100%;
    text-align: left;
    font-size: 13px;
    color: #333;
  `}
`;

const MobileCommentList = styled(Content)<{ isMobile: boolean }>`
  padding: 12px;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  ${(props) =>
    props.isMobile &&
    `
    padding: 8px;
    min-height: 400px;
    max-height: 500px;
    background-color: #fafafa;
    border-radius: 8px;
    border: 1px solid #e1e5e9;
    overflow-x: hidden;
    overflow-y: auto;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
  `}
`;

const MobileFormControl = styled(FormControl)`
  width: 100% !important;
  min-height: 100px !important;
  box-sizing: border-box !important;
  resize: vertical !important;
  border: 2px solid #e1e5e9 !important;
  border-radius: 8px !important;
  padding: 12px 16px !important;
  font-size: 14px !important;

  @media (max-width: 768px) {
    font-size: 15px !important;
    padding: 16px !important;
  }
`;

type DescProps = {
  item: IItem;
  saveItem: (
    doc: { [key: string]: any },
    callback?: (item) => void,
    onError?: () => void,
  ) => void;
  contentType: string;
  isMobile: boolean;
  onChangeRefresh?: () => void;
  hasDescriptionConflict?: boolean;
  descriptionDirtyRef?: React.MutableRefObject<(() => boolean) | null>;
  // 충돌 안내에서 "불러오기"를 고를 때마다 올라간다 — 쓰던 글을 버리고 서버 내용으로
  descriptionReloadKey?: number;
};

// WidgetComments 컴포넌트 수정
type WidgetCommentsProps = {
  widgetComments?: any[];
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  currentUser?: any; // 현재 사용자 정보
  item?: any; // 티켓 정보 (assigned to 확인용)
};

const WidgetComments = (props: WidgetCommentsProps) => {
  const {
    widgetComments = [],
    onAddComment,
    onDeleteComment,
    onEditComment,
    currentUser,
    item,
  } = props;
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const isMobile = useIsMobile();

  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setContent(target.value);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !onAddComment) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddComment(content);
      setContent('');
    } catch (error: unknown) {
      console.error('Failed to submit comment:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
      alert(`댓글 저장 실패: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) {
      alert('댓글 삭제 기능이 설정되지 않았습니다.');
      return;
    }

    if (window.confirm(__('Are you sure you want to delete this comment?'))) {
      setDeletingCommentId(commentId);
      try {
        await onDeleteComment(commentId);
      } catch (error: unknown) {
        console.error('🗑️ Failed to delete comment:', error);
        alert(__('Failed to delete comment'));
      } finally {
        setDeletingCommentId(null);
      }
    } else {
    }
  };

  // 댓글 수정 권한 확인
  const canEditComment = (comment: any) => {
    if (!currentUser || !comment.createdUser) {
      return false;
    }

    // 고객 댓글이 아닌 경우에만 수정 가능 (담당자, 일반 직원 등)
    const isCustomerComment = comment.userType === 'client';

    // 담당자 여부 확인 (assigned to 포함)
    const isCurrentUserTeam =
      currentUser.userType === 'team' ||
      currentUser.isOwner === true ||
      currentUser.isAdmin === true ||
      currentUser.role === 'admin' ||
      currentUser.role === 'manager' ||
      currentUser.role === 'team' ||
      // assigned to로 지정된 사용자인지 확인
      (item &&
        item.assignedUserIds &&
        item.assignedUserIds.includes(currentUser._id)) ||
      // assignedUsers 배열에서도 확인
      (item &&
        item.assignedUsers &&
        item.assignedUsers.some((user) => user._id === currentUser._id));

    // 댓글 작성자 본인인지 확인
    const isCommentAuthor = currentUser._id === comment.createdUser._id;

    if (isCustomerComment) {
      return false;
    }

    // 담당자이거나 댓글 작성자 본인인 경우 수정 가능
    const canEdit = isCurrentUserTeam || isCommentAuthor;

    if (!canEdit) {
      return false;
    }

    return canEdit;
  };

  // 수정 모드 시작
  const startEditing = (comment: any) => {
    setEditingCommentId(comment._id);
    setEditingContent(comment.content ?? '');
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // 수정 저장
  const saveEditing = async () => {
    if (!onEditComment || !editingCommentId || !(editingContent ?? '').trim())
      return;

    try {
      await onEditComment(editingCommentId, editingContent);
      setEditingCommentId(null);
      setEditingContent('');
    } catch (error: unknown) {
      console.error('Failed to edit comment:', error);
    }
  };

  return (
    <FormGroup>
      <TitleRow>
        <ControlLabel>
          <Icon icon="comment-1" />
          {__('Widget Comments')}
        </ControlLabel>
      </TitleRow>

      {/* 댓글 목록 */}
      {!widgetComments.length ? (
        <Content>{__('No widget comments yet')}</Content>
      ) : (
        <MobileCommentList isMobile={isMobile}>
          {widgetComments.map((comment) => {
            // 담당자(팀)인지 고객인지 구분
            const isTeam = comment.userType === 'team';

            return (
              <MobileCommentContainer
                key={comment._id}
                isMobile={isMobile}
                isTeam={isTeam}
                $isEditing={editingCommentId === comment._id}
              >
                {/* 사용자 이름 */}
                <MobileUserName
                  isMobile={isMobile}
                  isTeam={isTeam}
                  $isEditing={editingCommentId === comment._id}
                >
                  {comment.createdUser
                    ? comment.createdUser.firstName &&
                      comment.createdUser.lastName
                      ? `${comment.createdUser.firstName} ${comment.createdUser.lastName}`
                      : comment.createdUser.firstName ||
                        comment.createdUser.lastName ||
                        ' '
                    : ' '}
                </MobileUserName>

                {editingCommentId === comment._id ? (
                  <CommentInputArea style={{ marginTop: 0 }}>
                    <CommentTextarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      autoFocus
                    />
                    <CommentActionRow>
                      <Button
                        btnStyle="simple"
                        size="small"
                        onClick={cancelEditing}
                      >
                        취소
                      </Button>
                      <Button
                        btnStyle="success"
                        size="small"
                        onClick={saveEditing}
                        disabled={!(editingContent ?? '').trim()}
                      >
                        저장
                      </Button>
                    </CommentActionRow>
                  </CommentInputArea>
                ) : (
                  <CommentBodyColumn $teamIndent={isTeam && !isMobile}>
                    {/* 말풍선 형태의 댓글 내용 */}
                    <MobileCommentBubble isTeam={isTeam} isMobile={isMobile}>
                      {/* 일반 모드 */}
                      <div>
                        {comment.content && comment.content.trim() ? (
                          <div
                            style={{
                              maxWidth: '100%',
                              overflowWrap: 'break-word',
                              wordBreak: 'break-word',
                            }}
                            dangerouslySetInnerHTML={{
                              __html: comment.content,
                            }}
                          />
                        ) : null}
                        {/* 첨부파일 */}
                        {comment.attachments &&
                        comment.attachments.length > 0 ? (
                          <div style={{ marginTop: 8 }}>
                            {comment.attachments.map(
                              (
                                att: {
                                  name?: string;
                                  url?: string;
                                  type?: string;
                                },
                                idx: number,
                              ) => {
                                const url = att.url ? readFile(att.url) : '';
                                const isImage =
                                  att.type && att.type.startsWith('image/');
                                const inlineUrl = url
                                  ? url.indexOf('?') >= 0
                                    ? url + '&inline=true'
                                    : url + '?inline=true'
                                  : '';
                                return (
                                  <div
                                    key={`${comment._id}-att-${idx}`}
                                    style={{ marginBottom: 4 }}
                                  >
                                    {isImage ? (
                                      <>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <img
                                            src={url}
                                            alt={att.name || ''}
                                            style={{
                                              maxWidth: 200,
                                              maxHeight: 200,
                                              objectFit: 'contain',
                                            }}
                                          />
                                        </a>
                                        <div
                                          style={{ marginTop: 4, fontSize: 12 }}
                                        >
                                          <a
                                            href={inlineUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#6569df' }}
                                          >
                                            {__(
                                              'Open in new window to view at full size',
                                            )}
                                          </a>
                                        </div>
                                      </>
                                    ) : (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {att.name || __('Attachment')}
                                      </a>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        ) : null}
                        {/* 시간 표시 */}
                        <div
                          style={{
                            fontSize: '11px',
                            color: isTeam ? '#333' : '#666',
                            marginTop: '8px',
                            textAlign: 'right',
                          }}
                        >
                          {(() => {
                            const isModified =
                              comment.updatedAt &&
                              comment.updatedAt !== comment.createdAt;

                            return isModified ? (
                              <span>
                                {new Date(comment.updatedAt).toLocaleString()}
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: '#999',
                                    marginLeft: '5px',
                                  }}
                                >
                                  (수정됨)
                                </span>
                              </span>
                            ) : (
                              new Date(comment.createdAt).toLocaleString()
                            );
                          })()}
                        </div>
                      </div>
                    </MobileCommentBubble>

                    {/* 수정/삭제 버튼 - 말풍선 아래에 배치 */}
                    {isTeam && (
                      <CommentActionRow>
                        {/* 수정 버튼 */}
                        {(() => {
                          const canEdit = canEditComment(comment);

                          if (canEdit === true) {
                            return (
                              <Button
                                btnStyle="primary"
                                size="small"
                                icon="edit-3"
                                onClick={() => startEditing(comment)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  minWidth: 'auto',
                                  height: '22px',
                                  backgroundColor: '#007bff',
                                  borderColor: '#007bff',
                                  color: 'white',
                                }}
                              ></Button>
                            );
                          } else {
                            return null;
                          }
                        })()}

                        {/* 삭제 버튼 */}
                        <Button
                          btnStyle="danger"
                          size="small"
                          icon="trash-alt"
                          onClick={() => handleDeleteComment(comment._id)}
                          disabled={deletingCommentId === comment._id}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            height: '22px',
                            backgroundColor: '#dc3545',
                            borderColor: '#dc3545',
                            color: 'white',
                          }}
                        ></Button>
                      </CommentActionRow>
                    )}
                  </CommentBodyColumn>
                )}
              </MobileCommentContainer>
            );
          })}
        </MobileCommentList>
      )}

      {/* 댓글 입력 폼 */}
      <CommentInputArea>
        <MobileFormControl
          componentclass="textarea"
          value={content}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={__('Write a comment...')}
        />
        <div style={{ marginTop: isMobile ? '12px' : '10px' }}>
          {content.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <Button
                btnStyle="success"
                size="small"
                icon="message"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={
                  isMobile
                    ? {
                        padding: '8px 16px',
                        fontSize: '14px',
                        minHeight: '36px',
                      }
                    : {}
                }
              >
                {isSubmitting ? __('Saving...') : __('Save')}
              </Button>
            </div>
          )}
        </div>
      </CommentInputArea>
    </FormGroup>
  );
};

// 저장 응답을 이만큼 기다려도 없으면 "늦어지고 있어요" 안내를 띄운다
const SLOW_SAVE_MS = 10000;

const Description = React.memo((props: DescProps) => {
  const {
    item,
    saveItem,
    contentType,
    isMobile,
    onChangeRefresh,
    hasDescriptionConflict,
    descriptionDirtyRef,
    descriptionReloadKey,
  } = props;
  const [edit, setEdit] = useState(false);
  const [isSubmitted, setSubmit] = useState(false);
  // 저장 요청이 끝날 때까지 편집기와 임시 저장을 그대로 둔다(실패·충돌 시 쓰던 글 보호)
  const [isSaving, setSaving] = useState(false);
  // 저장 응답이 오래 안 오면 안내를 띄우고 다시 저장할 수 있게 한다
  const [isSaveSlow, setSaveSlow] = useState(false);
  const [description, setDescription] = useState(item.description);
  // 편집을 시작할 때의 서버 설명 — 저장 시 "그 사이 설명이 바뀌었는지" 판단 기준
  const [baseline, setBaseline] = useState(item.description ?? '');
  const descriptionRef = useRef(item.description);
  const savedDescriptionRef = useRef<string | null>(null);
  // 저장 요청 번호 — 응답이 늦어 다시 저장한 경우, 앞선 요청의 늦은 응답은 무시한다
  const saveRequestSeqRef = useRef(0);
  const editorRef = useRef<any>(null);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  // 임시저장함: 저장·취소를 누를 때와 쓰는 동안 1분마다, 그리고 직접 저장할 때 남긴다(브라우저에만 보관)
  const { entries: historyEntries, record: recordHistory } =
    useDescriptionHistory(`${contentType}_description_${item._id}`, edit);

  // 보낸 글이 서버에 반영됨. 보낸 뒤 더 고친 글이 있으면 닫지 않고 기준만 새로 잡는다.
  const finishSave = useCallback((savedDescription?: string) => {
    savedDescriptionRef.current = null;
    setSaving(false);
    setSaveSlow(false);

    if ((descriptionRef.current ?? '') !== (savedDescription ?? '')) {
      setBaseline(savedDescription ?? '');
      return;
    }

    setSubmit(true);
  }, []);

  const isDescriptionDirty = useCallback(() => {
    const server = item.description ?? '';
    const local = descriptionRef.current ?? '';
    return local !== server;
  }, [item.description]);

  useEffect(() => {
    if (!edit) {
      return;
    }

    const timer = setInterval(() => {
      if (isDescriptionDirty()) {
        recordHistory(descriptionRef.current, 'auto');
      }
    }, HISTORY_AUTO_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [edit, isDescriptionDirty, recordHistory]);

  // 편집창이 닫혀 있을 때, 열면 채워질 임시 저장 글이 있는지 본다
  useEffect(() => {
    if (edit) {
      return;
    }

    try {
      setHasPendingDraft(
        hasPendingDescriptionDraft(
          localStorage.getItem(`${contentType}_description_${item._id}`),
          item.description,
        ),
      );
    } catch (e) {
      setHasPendingDraft(false);
    }
  }, [edit, contentType, item._id, item.description]);

  // 고른 기록을 편집창에 넣는다. 지금 쓰던 글은 먼저 기록으로 남겨 되돌릴 수 있게 한다.
  const onRestoreHistory = useCallback(
    async (entry: DescriptionHistoryMeta) => {
      const content = await readDescriptionHistoryContent(entry.id);
      // 본문을 읽는 사이 편집창이 닫혔을 수 있다 — 지금의 편집기를 다시 얻는다
      const editor = editorRef.current?.getEditor();

      if (content == null || !editor || editor.isDestroyed) {
        return;
      }

      // 바꾸기 직전의 글을 남긴다(글은 호출 순간에 확정되므로 기다리지 않는다)
      if (isDescriptionDirty()) {
        recordHistory(descriptionRef.current, 'restore');
      }

      editor.commands.setContent(content, true, { preserveWhitespace: true });
    },
    [isDescriptionDirty, recordHistory],
  );

  useEffect(() => {
    if (!descriptionDirtyRef) {
      return;
    }

    descriptionDirtyRef.current = isDescriptionDirty;

    return () => {
      descriptionDirtyRef.current = null;
    };
  }, [descriptionDirtyRef, isDescriptionDirty]);

  useEffect(() => {
    // 날짜 등 다른 필드 저장으로 modifiedAt만 바뀐 경우, 미저장 draft는 유지
    if (isDescriptionDirty()) {
      return;
    }
    setDescription(item.description);
    descriptionRef.current = item.description;
  }, [item.description, item.modifiedAt, isDescriptionDirty]);

  useEffect(() => {
    if (
      savedDescriptionRef.current != null &&
      item.description === savedDescriptionRef.current
    ) {
      finishSave(savedDescriptionRef.current);
    }
  }, [item.description, finishSave]);

  // 저장 응답이 SLOW_SAVE_MS 넘게 없으면: 쓰던 글은 그대로 두고 안내 + 다시 저장 가능 + 기록
  useEffect(() => {
    if (!isSaving) {
      return;
    }

    const timer = setTimeout(() => {
      setSaveSlow(true);
      setSaving(false);
      Sentry.captureMessage('티켓 설명 저장 응답이 늦음', {
        level: 'warning',
        tags: { ticket_description_save: 'slow' },
        extra: { itemId: item._id, waitedMs: SLOW_SAVE_MS },
      });
    }, SLOW_SAVE_MS);

    return () => clearTimeout(timer);
  }, [isSaving, item._id]);

  // 충돌 안내에서 "불러오기": 쓰던 글을 버리고 새로 불러온 서버 내용으로 돌아간다
  const reloadKeyRef = useRef(descriptionReloadKey);
  useEffect(() => {
    if (reloadKeyRef.current === descriptionReloadKey) {
      return;
    }
    reloadKeyRef.current = descriptionReloadKey;
    // 쓰던 글을 버리기 전에 기록으로 남긴다
    if (isDescriptionDirty()) {
      recordHistory(descriptionRef.current, 'restore');
    }
    savedDescriptionRef.current = null;
    descriptionRef.current = item.description;
    setDescription(item.description);
    setBaseline(item.description ?? '');
    setSaving(false);
    setSaveSlow(false);
    setSubmit(false);
    setEdit(false);
  }, [
    descriptionReloadKey,
    item.description,
    isDescriptionDirty,
    recordHistory,
  ]);

  useEffect(() => {
    if (isSubmitted) {
      setEdit(false);
    }
  }, [isSubmitted]);

  useEffect(() => {
    if (hasDescriptionConflict) {
      setEdit(true);
      setSubmit(false);
    }
  }, [hasDescriptionConflict]);

  const onSend = useCallback(() => {
    if (isSaving) {
      return;
    }

    const latestDescription = descriptionRef.current;
    const requestSeq = ++saveRequestSeqRef.current;
    recordHistory(latestDescription, 'save');
    savedDescriptionRef.current = latestDescription;
    setSaveSlow(false);
    setSaving(true);
    saveItem(
      {
        description: latestDescription,
        expectedModifiedAt: item.modifiedAt,
        expectedDescriptionHash: descriptionFingerprint(baseline),
      },
      () => {
        if (requestSeq !== saveRequestSeqRef.current) {
          return;
        }
        // 저장이 실제로 끝난 뒤에만 편집기를 닫고 임시 저장을 지운다
        finishSave(latestDescription);
        if (onChangeRefresh) {
          onChangeRefresh();
        }
      },
      () => {
        if (requestSeq !== saveRequestSeqRef.current) {
          return;
        }
        // 실패·충돌: 편집기와 쓰던 글, 임시 저장을 그대로 둔다
        savedDescriptionRef.current = null;
        setSaving(false);
        setSaveSlow(false);
        Sentry.addBreadcrumb({
          category: 'ticket',
          message: 'ticket description save failed',
          level: 'warning',
          data: { itemId: item._id },
        });
      },
    );
  }, [
    saveItem,
    onChangeRefresh,
    item.modifiedAt,
    baseline,
    isSaving,
    finishSave,
    recordHistory,
  ]);

  const toggleEdit = () => {
    // 편집 중 취소: 버리는 글을 먼저 기록으로 남긴다
    if (edit && isDescriptionDirty()) {
      recordHistory(descriptionRef.current, 'cancel');
    }

    setEdit((currentValue) => {
      const newValue = !currentValue;

      // 편집 모드로 진입할 때
      if (!currentValue && newValue) {
        if (typeof window !== 'undefined') {
          const localStorageKey = `${contentType}_description_${item._id}`;
          // 복원하는 임시 저장이 있으면, 그 글을 쓰기 시작했을 때의 서버 내용을 기준으로 삼는다
          const stored = localStorage.getItem(localStorageKey);
          const storedBaseline = stored
            ? parseDescriptionDraft(stored)?.serverDescription
            : undefined;
          const { content: resolvedContent, discardStorage } =
            readDescriptionDraftFromStorage(localStorageKey, item.description, {
              // 서버 설명이 바뀌었어도 쓰던 글은 살린다 — 겹치면 저장할 때 충돌 안내가 뜬다
              keepWhenServerChanged: true,
            });

          setDescription(resolvedContent);
          descriptionRef.current = resolvedContent;
          setBaseline(
            !discardStorage && storedBaseline !== undefined
              ? storedBaseline
              : item.description ?? '',
          );
        } else {
          setDescription(item.description);
          descriptionRef.current = item.description;
          setBaseline(item.description ?? '');
        }
      }

      // 편집 모드를 끌 때 (Cancel 시) localStorage 클리어 및 원본으로 되돌리기
      if (currentValue && !newValue) {
        if (typeof window !== 'undefined') {
          const localStorageKey = `${contentType}_description_${item._id}`;
          localStorage.removeItem(localStorageKey);
        }
        setDescription(item.description);
        descriptionRef.current = item.description;
      }

      return newValue;
    });
    setSubmit(false);
    setSaveSlow(false);
  };

  const onChangeDescription = useCallback((content: string) => {
    descriptionRef.current = content;
    setDescription(content);
  }, []);

  const renderFooter = () => {
    return (
      <EditorActions>
        {isSaveSlow && (
          <span
            role="status"
            style={{ marginRight: 'auto', fontSize: 12, color: '#b7791f' }}
          >
            {__(
              'Saving is taking longer than usual. Your text is kept here — please try saving again.',
            )}
          </span>
        )}
        {!isSaving && (
          <DescriptionHistoryButton
            entries={historyEntries}
            onSelect={onRestoreHistory}
            onSaveNow={() => recordHistory(descriptionRef.current, 'manual')}
          />
        )}
        <Button
          icon="times-circle"
          btnStyle="simple"
          size="small"
          onClick={toggleEdit}
          disabled={isSaving}
        >
          Cancel
        </Button>
        {(item.description ?? '') !== (description ?? '') && (
          <Button
            onClick={onSend}
            btnStyle="success"
            size="small"
            icon="check-circle"
            disabled={isSaving}
          >
            {isSaving ? __('Saving...') : __('Save')}
          </Button>
        )}
      </EditorActions>
    );
  };

  return (
    <FormGroup>
      <ContentWrapper $isEditing={edit}>
        <TitleRow>
          <ControlLabel>
            <Icon icon="align-left-justify" />
            {__('CustomerDescription')}
          </ControlLabel>
        </TitleRow>

        {!edit && hasPendingDraft && (
          <DraftNotice role="button" onClick={toggleEdit}>
            <Icon icon="edit-alt" />
            {__('You have an unsaved draft. Click to continue writing.')}
          </DraftNotice>
        )}
        {!edit ? (
          <MobileContent
            isMobile={isMobile}
            onClick={toggleEdit}
            dangerouslySetInnerHTML={{
              __html: item.description
                ? item.description
                    .replace(/<p><\/p>/g, "<div style='height:16px;'></div>")
                    .replace(
                      /<p><br><\/p>/g,
                      "<div style='height:16px;'></div>",
                    )
                    .replace(
                      /<p><br \/><\/p>/g,
                      "<div style='height:16px;'></div>",
                    )
                : `${__('Add a more detailed description')}...`,
            }}
          />
        ) : (
          <EditorWrapper>
            <RichTextEditor
              ref={editorRef}
              key={`${contentType}_description_${item._id}`}
              content={description}
              onChange={onChangeDescription}
              height={'max-content'}
              isSubmitted={isSubmitted}
              autoFocus={true}
              name={`${contentType}_description_${item._id}`}
              descriptionBaseline={baseline}
              toolbar={[
                'undo',
                'redo',
                '|',
                'bold',
                'italic',
                'orderedList',
                'bulletList',
                'link',
                'unlink',
                '|',
                'image',
              ]}
              onCtrlEnter={onSend}
            />

            {renderFooter()}
          </EditorWrapper>
        )}
      </ContentWrapper>
    </FormGroup>
  );
});
Description.displayName = 'Description';

type Props = {
  item: IItem;
  options: IOptions;
  copyItem: () => void;
  removeItem: (itemId: string) => void;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  onUpdate: (item: IItem, prevStageId?: string) => void;
  addItem: (doc: IItemParams, callback: () => void) => void;
  sendToBoard?: (item: any) => void;
  onChangeStage?: (stageId: string) => void;
  onChangeRefresh: () => void;
  onSendEmail?: () => void;
  widgetComments?: any[];
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  currentUser?: any;
  descriptionConflictPending?: {
    doc: any;
    callback: (item: any) => void;
  } | null;
  descriptionDirtyRef?: React.MutableRefObject<(() => boolean) | null>;
  descriptionReloadKey?: number;
};

const buildActivityBlocks = (item: IItem, options: IOptions) => ({
  activityInputs: (
    <ActivityInputs
      contentTypeId={item._id}
      contentType={`tickets:${options.type}`}
      showEmail={false}
    />
  ),
  activityLogs: (
    <ActivityLogs
      target={item.name}
      contentId={item._id}
      contentType={`tickets:${options.type}`}
      extraTabs={
        options.type === 'tickets:task' && isEnabled('tasks')
          ? []
          : [{ name: 'tickets:task', label: 'Ticket' }]
      }
    />
  ),
});

// 모바일에서 담당자 선택 영역보다 아래(맨 밑)에 배치하기 위해
// Left 본문과 분리해서 렌더링할 수 있도록 내보낸다.
export const MobileNoteActivity = ({
  item,
  options,
}: {
  item: IItem;
  options: IOptions;
}) => {
  const { activityInputs, activityLogs } = buildActivityBlocks(item, options);

  return (
    <>
      <MobileCard>{activityInputs}</MobileCard>
      <MobileCard>{activityLogs}</MobileCard>
    </>
  );
};

const Left = (props: Props) => {
  const {
    item,
    saveItem,
    options,
    copyItem,
    removeItem,
    onUpdate,
    addItem,
    sendToBoard,
    onChangeStage,
    onChangeRefresh,
    widgetComments,
    onAddComment,
    descriptionConflictPending,
    descriptionDirtyRef,
  } = props;

  const isMobile = useIsMobile();

  const onChangeAttachment = (files: IAttachment[]) => {
    saveItem({ attachments: files });
  };

  const attachments =
    (item.attachments && extractAttachment(item.attachments)) || [];

  const { activityInputs, activityLogs } = buildActivityBlocks(item, options);

  return (
    <LeftContainer>
      {!isMobile && (
        <Actions
          item={item}
          options={options}
          copyItem={copyItem}
          removeItem={removeItem}
          saveItem={saveItem}
          onUpdate={onUpdate}
          sendToBoard={sendToBoard}
          onChangeStage={onChangeStage}
          onChangeRefresh={onChangeRefresh}
          onSendEmail={props.onSendEmail}
        />
      )}

      {!isMobile && item.labels.length > 0 && (
        <FormGroup>
          <TitleRow>
            <ControlLabel>
              <Icon icon="label-alt" />
              {__('Labels')}
            </ControlLabel>
          </TitleRow>

          <Labels labels={item.labels} />
        </FormGroup>
      )}

      <FormGroup>
        <TitleRow>
          <ControlLabel>
            <Icon icon="paperclip" />
            {__('Attachments')}
          </ControlLabel>
        </TitleRow>

        <Uploader defaultFileList={attachments} onChange={onChangeAttachment} />
      </FormGroup>

      <Description
        item={item}
        saveItem={saveItem}
        contentType={options.type}
        isMobile={isMobile}
        onChangeRefresh={onChangeRefresh}
        hasDescriptionConflict={!!descriptionConflictPending}
        descriptionDirtyRef={descriptionDirtyRef}
        descriptionReloadKey={props.descriptionReloadKey}
      />

      <WidgetComments
        widgetComments={widgetComments}
        onAddComment={onAddComment}
        onDeleteComment={props.onDeleteComment}
        onEditComment={props.onEditComment}
        currentUser={props.currentUser}
        item={item}
      />

      {!isMobile && (
        <Checklists
          contentType={options.type}
          contentTypeId={item._id}
          stageId={item.stageId}
          addItem={addItem}
        />
      )}

      {!isMobile && activityInputs}
      {!isMobile && activityLogs}
    </LeftContainer>
  );
};

export default Left;
