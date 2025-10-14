import * as React from "react";

import { IconUpload } from "../../../../icons/Icons";
import { readFile } from "../../../../utils";
import uploadHandler from "../../../../uploadHandler";
import { useDropzone } from "react-dropzone";
import { __ } from "../../../../utils";
import { connection } from "../../../connection";

const imgStyle = {
  display: "block",
  width: "100px",
  height: "80px",
  "object-fit": "cover",
};

interface FileWithUrl extends File {
  url?: string;
}

const FileUploader = ({
  handleFiles,
}: {
  handleFiles: (files: any) => void;
}) => {
  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  // 허용된 파일 타입 가져오기
  const getAllowedFileTypes = () => {
    const allowedTypes = connection.data?.messengerData?.allowedFileTypes || [];

    if (!allowedTypes || allowedTypes.length === 0) {
      // 기본값: 이미지만 허용
      return { "image/*": [] };
    }

    // MIME 타입을 react-dropzone accept 형식으로 변환
    const acceptTypes: Record<string, string[]> = {};

    allowedTypes.forEach((mimeType: string) => {
      if (mimeType.startsWith("image/")) {
        acceptTypes[mimeType] = [];
      } else if (mimeType === "application/pdf") {
        acceptTypes[mimeType] = [".pdf"];
      } else if (mimeType === "application/msword") {
        acceptTypes[mimeType] = [".doc"];
      } else if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        acceptTypes[mimeType] = [".docx"];
      } else if (mimeType === "application/vnd.ms-excel") {
        acceptTypes[mimeType] = [".xls"];
      } else if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        acceptTypes[mimeType] = [".xlsx"];
      } else if (mimeType === "application/vnd.ms-powerpoint") {
        acceptTypes[mimeType] = [".ppt"];
      } else if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      ) {
        acceptTypes[mimeType] = [".pptx"];
      } else if (mimeType === "text/csv") {
        acceptTypes[mimeType] = [".csv"];
      } else if (mimeType === "text/plain") {
        acceptTypes[mimeType] = [".txt"];
      } else if (mimeType.startsWith("video/")) {
        acceptTypes[mimeType] = [];
      } else if (mimeType.startsWith("audio/")) {
        acceptTypes[mimeType] = [];
      } else if (mimeType === "application/zip") {
        acceptTypes[mimeType] = [".zip"];
      } else if (mimeType === "application/x-rar-compressed") {
        acceptTypes[mimeType] = [".rar"];
      } else {
        // 기타 MIME 타입
        acceptTypes[mimeType] = [];
      }
    });

    return Object.keys(acceptTypes).length > 0
      ? acceptTypes
      : { "image/*": [] };
  };

  const sendFiles = (files: FileList) => {
    const uploadedFiles: FileWithUrl[] = [];
    const total = files.length;
    let completed = 0;

    uploadHandler({
      files,
      beforeUpload: () => {
        setIsUploading(true);
      },
      afterUpload({ response, fileInfo }: { response: any; fileInfo: any }) {
        const updatedFile = {
          ...fileInfo,
          url: response,
        } as FileWithUrl;

        uploadedFiles.push(updatedFile);
        setFiles((prev) => [...prev, updatedFile]);

        completed++;

        if (completed === total) {
          setIsUploading(false);
          handleFiles(uploadedFiles);
        }
      },
      onError: (message) => {
        alert(message);
        setIsUploading(false);
      },
    });
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: getAllowedFileTypes(),
    onDrop: (acceptedFiles) => {
      const updatedFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((file) => dataTransfer.items.add(file));
      const fileList = dataTransfer.files;

      if (fileList && fileList.length > 0) {
        sendFiles(fileList);
      }
    },
    onDropRejected: (fileRejections) => {
      // 파일이 거부되었을 때 메시지 표시
      const allowedTypes =
        connection.data?.messengerData?.allowedFileTypes || [];
      alert(`허용된 파일 형식: ${allowedTypes.join(", ")}`);
    },
  });

  const thumbs = files.map((file) => (
    <div className="dropzone-thumb" key={file.name}>
      <div className="inner">
        <img
          src={readFile(file.url || "")}
          style={imgStyle}
          // Revoke data uri after image is loaded
          onLoad={() => {
            if (file.url?.startsWith("blob:")) {
              URL.revokeObjectURL(file.url);
            }
          }}
        />
      </div>
    </div>
  ));

  React.useEffect(() => {
    // Make sure to revoke the data uris to avoid memory leaks, will run on unmount
    return () => files.forEach((file) => URL.revokeObjectURL(file.name));
  }, [files]);

  return (
    <section className="dropzone-container">
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <div className="dropzone-field-description">
          {isUploading ? (
            <div className="relative w-[43px] h-[43px]">
              <div className="loader" />
            </div>
          ) : (
            <IconUpload />
          )}
          <p>{__("Upload screenshot or your a file here")}</p>
        </div>
      </div>
      <aside className="dropzone-thumbs-container">{thumbs}</aside>
    </section>
  );
};

export default FileUploader;
