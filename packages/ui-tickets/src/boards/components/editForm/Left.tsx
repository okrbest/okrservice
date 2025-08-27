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
import xss from "xss";

type DescProps = {
  item: IItem;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  contentType: string;
};

// WidgetComments 컴포넌트 수정
type WidgetCommentsProps = {
  widgetComments?: any[];
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  currentUser?: any; // 현재 사용자 정보
};

const WidgetComments = (props: WidgetCommentsProps) => {
  const { widgetComments = [], onAddComment, onDeleteComment, onEditComment, currentUser } = props;
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setContent(target.value);
  };

  const handleSubmit = async () => {
    if (!content.trim() || !onAddComment) {
      console.log("Cannot submit comment:", { content: content.trim(), onAddComment: !!onAddComment });
      return;
    }
    
    console.log("Submitting comment:", content);
    setIsSubmitting(true);
    try {
      await onAddComment(content);
      console.log("Comment submitted successfully");
      setContent("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      alert(`댓글 저장 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
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
    console.log('🗑️ Delete button clicked for comment:', commentId);
    console.log('🗑️ onDeleteComment function exists:', !!onDeleteComment);
    
    if (!onDeleteComment) {
      console.error('🗑️ onDeleteComment function is not provided!');
      alert('댓글 삭제 기능이 설정되지 않았습니다.');
      return;
    }
    
    if (window.confirm(__("Are you sure you want to delete this comment?"))) {
      console.log('🗑️ User confirmed deletion, calling onDeleteComment...');
      setDeletingCommentId(commentId);
      try {
        await onDeleteComment(commentId);
        console.log("🗑️ Comment deleted successfully");
      } catch (error) {
        console.error("🗑️ Failed to delete comment:", error);
        alert(__("Failed to delete comment"));
      } finally {
        setDeletingCommentId(null);
      }
    } else {
      console.log('🗑️ User cancelled deletion');
    }
  };

  // 댓글 작성자와 현재 사용자가 같은지 확인
  const canDeleteComment = (comment: any) => {
    console.log('🔍 Checking delete permission for comment:', {
      commentId: comment._id,
      commentUserType: comment.userType,
      commentCreatedUser: comment.createdUser,
      currentUser: currentUser,
      canDelete: comment.userType === 'team' && 
                 (currentUser?._id === comment.createdUser?._id || currentUser?.isOwner || currentUser?.isAdmin)
    });
    
    if (!currentUser || !comment.createdUser) return false;
    return comment.userType === 'team' && 
           (currentUser._id === comment.createdUser._id || currentUser.isOwner || currentUser.isAdmin);
  };

  // 댓글 수정 권한 확인
  const canEditComment = (comment: any) => {
    if (!currentUser || !comment.createdUser) return false;
    return comment.userType === 'team' && 
           (currentUser._id === comment.createdUser._id || currentUser.isOwner || currentUser.isAdmin);
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
    } catch (error) {
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
        <Content style={{ padding: '12px 12px' }}>
          {widgetComments.map((comment) => {
            // 담당자(팀)인지 고객인지 구분
            const isTeam = comment.userType === 'team';
            
            // 디버깅: 댓글 데이터 구조 확인
            console.log('🔍 Comment data:', {
              commentId: comment._id,
              userType: comment.userType,
              isTeam: isTeam,
              createdUser: comment.createdUser,
              content: comment.content?.substring(0, 50) + '...',
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              hasUpdatedAt: !!comment.updatedAt,
              isModified: comment.updatedAt && comment.updatedAt !== comment.createdAt
            });
            
                         return (
               <div key={comment._id} style={{ 
                 marginBottom: '15px', 
                 display: 'flex', 
                 alignItems: 'flex-start',
                 gap: '10px',
                 marginLeft: isTeam ? '25px' : '-5px'
               }}>
                 {/* 사용자 이름 */}
                 <div style={{ 
                   minWidth: '80px',
                   textAlign: 'right',
                   fontWeight: 'bold',
                   fontSize: '12px',
                   color: '#333',
                   paddingTop: '5px'
                 }}>
                   {comment.createdUser ? 
                     (comment.createdUser.firstName && comment.createdUser.lastName ? 
                       `${comment.createdUser.firstName} ${comment.createdUser.lastName}` : 
                       (comment.createdUser.firstName || comment.createdUser.lastName || ' ')
                     ) : ' '}
                 </div>
                 
                                    {/* 말풍선 형태의 댓글 내용 */}
                   <div style={{
                     position: 'relative',
                     backgroundColor: isTeam ? '#f0ecf9' : '#ffffff', // 담당자는 노란색, 고객은 흰색
                     padding: '10px 15px',
                     borderRadius: '18px',
                     maxWidth: isTeam ? 'none' : 'none', // 담당자는 제한 없음, 고객도 제한 없음
                     minWidth: isTeam ? '200px' : '200px', // 담당자는 더 넓게, 고객은 기본
                     width: isTeam ? 'auto' : 'auto', // 담당자는 고정 너비, 고객은 자동
                     wordWrap: 'break-word',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                     border: isTeam ? '1px solid #f0ecf9' : '1px solid #e1e5e9'
                   }}>
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
                             console.log('🕐 Time display logic:', {
                               commentId: comment._id,
                               createdAt: comment.createdAt,
                               updatedAt: comment.updatedAt,
                               isModified: isModified,
                               displayTime: isModified ? comment.updatedAt : comment.createdAt
                             });
                             
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
                   </div>
                 
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
                     {canEditComment(comment) && (
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
                     )}
                     
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
               </div>
             );
          })}
        </Content>
      )}

      {/* 댓글 입력 폼 */}
      <div style={{ marginTop: '15px' }}>
        <FormControl
          componentclass="textarea"
          value={content}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={__("Write a comment...")}
        />
        <div style={{ marginTop: '10px' }}>
          {content.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <Button
                btnStyle="success"
                size="small"
                icon="message"
                onClick={handleSubmit}
                disabled={isSubmitting}
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
  const { item, saveItem, contentType } = props;
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
          <Content
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

  console.log("Left component props:", { 
    itemId: item._id, 
    widgetComments: widgetComments?.length, 
    onAddComment: !!onAddComment,
    onDeleteComment: !!props.onDeleteComment,
    currentUser: !!props.currentUser
  });

  const onChangeAttachment = (files: IAttachment[]) =>
    saveItem({ attachments: files });

  const attachments =
    (item.attachments && extractAttachment(item.attachments)) || [];

  return (
    <LeftContainer>
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

      {item.labels.length > 0 && (
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

      <Description item={item} saveItem={saveItem} contentType={options.type} />

      <WidgetComments 
        widgetComments={widgetComments} 
        onAddComment={onAddComment}
        onDeleteComment={props.onDeleteComment}
        onEditComment={props.onEditComment}
        currentUser={props.currentUser}
      />

      <Checklists
        contentType={options.type}
        contentTypeId={item._id}
        stageId={item.stageId}
        addItem={addItem}
      />

      <ActivityInputs
        contentTypeId={item._id}
        contentType={`tickets:${options.type}`}
        showEmail={false}
      />

      {
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
      }
    </LeftContainer>
  );
};

export default Left;
