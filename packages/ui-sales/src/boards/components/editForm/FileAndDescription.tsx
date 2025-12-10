import { Content, ContentWrapper, TitleRow } from "../../styles/item";
import {
  EditorActions,
  EditorWrapper,
} from "@erxes/ui-internalnotes/src/components/Form";
import { IItem, IOptions } from "../../types";
import React, { useEffect, useState } from "react";
import { __ } from "coreui/utils";
import { extractAttachment } from "@erxes/ui/src/utils";

import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IAttachment } from "@erxes/ui/src/types";
import Icon from "@erxes/ui/src/components/Icon";
import { RichTextEditor } from "@erxes/ui/src/components/richTextEditor/TEditor";
import Uploader from "@erxes/ui/src/components/Uploader";
import xss from "xss";

type DescProps = {
  item: IItem;
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
  contentType: string;
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
    setEdit((currentValue) => {
      const newValue = !currentValue;
      
      // 편집 모드로 진입할 때
      if (!currentValue && newValue) {
        if (typeof window !== 'undefined') {
          const localStorageKey = `${contentType}_description_${item._id}`;
          const storedData = localStorage.getItem(localStorageKey);
          
          if (storedData) {
            try {
              // JSON 형식으로 저장된 경우 (타임스탬프 포함)
              const parsed = JSON.parse(storedData);
              const storedContent = parsed.content;
              const storedTimestamp = parsed.timestamp ? new Date(parsed.timestamp) : null;
              const serverModifiedAt = item.modifiedAt ? new Date(item.modifiedAt) : null;
              
              // 서버가 더 최신이면 localStorage 클리어하고 서버 내용 사용
              if (serverModifiedAt && storedTimestamp && serverModifiedAt > storedTimestamp) {
                localStorage.removeItem(localStorageKey);
                setDescription(item.description);
              } else {
                // localStorage가 더 최신이거나 타임스탬프가 없으면 localStorage 사용
                setDescription(storedContent || item.description);
              }
            } catch (e) {
              // JSON 파싱 실패 시 기존 형식 (문자열만 저장된 경우)
              // 내용이 다르면 서버 내용 사용 (다른 사용자가 수정했을 가능성)
              const serverContent = item.description || '';
              if (storedData !== serverContent) {
                localStorage.removeItem(localStorageKey);
                setDescription(serverContent);
              } else {
                setDescription(storedData);
              }
            }
          } else {
            setDescription(item.description);
          }
        } else {
          setDescription(item.description);
        }
      }
      
      // 편집 모드를 끌 때 (Cancel 시) localStorage 클리어 및 원본으로 되돌리기
      if (currentValue && !newValue) {
        // localStorage 클리어하여 Ctrl+Z로 사라진 상태가 복원되지 않도록 함
        if (typeof window !== 'undefined') {
          const localStorageKey = `${contentType}_description_${item._id}`;
          localStorage.removeItem(localStorageKey);
        }
        
        // description을 원본으로 되돌리기
        setDescription(item.description);
      }
      
      return newValue;
    });
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
          <ControlLabel uppercase={true}>
            <Icon icon="align-left-justify" />
            {__("Description")}
          </ControlLabel>
        </TitleRow>

        {!edit ? (
          <Content
            onClick={toggleEdit}
            dangerouslySetInnerHTML={{
              __html: item.description
                ? xss(item.description)
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
  saveItem: (doc: { [key: string]: any }, callback?: (item) => void) => void;
};

const FileAndDescription = (props: Props) => {
  const { item, saveItem, options } = props;

  const onChangeAttachment = (files: IAttachment[]) =>
    saveItem({ attachments: files });

  const attachments =
    (item.attachments && extractAttachment(item.attachments)) || [];

  return (
    <>
      <FormGroup>
        <TitleRow>
          <ControlLabel uppercase={true}>
            <Icon icon="paperclip" />
            {__("Attachments")}
          </ControlLabel>
        </TitleRow>

        <Uploader defaultFileList={attachments} onChange={onChangeAttachment} />
      </FormGroup>

      <Description item={item} saveItem={saveItem} contentType={options.type} />
    </>
  );
};

export default FileAndDescription;
