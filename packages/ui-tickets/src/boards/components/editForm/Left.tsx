import {
  Content,
  ContentWrapper,
  LeftContainer,
  TitleRow,
} from "../../styles/item";
import {
  EditorActions,
  EditorWrapper,
} from "@erxes/ui-internalnotes/src/components/Form";
import { IItem, IItemParams, IOptions } from "../../types";
import React, { useEffect, useState } from "react";
import { __ } from "coreui/utils";
import { extractAttachment } from "@erxes/ui/src/utils";
import styled from "styled-components";
import { useIsMobile } from "../../utils/mobile";

import Actions from "./Actions";
import ActivityInputs from "@erxes/ui-log/src/activityLogs/components/ActivityInputs";
import ActivityLogs from "@erxes/ui-log/src/activityLogs/containers/ActivityLogs";
import Button from "@erxes/ui/src/components/Button";
import { RichTextEditor } from "@erxes/ui/src/components/richTextEditor/TEditor";
import Checklists from "../../../checklists/containers/Checklists";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import FormControl from "@erxes/ui/src/components/form/Control";
import { IAttachment } from "@erxes/ui/src/types";
import Icon from "@erxes/ui/src/components/Icon";
import Labels from "../label/Labels";
import Uploader from "@erxes/ui/src/components/Uploader";
import { isEnabled } from "@erxes/ui/src/utils/core";

// 모바일용 스타일드 컴포넌트들
const MobileContent = styled(Content)<{ isMobile: boolean }>`
  ${props => props.isMobile && `
    @media (max-width: 768px) {
      width: 160%;
      max-width: 160%;
      margin: 0;
      box-sizing: border-box;
      font-size: 15px;
      line-height: 1.6;
    }
  `}
`;

const MobileCommentContainer = styled.div<{ isMobile: boolean }>`
  margin-bottom: 15px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  
  ${props => props.isMobile && `
    margin-bottom: 20px;
    gap: 12px;
    padding: 8px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    margin-left: 0;
    margin-right: 0;
  `}
`;

const MobileCommentBubble = styled.div<{ isTeam: boolean; isMobile: boolean }>`
  position: relative;
  background-color: ${props => props.isTeam ? '#f0ecf9' : '#ffffff'};
  padding: 10px 15px;
  border-radius: 18px;
  max-width: ${props => props.isTeam ? 'none' : 'none'};
  min-width: ${props => props.isTeam ? '200px' : '200px'};
  width: ${props => props.isTeam ? 'auto' : 'auto'};
  word-wrap: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  border: ${props => props.isTeam ? '1px solid #f0ecf9' : '1px solid #e1e5e9'};
  font-size: 12px;
  line-height: 1.4;
  
  ${props => props.isMobile && `
    padding: 16px 20px;
    max-width: 100%;
    min-width: 0;
    width: 100%;
    font-size: 15px;
    line-height: 1.6;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    border-radius: 12px;
    box-sizing: border-box;
  `}
`;

const MobileUserName = styled.div<{ isMobile: boolean }>`
  min-width: 80px;
  text-align: right;
  font-weight: bold;
  font-size: 12px;
  color: #333;
  padding-top: 5px;
  
  ${props => props.isMobile && `
    min-width: 0;
    width: 100%;
    text-align: left;
    font-size: 14px;
    padding: 6px 8px;
    background-color: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
    margin-bottom: 8px;
    box-sizing: border-box;
  `}
`;

const MobileCommentList = styled(Content)<{ isMobile: boolean }>`
  padding: 12px 12px;
  
  ${props => props.isMobile && `
    padding: 0;
    min-height: 400px;
    max-height: 500px;
    background-color: #fafafa;
    border-radius: 8px;
    border: 1px solid #e1e5e9;
    overflow-x: hidden;
    overflow-y: auto;
    width: 160%;
    max-width: 160%;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  `}
`;

const MobileFormControl = styled(FormControl)`
  @media (max-width: 768px) {
    min-height: 100px !important;
    font-size: 15px !important;
    padding: 16px !important;
    border-radius: 8px !important;
    border: 2px solid #e1e5e9 !important;
    resize: vertical !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
`;

type DescProps = {
  item: IItem;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  contentType: string;
  isMobile: boolean;
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
  const { widgetComments = [], onAddComment, onDeleteComment, onEditComment, currentUser, item } = props;
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
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
      setContent("");
    } catch (error: unknown) {
      console.error("Failed to submit comment:", error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(`댓글 저장 실패: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    
    if (!onDeleteComment) {
      alert('댓글 삭제 기능이 설정되지 않았습니다.');
      return;
    }
    
    if (window.confirm(__("Are you sure you want to delete this comment?"))) {
      setDeletingCommentId(commentId);
      try {
        await onDeleteComment(commentId);
      } catch (error: unknown) {
        console.error("🗑️ Failed to delete comment:", error);
        alert(__("Failed to delete comment"));
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
    const isCurrentUserTeam = currentUser.userType === 'team' || 
                              currentUser.isOwner === true || 
                              currentUser.isAdmin === true ||
                              currentUser.role === 'admin' ||
                              currentUser.role === 'manager' ||
                              currentUser.role === 'team' ||
                              // assigned to로 지정된 사용자인지 확인
                              (item && item.assignedUserIds && 
                               item.assignedUserIds.includes(currentUser._id)) ||
                              // assignedUsers 배열에서도 확인
                              (item && item.assignedUsers && 
                               item.assignedUsers.some(user => user._id === currentUser._id));
    
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
    setEditingContent(comment.content);
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  // 수정 저장
  const saveEditing = async () => {
    if (!onEditComment || !editingCommentId || !editingContent.trim()) return;
    
    try {
      await onEditComment(editingCommentId, editingContent);
      setEditingCommentId(null);
      setEditingContent("");
    } catch (error: unknown) {
      console.error("Failed to edit comment:", error);
    }
  };

  return (
    <FormGroup>
      <TitleRow>
        <ControlLabel>
          <Icon icon="comment-1" />
          {__("Widget Comments")}
        </ControlLabel>
      </TitleRow>
      
      {/* 댓글 목록 */}
      {!widgetComments.length ? (
        <Content>
          {__("No widget comments yet")}
        </Content>
      ) : (
        <MobileCommentList isMobile={isMobile}>
          {widgetComments.map((comment) => {
            // 담당자(팀)인지 고객인지 구분
            const isTeam = comment.userType === 'team';
            
            return (
              <MobileCommentContainer key={comment._id} isMobile={isMobile} style={{ marginLeft: isMobile ? '0px' : (isTeam ? '25px' : '-5px') }}>
                {/* 사용자 이름 */}
                <MobileUserName isMobile={isMobile}>
                  {comment.createdUser ? 
                    (comment.createdUser.firstName && comment.createdUser.lastName ? 
                      `${comment.createdUser.firstName} ${comment.createdUser.lastName}` : 
                      (comment.createdUser.firstName || comment.createdUser.lastName || ' ')
                    ) : ' '}
                </MobileUserName>
                
                {/* 말풍선 형태의 댓글 내용 */}
                <MobileCommentBubble isTeam={isTeam} isMobile={isMobile}>
                     {/* 수정 모드일 때와 일반 모드일 때 구분 */}
                     {editingCommentId === comment._id ? (
                       /* 수정 모드 */
                       <div>
                         <textarea
                           value={editingContent}
                           onChange={(e: any) => setEditingContent(e.target.value)}
                           style={{
                             width: '100%',
                             minHeight: '60px',
                             border: '1px solid #ddd',
                             borderRadius: '4px',
                             padding: '8px',
                             fontSize: '12px',
                             resize: 'vertical',
                             fontFamily: 'inherit'
                           }}
                         />
                         <div style={{
                           display: 'flex',
                           justifyContent: 'flex-end',
                           gap: '5px',
                           marginTop: '8px'
                         }}>
                           <Button
                             btnStyle="simple"
                             size="small"
                             onClick={cancelEditing}
                             style={{
                               padding: '3px 8px',
                               fontSize: '11px',
                               height: '22px'
                             }}
                           >
                             취소
                           </Button>
                           <Button
                             btnStyle="success"
                             size="small"
                             onClick={saveEditing}
                             disabled={!editingContent.trim()}
                             style={{
                               padding: '3px 8px',
                               fontSize: '11px',
                               height: '22px'
                             }}
                           >
                             저장
                           </Button>
                         </div>
                       </div>
                     ) : (
                       /* 일반 모드 */
                       <div>
                         <div dangerouslySetInnerHTML={{ __html: comment.content }} />
                         
                         {/* 시간 표시 */}
                         <div style={{ 
                           fontSize: '11px', 
                           color: isTeam ? '#333' : '#666',
                           marginTop: '8px',
                           textAlign: 'right'
                         }}>
                           {(() => {
                             const isModified = comment.updatedAt && comment.updatedAt !== comment.createdAt;
                             
                             return isModified ? (
                               <span>
                                 {new Date(comment.updatedAt).toLocaleString()}
                                 <span style={{ fontSize: '10px', color: '#999', marginLeft: '5px' }}>
                                   (수정됨)
                                 </span>
                               </span>
                             ) : (
                               new Date(comment.createdAt).toLocaleString()
                             );
                           })()}
                         </div>
                       </div>
                     )}
                </MobileCommentBubble>
                
                {/* 수정/삭제 버튼 - 말풍선 외부 오른쪽 하단에 배치 */}
                {isTeam && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '5px',
                    marginTop: '8px',
                    marginLeft: '10px'
                  }}>
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
                               color: 'white'
                             }}
                           >
                             
                           </Button>
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
                         color: 'white'
                       }}
                     >
                       
                     </Button>
                  </div>
                )}
              </MobileCommentContainer>
            );
          })}
        </MobileCommentList>
      )}

      {/* 댓글 입력 폼 */}
      <div style={{ 
        marginTop: isMobile ? '20px' : '15px',
        width: isMobile ? '160%' : '100%',
        maxWidth: isMobile ? '160%' : '100%',
        marginLeft: isMobile ? '0' : '0',
        marginRight: isMobile ? '0' : '0',
        boxSizing: 'border-box'
      }}>
        <MobileFormControl
          componentclass="textarea"
          value={content}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={__("Write a comment...")}
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
                style={isMobile ? {
                  padding: '8px 16px',
                  fontSize: '14px',
                  minHeight: '36px'
                } : {}}
              >
                {isSubmitting ? __("Saving...") : __("Save")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </FormGroup>
  );
};

const Description = (props: DescProps) => {
  const { item, saveItem, contentType, isMobile } = props;
  const [edit, setEdit] = useState(false);
  const [isSubmitted, setSubmit] = useState(false);
  const [description, setDescription] = useState(item.description);

  useEffect(() => {
    setDescription(item.description);
  }, [item.description]);

  useEffect(() => {
    if (isSubmitted) {
      setEdit(false);
    }
  }, [isSubmitted]);

  const onSend = () => {
    saveItem({ description });
    setSubmit(true);
  };

  const toggleEdit = () => {
    setEdit((currentValue) => !currentValue);
    setSubmit(false);
  };

  const onChangeDescription = (content: string) => {
    setDescription(content);
  };

  const renderFooter = () => {
    return (
      <EditorActions>
        <Button
          icon="times-circle"
          btnStyle="simple"
          size="small"
          onClick={toggleEdit}
        >
          Cancel
        </Button>
        {item.description !== description && (
          <Button
            onClick={onSend}
            btnStyle="success"
            size="small"
            icon="check-circle"
          >
            Save
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
            {__("CustomerDescription")}
          </ControlLabel>
        </TitleRow>

        {!edit ? (
          <MobileContent
            isMobile={isMobile}
            onClick={toggleEdit}
            dangerouslySetInnerHTML={{
              __html: item.description
                ? item.description
                    .replace(/<p><\/p>/g, "<div style='height:16px;'></div>")
                    .replace(/<p><br><\/p>/g, "<div style='height:16px;'></div>")
                    .replace(/<p><br \/><\/p>/g, "<div style='height:16px;'></div>")
                : `${__("Add a more detailed description")}...`,
            }}
          />
        ) : (
          <EditorWrapper>
            <RichTextEditor
              content={description}
              onChange={onChangeDescription}
              height={"max-content"}
              isSubmitted={isSubmitted}
              autoFocus={true}
              name={`${contentType}_description_${item._id}`}
              toolbar={[
                "bold",
                "italic",
                "orderedList",
                "bulletList",
                "link",
                "unlink",
                "|",
                "image",
              ]}
              onCtrlEnter={onSend}
            />

            {renderFooter()}
          </EditorWrapper>
        )}
      </ContentWrapper>
    </FormGroup>
  );
};

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
  widgetComments?: any[];
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  currentUser?: any;
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
  } = props;

  const isMobile = useIsMobile();
  
  // 디버깅용 로그
  console.log('Left component - isMobile:', isMobile);
  console.log('Left component - window.innerWidth:', typeof window !== 'undefined' ? window.innerWidth : 'undefined');
  
  // 직접 체크
  const isMobileDirect = typeof window !== 'undefined' && window.innerWidth <= 768;
  console.log('Left component - isMobileDirect:', isMobileDirect);

  const onChangeAttachment = (files: IAttachment[]) =>
    saveItem({ attachments: files });

  const attachments =
    (item.attachments && extractAttachment(item.attachments)) || [];

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
        />
      )}

      {!isMobile && item.labels.length > 0 && (
        <FormGroup>
          <TitleRow>
            <ControlLabel>
              <Icon icon="label-alt" />
              {__("Labels")}
            </ControlLabel>
          </TitleRow>

          <Labels labels={item.labels} />
        </FormGroup>
      )}

      <FormGroup>
        <TitleRow>
          <ControlLabel>
            <Icon icon="paperclip" />
            {__("Attachments")}
          </ControlLabel>
        </TitleRow>

        <Uploader defaultFileList={attachments} onChange={onChangeAttachment} />
      </FormGroup>

      <Description item={item} saveItem={saveItem} contentType={options.type} isMobile={isMobile} />

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

      {!isMobile && (
        <ActivityInputs
          contentTypeId={item._id}
          contentType={`tickets:${options.type}`}
          showEmail={false}
        />
      )}

      {!isMobile && (
        <ActivityLogs
          target={item.name}
          contentId={item._id}
          contentType={`tickets:${options.type}`}
          extraTabs={
            options.type === "tickets:task" && isEnabled("tasks")
              ? []
              : [{ name: "tickets:task", label: "Ticket" }]
          }
        />
      )}
    </LeftContainer>
  );
};

export default Left;
