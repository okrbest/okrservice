# Data Model: 우리 회사 문서 본문 보기

스키마 변경 없음. 기존 데이터를 읽기만 한다.

## 회사 문서 (TeamplGPT `embed_company_documents` 행, 기존)

| 필드 | 용도 (이번 기능) |
|---|---|
| `id` | 본문 요청 대상 |
| `embed_id` | 소유 판정 — 요청 embed와 같아야 함 |
| `company_hash` | 소유 판정 — 요청 회사 이름의 해시와 같아야 함. 저장 폴더 이름이기도 함 |
| `filename`, `uploader_name`, `createdAt` | 본문 화면 머리글 |
| `status` | `ready`일 때만 본문 제공 |
| `location` | 본문 JSON 위치 `<company_hash>/<file>.json` (`companyDocsPath()` 기준) |

## 본문 JSON (TeamplGPT `storage/company-documents/<company_hash>/<file>.json`, 기존)

처리 때 collector 결과를 합쳐 저장한 파일. 이번 기능은 `pageContent`(문자열)만 읽는다. 다른 필드(내부 경로 등)는 응답에 넣지 않는다.

## 상태와 보기 가능 여부

| status | 위젯 보기 버튼 | 본문 API |
|---|---|---|
| processing | 없음 | 409 NOT_READY |
| failed | 없음 | 409 NOT_READY |
| ready | 있음 | 200 (파일 없으면 404 CONTENT_MISSING) |
| (행 없음·다른 공간) | — | 404 NOT_FOUND |

## 위젯 화면 상태 (CompanyDocsPanel)

- `viewing: CompanyDoc | null` — null이면 목록, 값이 있으면 본문 화면.
- 본문 화면 내부: `loading` → `loaded(content)` | `error(code)`.
- 패널을 닫았다 다시 열면 `viewing = null`(목록부터).
