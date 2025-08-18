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
};

const WidgetComments = (props: WidgetCommentsProps) => {
  const { widgetComments = [], onAddComment } = props;
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <Content>
          {widgetComments.map((comment) => (
            <div key={comment._id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {comment.createdUser ? `${comment.createdUser.firstName} ${comment.createdUser.lastName}` : 'Unknown User'}
              </div>
              <div dangerouslySetInnerHTML={{ __html: comment.content }} />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                {new Date(comment.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
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
    onAddComment: !!onAddComment 
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

      <WidgetComments widgetComments={widgetComments} onAddComment={onAddComment} />

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
