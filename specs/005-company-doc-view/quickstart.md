# Quickstart: 우리 회사 문서 본문 보기 확인

## 준비

- Node 20 (`/Users/shin-yeji/.nvm/versions/node/v20.20.2/bin`), docker(`/usr/local/bin`) PATH에 추가.
- TeamplGPT 시험 서버: `teamplgpt/server`에서 `SERVER_PORT=3011 NODE_ENV=development node index.js` (3001은 다른 앱, 3101은 사용자 개발 서버라 쓰지 않는다).
- 회사 문서 허용 embed 1개 + 시험 회사 두 곳에 문서 업로드: TeamplGPT `server/scripts/e2e-embed-company-docs/runner.js`를 `E2E_KEEP=1`로 실행하면 embed·문서가 남는다(종료 후 출력된 uuid로 정리).
- 위젯: 개발 서버(3200)·webpack watch 동작 중. 위젯 서버가 3011을 보게 하려면 위젯 서버를 `TEAMPLGPT_BASE_URL=http://localhost:3011 TEAMPLGPT_EMBED_ID=<시험 embed uuid>`로 별도 포트에서 띄운다(운영·데모 TeamplGPT에 시험 파일을 올리지 않는다).

## 시나리오

1. **API 단위** (TeamplGPT 3011 직접)
   - A사 ready 문서 → 200, `content`에 사규 고유 문구(예: "09:30") 포함.
   - 같은 id를 B사 이름으로 → 404 NOT_FOUND.
   - 같은 id를 다른 embed uuid로 → 404 NOT_FOUND(또는 그 embed가 회사 문서 비허용이면 403).
   - 처리 중 문서 → 409 NOT_READY.
   - id `abc`, `-1`, 없는 번호 → 404.
2. **위젯 서버 중계**: 위 1을 위젯 서버 경로로 반복해 같은 상태·본문이 오는지.
3. **위젯 화면** (playwright, `companyData.name` 지정, `showTicket: true`)
   - 티켓 탭 → 우리 회사 문서 → ready 문서에 보기 있음, 처리 중·실패 문서엔 없음.
   - 보기 → 같은 패널에 파일 이름·올린 사람·날짜·본문, 끝까지 스크롤.
   - ← 목록 → 목록 그대로.
   - 본문을 연 상태에서 서버에서 그 문서 삭제 → 다시 보기 → "이미 삭제된 문서입니다" + 목록 갱신.
   - 195조 분량(4개 사규 PDF 중 가장 긴 것)으로 보기 → 3초 안에 표시(SC-002).
   - 본문에 `<b>` 같은 꺾쇠 문자가 들어간 txt 문서 → 글자 그대로 보임(FR-007).
4. **챗봇과 일치 (SC-005)**: 본문에서 확인한 조항 값(예: 식대 23만 원)을 같은 회사로 챗봇에 물어 같은 값이 나오는지.
5. **회귀**: TeamplGPT 회사 문서 E2E 전건 PASS(격리 CR-03 포함), 위젯 chatbot·ticket jest 전건 PASS.

## 정리

`E2E_KEEP=1`로 남긴 embed·문서·워크스페이스 삭제, 별도로 띄운 위젯 서버 종료.
