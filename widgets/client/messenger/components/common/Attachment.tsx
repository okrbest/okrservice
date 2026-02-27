import * as React from "react";
import { iconAttach } from "../../../icons/Icons";
import { readFile } from "../../../utils";
import { IAttachment } from "../../types";

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

function Attachment({ attachment }: { attachment: IAttachment }) {
  function renderAtachment() {
    const attachmentName = attachment.url || attachment.name || "";
    const fileExtension = attachmentName.split(".").pop()?.toLowerCase() || "";
    
    // 이미지 파일인지 확인
    const isImage = ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].indexOf(fileExtension) > -1;

    if (isImage) {
      return (
        <img
          role="presentation"
          src={readFile(attachment.url)}
          alt={attachment.name}
          style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "contain", display: "block" }}
        />
      );
    }

    return (
      <div className="file-wrapper">
        <span style={{ fontSize: "24px", marginRight: "8px" }}>{getFileIcon(fileExtension)}</span>
        <span>{attachment.name}</span>
      </div>
    );
  }

  // 다운로드 파일명 결정: name 우선, 없으면 URL에서 추출하며 임시 prefix 제거
  const extractNameFromUrl = (url: string) => {
    const last = url.split("/").pop() || url;
    // upload_<random>_original.ext 형태의 prefix 제거
    const cleaned = last.replace(/^upload_[^_]*_/, "");
    try {
      return decodeURIComponent(cleaned || last);
    } catch (e) {
      return cleaned || last;
    }
  };

  let downloadName = attachment.name || "";
  if (!downloadName && attachment.url) {
    downloadName = extractNameFromUrl(attachment.url);
  }
  downloadName = downloadName || "file";
  
  // Add name parameter to URL for proper filename in download
  const downloadUrl = attachment.url && attachment.url.includes('http') 
    ? attachment.url 
    : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;

  return (
    <a
      className="download-attachment"
      href={downloadUrl}
      target="_blank"
      title="Download"
      rel="noopener noreferrer"
    >
      {renderAtachment()}
    </a>
  );
}

export default Attachment;
