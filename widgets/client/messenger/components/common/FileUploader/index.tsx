import * as React from "react";

import { IconUpload } from "../../../../icons/Icons";
import { readFile } from "../../../../utils";
import uploadHandler from "../../../../uploadHandler";
import { useDropzone } from "react-dropzone";
import { __ } from "../../../../utils";
import { connection } from "../../../connection";

const imgStyle = {
  display: "block",
  width: "120px",
  height: "110px",
  "object-fit": "cover",
  borderRadius: "4px",
};

const fileWrapperStyle = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  width: "120px",
  height: "110px",
  backgroundColor: "#f5f5f5",
  borderRadius: "4px",
  padding: "8px",
  boxSizing: "border-box" as const,
  position: "relative" as const,
};

const fileNameStyle = {
  fontSize: "11px",
  textAlign: "center" as const,
  wordBreak: "break-word" as const,
  marginTop: "6px",
  color: "#333",
  maxWidth: "110px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  lineHeight: "1.3",
};

const removeButtonStyle = {
  position: "absolute" as const,
  top: "2px",
  right: "2px",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  backgroundColor: "#ff4d4f",
  color: "white",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold" as const,
  zIndex: 10,
};

// 파일 타입별 아이콘
const getFileIcon = (extension: string): string => {
  const iconMap: { [key: string]: string } = {
    pdf: "📄",
    doc: "📝",
    docx: "📝",
    xls: "📊",
    xlsx: "📊",
    ppt: "📊",
    pptx: "📊",
    txt: "📃",
    zip: "🗜️",
    rar: "🗜️",
    csv: "📈",
  };
  
  return iconMap[extension.toLowerCase()] || "📎";
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
  const uploadedFilesRef = React.useRef<FileWithUrl[]>([]);
  const completedRef = React.useRef(0);
  const allFilesRef = React.useRef<FileWithUrl[]>([]);

  // 허용된 파일 타입 가져오기
  const getAllowedFileTypes = () => {
    const allowedTypes = connection.data?.messengerData?.allowedFileTypes || [];

    // 설정이 없으면 undefined를 반환하여 모든 파일 타입 허용
    if (!allowedTypes || allowedTypes.length === 0) {
      return undefined;
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

    return Object.keys(acceptTypes).length > 0 ? acceptTypes : undefined;
  };

  const sendFiles = (filesToUpload: FileList) => {
    const total = filesToUpload.length;

    // 업로드 시작 시 상태 초기화
    uploadedFilesRef.current = [];
    completedRef.current = 0;
    setIsUploading(true);

    console.log(`[FileUploader] ${total}개 파일 업로드 시작`);

    // 모든 파일 처리가 완료되었는지 확인하는 함수
    const checkCompletion = () => {
      completedRef.current++;

      console.log(`[FileUploader] 파일 처리 완료, 진행: ${completedRef.current}/${total}, 업로드 성공: ${uploadedFilesRef.current.length}`);

      if (completedRef.current === total) {
        console.log(`[FileUploader] 모든 파일 처리 완료! ${uploadedFilesRef.current.length}개 파일 업로드 성공`);
        setIsUploading(false);
        
        if (uploadedFilesRef.current.length > 0) {
          const finalFiles = [...allFilesRef.current];
          console.log(`[FileUploader] handleFiles 호출, 전달 파일 수: ${finalFiles.length}`);
          handleFiles(finalFiles);
        }
      }
    };

    uploadHandler({
      files: filesToUpload,
      beforeUpload: () => {
        // beforeUpload는 각 파일마다 호출되므로 여기서는 아무것도 하지 않음
      },
      afterUpload({ response, fileInfo }: { response: any; fileInfo: any }) {
        const updatedFile = {
          ...fileInfo,
          url: response,
        } as FileWithUrl;

        // ref를 사용하여 배열 업데이트 (동시 실행 시에도 안전)
        uploadedFilesRef.current.push(updatedFile);
        // 전체 목록 ref 및 state 동기화 (setState 비동기 이전에 ref 먼저 세팅)
        allFilesRef.current = [...allFilesRef.current, updatedFile];
        setFiles([...allFilesRef.current]);

        console.log(`[FileUploader] 파일 업로드 완료: ${fileInfo.name}, 업로드된 파일 배열 길이: ${uploadedFilesRef.current.length}`);

        checkCompletion();
      },
      onError: (message) => {
        console.log(`[FileUploader] 파일 업로드 에러: ${message}`);
        alert(message);
        
        // 에러가 발생해도 완료 카운트 증가
        checkCompletion();
      },
    });
  };

  const allowedFileTypes = getAllowedFileTypes();

  const { getRootProps, getInputProps } = useDropzone({
    ...(allowedFileTypes ? { accept: allowedFileTypes } : {}),
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
      if (allowedTypes.length > 0) {
        alert(`허용된 파일 형식: ${allowedTypes.join(", ")}`);
      } else {
        alert("파일 업로드 중 오류가 발생했습니다.");
      }
    },
  });

  const removeFile = (fileToRemove: FileWithUrl) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((file) => file.name !== fileToRemove.name);
      // 부모 컴포넌트에 업데이트된 파일 목록 전달
      handleFiles(updatedFiles);
      return updatedFiles;
    });
  };

  const thumbs = files.map((file) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].includes(fileExtension);

    return (
      <div className="dropzone-thumb" key={file.name} style={{ position: "relative" }}>
        <div className="inner" style={{ position: "relative" }}>
          <button
            style={removeButtonStyle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeFile(file);
            }}
            title="파일 제거"
          >
            ×
          </button>
          {isImage ? (
            <img
              src={readFile(file.url || "")}
              style={imgStyle}
              alt={file.name}
              onLoad={() => {
                if (file.url?.startsWith("blob:")) {
                  URL.revokeObjectURL(file.url);
                }
              }}
            />
          ) : (
            <div style={fileWrapperStyle}>
              <span style={{ fontSize: "40px", marginBottom: "4px" }}>{getFileIcon(fileExtension)}</span>
              <span style={fileNameStyle} title={file.name}>
                {file.name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  });

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
