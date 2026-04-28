import * as React from "react";
import { __, readFile, sanitizeAttachmentDownloadBasename } from "../../../utils";
import { IAttachment } from "../../types";
import FileTypeIcon from "./FileTypeIcon";

function Attachment({ attachment }: { attachment: IAttachment }) {
  const rawDownload = (attachment.name || attachment.url || "").trim();
  const downloadName =
    sanitizeAttachmentDownloadBasename(rawDownload) || "file";

  const attachmentName = attachment.url || attachment.name || "";
  const fileExtension = attachmentName.split(".").pop()?.toLowerCase() || "";

  const isImage =
    ["png", "jpeg", "jpg", "gif", "webp", "bmp", "svg"].indexOf(
      fileExtension,
    ) > -1;

  // Add name parameter to URL for proper filename in download
  const downloadUrl =
    attachment.url && attachment.url.includes("http")
      ? attachment.url
      : `${readFile(attachment.url)}&name=${encodeURIComponent(downloadName)}`;

  // 교차 출처에서는 <a download>가 무시되는 경우가 많아, Blob으로 저장하면 실제 바이너리·파일명이 맞음
  const onDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(downloadUrl, {
        mode: "cors",
        credentials: "omit",
      });
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const blob = await res.blob();
      if (blob.type && blob.type.includes("text/html")) {
        window.alert(
          "파일을 받을 수 없습니다. 로그인 페이지나 오류 HTML이 반환되었습니다.",
        );
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (isImage) {
    return (
      <a
        className="download-attachment"
        href={downloadUrl}
        download={downloadName}
        target="_blank"
        title={__("Download")}
        rel="noopener noreferrer"
        onClick={onDownloadClick}
      >
        <img
          role="presentation"
          src={readFile(attachment.url)}
          alt={attachment.name}
          style={{
            maxWidth: "200px",
            maxHeight: "200px",
            objectFit: "contain",
            display: "block",
          }}
        />
      </a>
    );
  }

  return (
    <a
      className="download-attachment ticket-attachment-file-row"
      href={downloadUrl}
      download={downloadName}
      target="_blank"
      title={`${downloadName} — ${__("Download")}`}
      rel="noopener noreferrer"
      onClick={onDownloadClick}
    >
      <span className="ticket-attachment-file-icon-wrap">
        <FileTypeIcon extension={fileExtension} size={44} />
      </span>
      <span className="ticket-attachment-file-info">
        <span className="ticket-attachment-file-name">{downloadName}</span>
        <span className="ticket-attachment-file-hint">{__("Download")}</span>
      </span>
      <span className="ticket-attachment-file-action" aria-hidden>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  );
}

export default Attachment;
