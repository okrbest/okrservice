# Quickstart: 자동화 메일에 고객용 티켓 바로 열기 링크

## 0. 준비

- automations-api 환경에 `WIDGETS_DOMAIN` 추가(로컬: `http://localhost:3200`, 운영: 위젯 공개 주소). 없으면 링크가 비어서 간다.
- 로컬 메일 확인: SES가 없으면 automations-api의 메일 전송 설정(로컬 SMTP/로그) 그대로 — 보낸 본문을 확인할 수 있어야 한다.

## 1. 단위 테스트

widgets의 jest로 실행(각 테스트 파일 첫 줄의 명령, testMatch만 바꿈):

```bash
cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/ticketViewLink.test.ts","<rootDir>/test/ticketViewEmailLink.test.ts"]}'
cd widgets && npx jest --config '{"rootDir":"../packages/plugin-automations-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/customerTicketLink.test.ts"]}'
```

## 2. 실동작 확인 (필수)

1. 자동화 메일 템플릿 본문에 "답변이 달렸어요 {{ customerTicketLink }}"를 넣고, 받는 사람에 `{{ customers.email }}`와 담당자(`{{ assignedUserIds }}`)를 둔다.
2. 고객이 있는 티켓에서 "Send Email"을 누른다.
   - 고객 메일: "티켓 열기" 링크가 있다. 누르면 `/ticket-view`가 열리고 티켓 내용이 보인다. 댓글을 달면 직원 화면에 그 고객 이름으로 보인다.
   - 담당 직원 메일: 링크 자리가 비어 있다(빈 버튼 없음).
3. 관리 화면 메일 발송 기록에서 그 메일 본문을 열어 `ticket-view#`가 없는지 본다.
4. 티켓에서 그 고객을 빼고 5분 뒤 링크 탭을 새로 고친다 → 만료 안내(새 문구). 댓글 보내기도 막힌다.
5. DB에서 메일 링크의 `createdAt`/`expiresAt`을 15일 전으로 옮겨 열면 만료 안내.
6. 위젯 "새 탭에서 보기" 링크: 새로 받은 링크의 만료가 2일 뒤인지(`expiresAt`), 기존처럼 열리고 댓글이 되는지.
7. 템플릿에 칸이 없는 다른 자동화 메일은 전과 같이 가는지(본문 동일, tickets RPC 호출 없음).
