// 티켓 설명 저장 충돌 판단.
// 예전에는 수정 시각(modifiedAt)이 1초 넘게 다르면 무조건 충돌로 봤다. 그러면 담당자·날짜 변경,
// 자동화 등으로 설명과 무관하게 수정 시각만 바뀌어도 답변 저장이 막힌다.
// 화면이 "편집을 시작할 때의 설명 지문"을 보내면, 설명 내용이 실제로 바뀐 경우에만 충돌로 본다.

// 화면(erxes-ui utils/descriptionDraft.normalizeDescriptionHtml)과 같은 규칙
export const normalizeDescriptionHtml = (
  html: string | null | undefined,
): string => {
  const value = (html ?? '').trim();

  if (!value) {
    return '';
  }

  return value
    .replace(/<p><\/p>/gi, '')
    .replace(/<p><br\s*\/?><\/p>/gi, '')
    .trim();
};

// 화면(erxes-ui utils/descriptionDraft.descriptionFingerprint)과 같은 값을 만든다: "길이-FNV1a(32비트)"
export const descriptionFingerprint = (
  html: string | null | undefined,
): string => {
  const text = normalizeDescriptionHtml(html);
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${text.length.toString(36)}-${hash.toString(16).padStart(8, '0')}`;
};

const MODIFIED_AT_TOLERANCE_MS = 1000;

type ConflictInput = {
  expectedDescriptionHash?: string | null;
  expectedModifiedAt?: Date | string | null;
  currentDescription?: string | null;
  currentModifiedAt?: Date | string | null;
  // 이번에 저장하려는 설명 — 이미 같은 글이 저장돼 있으면(늦게 반영된 내 저장을 다시 보낸 경우) 충돌이 아니다
  newDescription?: string | null;
};

export const hasDescriptionConflict = ({
  expectedDescriptionHash,
  expectedModifiedAt,
  currentDescription,
  currentModifiedAt,
  newDescription,
}: ConflictInput): boolean => {
  if (expectedDescriptionHash) {
    const current = descriptionFingerprint(currentDescription);

    return (
      current !== expectedDescriptionHash &&
      current !== descriptionFingerprint(newDescription)
    );
  }

  // 지문을 보내지 않는 예전 화면: 기존처럼 수정 시각으로 판단
  if (expectedModifiedAt == null || !currentModifiedAt) {
    return false;
  }

  const expectedMs = new Date(expectedModifiedAt).getTime();
  const actualMs = new Date(currentModifiedAt).getTime();

  return Math.abs(expectedMs - actualMs) > MODIFIED_AT_TOLERANCE_MS;
};
