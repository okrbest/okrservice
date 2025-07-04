import React, { useState, ChangeEvent, FormEvent } from "react";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import { useRichTextEditorContext } from "../RichTextEditor.context";
import {
  IRichTextEditorControlBaseProps,
  RichTextEditorControlBase,
} from "./RichTextEditorControl";
import {
  FileInputAction,
  FormItemWrapper,
  ImageHandlingForm,
  ImageInputWrapper,
  Input,
} from "./styles";
import Icon from "../../Icon";
import { readFile } from "../../../utils/core";
import { ModalFooter } from "../../../styles/main";
import Button from "../../Button";
import Uploader from "../../Uploader";
import { IAttachment } from "../../../types";
import { __ } from "coreui/utils";

const LinkIcon: IRichTextEditorControlBaseProps["icon"] = () => (
  <Icon icon="image" />
);

export type RichTextEditorLinkControlProps = {
  icon?: React.FC;
  initialExternal?: boolean;
};

const INITIAL_FORM_STATE = {
  link: "",
  alt: "",
  title: "",
};

export const RichTextEditorImageControl = (
  props: RichTextEditorLinkControlProps
) => {
  const { icon } = props;
  const { editor, labels } = useRichTextEditorContext();
  const [inputs, setInputs] = useState(INITIAL_FORM_STATE);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.persist();
    setInputs((values) => ({ ...values, [e.target.name]: e.target.value }));
  };

  const setImage = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setImage({
          src: inputs.link,
          ...(inputs.alt && { alt: inputs.alt }),
          ...(inputs.title && { title: inputs.title }),
        })
        .run();
    }
  };

  const handleSubmit = (e: FormEvent<Element>, callback: () => void) => {
    setImage();
    if (callback) {
      callback();
    }
    setInputs(INITIAL_FORM_STATE);
  };

  const onChangeAttachment = (attachments: IAttachment[]) => {
    setInputs((values) => ({
      ...values,
      link: readFile(attachments[0].url),
    }));
  };

  const getFormItem = (name: string, label: string = "") => {
    if (name === "link") {
      return (
        <>
          <label htmlFor="link-input">{__("Source")}</label>
          <ImageInputWrapper>
            <Input
              id="link-input"
              name="link"
              autoFocus={true}
              placeholder={__(labels.imageUrlControlLabel)}
              aria-label={labels.imageUrlControlLabel}
              value={inputs.link}
              onChange={handleChange}
            />
            <FileInputAction>
              <Uploader
                defaultFileList={[]}
                onChange={onChangeAttachment}
                icon="file-upload-alt"
                multiple={false}
                showOnlyIcon={true}
                noPreview={true}
                hideUploadButtonOnLoad={true}
              />
            </FileInputAction>
          </ImageInputWrapper>
        </>
      );
    }

    return (
      <>
        <label htmlFor={`${name}-input`}>{label}</label>
        <ImageInputWrapper>
          <Input id={`${name}-input`} name={name} onChange={handleChange} />
        </ImageInputWrapper>
      </>
    );
  };

  const renderFormItem = (name: string, label?: string) => {
    const formItem = getFormItem(name, __(label));
    return <FormItemWrapper>{formItem}</FormItemWrapper>;
  };

  const renderFooter = (closeModal: () => void) => (
    <ModalFooter>
      <Button
        btnStyle="simple"
        type="button"
        icon="cancel-1"
        onClick={closeModal}
      >
        Cancel
      </Button>
      <Button
        btnStyle="success"
        type="button"
        icon="check-circle"
        onClick={(e) => handleSubmit(e, closeModal)}
      >
        Save
      </Button>
    </ModalFooter>
  );

  const renderContent = ({ closeModal }) => {
    return (
      <ImageHandlingForm onSubmit={(e) => handleSubmit(e, closeModal)}>
        {renderFormItem("link")}
        {renderFormItem("alt", "Alternative description")}
        {renderFormItem("title", "Image title")}
        {renderFooter(closeModal)}
      </ImageHandlingForm>
    );
  };

  return (
    <ModalTrigger
      centered
      enforceFocus={false}
      title="Insert/ Edit Image"
      trigger={
        <RichTextEditorControlBase
          icon={icon || LinkIcon}
          aria-label={labels.imageControlLabel}
          title={labels.imageControlLabel}
          active={editor?.isActive("image")}
        />
      }
      content={renderContent}
    />
  );
};
