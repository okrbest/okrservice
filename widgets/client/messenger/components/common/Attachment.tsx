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
      return <img role="presentation" src={readFile(attachment.url)} alt={attachment.name} />;
    }

    return (
      <div className="file-wrapper">
        <span style={{ fontSize: "24px", marginRight: "8px" }}>{getFileIcon(fileExtension)}</span>
        <span>{attachment.name}</span>
      </div>
    );
  }

  // If name exists, use it. Otherwise extract from URL by removing random ID prefix (21 characters)
  let downloadName = attachment.name;
  if (!downloadName && attachment.url) {
    const urlFileName = attachment.url;
    downloadName = urlFileName.length > 21 ? urlFileName.substring(21) : urlFileName;
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
