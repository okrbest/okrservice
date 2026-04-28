import * as React from "react";

/** erxes `Attachment` / filemanager `renderFileIcon` 과 동일 색 체계 */
const COLORS = {
  pdf: "#FF6600",
  doc: "#3B85F4",
  xls: "#3CCC38",
  ppt: "#EA475D",
  archive: "#6a818c",
  audio: "#673FBD",
  file: "#AAAEB3",
} as const;

type Kind = keyof typeof COLORS;

function resolveKind(ext: string): Kind {
  const e = ext.toLowerCase();
  if (e === "pdf") return "pdf";
  if (["doc", "docx", "hwp", "hwpx", "odt", "rtf"].includes(e)) return "doc";
  if (["xls", "xlsx", "ods"].includes(e)) return "xls";
  if (["csv"].includes(e)) return "xls";
  if (["ppt", "pptx", "odp"].includes(e)) return "ppt";
  if (["zip", "rar", "7z", "tar", "gz"].includes(e)) return "archive";
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(e))
    return "audio";
  return "file";
}

function resolveLabel(ext: string, kind: Kind): string {
  const e = ext.toLowerCase() || "file";
  switch (kind) {
    case "pdf":
      return "PDF";
    case "doc":
      return "DOC";
    case "xls":
      if (e === "csv") return "CSV";
      return "XLS";
    case "ppt":
      return "PPT";
    case "archive":
      return e ? e.slice(0, 3).toUpperCase() : "ZIP";
    case "audio":
      return e === "mp3" ? "MP3" : "AUD";
    default:
      if (e.length >= 2 && e.length <= 4) return e.toUpperCase();
      return (e.slice(0, 3) || "FILE").toUpperCase();
  }
}

type Props = {
  extension: string;
  size?: number;
  className?: string;
};

/**
 * 웹 티켓 첨부와 같이 확장자별 색·라벨을 쓰는 파일 타입 배지 (폰트 아이콘 대신 SVG).
 */
export default function FileTypeIcon({
  extension,
  size = 40,
  className,
}: Props) {
  const kind = resolveKind(extension);
  const label = resolveLabel(extension, kind);
  const color = COLORS[kind];
  const display =
    label.length > 4 ? `${label.slice(0, 3)}…` : label;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" ry="8" fill={color} />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fill="#fff"
        fontSize={display.length >= 4 ? 9 : 11}
        fontWeight="700"
        fontFamily='system-ui, -apple-system, "Segoe UI", sans-serif'
      >
        {display}
      </text>
    </svg>
  );
}
