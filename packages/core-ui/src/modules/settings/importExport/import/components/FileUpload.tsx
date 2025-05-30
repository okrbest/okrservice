import {
  FileUploadBox,
  FullContent,
  ImportHeader,
  UploadText,
} from "../../styles";
import { FlexItem, FlexPad } from "modules/common/components/step/styles";
import { __ } from "coreui/utils";

import { IAttachment } from "modules/common/types";
import { IContentType } from "../../types";
import React from "react";
import Uploader from "@erxes/ui/src/components/Uploader";
import { renderText } from "../../utils";
import ColumnChooser from "modules/forms/components/ColumnChooser";

type Props = {
  onChangeAttachment: (files: IAttachment[], contentType: string) => void;
  contentTypes: IContentType[];
  type: string;
};

class FileUpload extends React.Component<Props, {}> {
  rendertContent = () => {
    const { contentTypes, onChangeAttachment } = this.props;

    return contentTypes.map((contentType) => {
      const onChange = (attachmentsAtt) =>
        onChangeAttachment(attachmentsAtt, contentType.contentType);

      return (
        <FileUploadBox key={contentType.contentType}>
          <UploadText>
            <p>{__(renderText(contentType.contentType))}</p>
            <ColumnChooser contentType={contentType.contentType} />
          </UploadText>

          <Uploader
            text={`Choose a file to upload your ${renderText(
              contentType.contentType
            )}.`}
            warningText={"Only .csv file is supported."}
            icon={contentType.icon || "users-alt"}
            accept=".csv"
            single={true}
            defaultFileList={[]}
            onChange={onChange}
          />
        </FileUploadBox>
      );
    });
  };

  render() {
    return (
      <FlexItem>
        <FlexPad direction="column" overflow="auto">
          <ImportHeader>{__(`Upload your file`)}</ImportHeader>
          <ImportHeader fontSize="small">
            {__(
              "Before you upload your files below, make sure your file is ready to be imported."
            )}
          </ImportHeader>
          <FullContent $center={true}>
            <div style={{ marginBottom: "30px" }}>{this.rendertContent()}</div>
          </FullContent>
        </FlexPad>
      </FlexItem>
    );
  }
}

export default FileUpload;
