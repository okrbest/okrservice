# Quickstart: 위젯 티켓 수정 검증

## 준비

- 로컬 erxes(gateway, core, inbox-api, tickets-api)와 위젯 개발 서버 구동, 티켓 탭이 켜진 메신저 연동.
- 위젯에서 고객 A로 연결(연락처 입력), 같은 회사의 고객 B 하나 더.
- 직원 화면에서 해당 티켓 파이프라인의 첫 단계 이름을 확인.

## 단위 테스트

```bash
# tickets-api 판정·변경 계산
cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/widgetTicketEdit.test.ts"]}'

# inbox-api 입력 검증
cd widgets && npx jest --config '{"rootDir":"../packages/plugin-inbox-api","testEnvironment":"node","transform":{"^.+\\.tsx?$":["<rootDir>/../../widgets/node_modules/ts-jest",{"tsconfig":{"esModuleInterop":true,"target":"es2019"},"diagnostics":false}]},"testMatch":["<rootDir>/test/widgetTicketEdit.test.ts"]}'

# 위젯 도우미(설명 변환·변경 항목)
cd widgets && npx jest client/messenger/components/ticket/__tests__/editHelpers.test.ts
```

## 실제 구동 시나리오 (spec 수락 시나리오 대응)

| # | 절차 | 기대 결과 |
|---|---|---|
| 1 | A가 티켓 접수 → 목록에서 열기 | 상단 카드에 "수정" 버튼 (US1-1) |
| 2 | 수정 → 화면 확인 | 값이 채워져 있고 제목은 읽기 전용, 연락처 칸 없음 (US1-2) |
| 3 | 설명·요청 구분 변경 후 저장 | 진행 상황으로 돌아오고 바뀐 값 표시, 직원 화면에도 반영 (US1-3) |
| 4 | 첨부 하나 빼고 하나 추가 후 저장 | 첨부 목록 반영 (US1-4) |
| 5 | 저장 없이 뒤로 | 변화 없음 (US1-6) |
| 6 | 직원이 다음 단계로 이동 → A가 다시 열고 수정 | 버튼 보임, 공개 설정만 편집 가능 + 안내 (US2-1, 2) |
| 7 | 6에서 "나만 보기"로 저장 | 반영, B의 회사 티켓 목록에서 사라짐 (US2-3, US1-5) |
| 8 | 첫 단계에서 수정 화면 연 채로 직원이 단계 이동 → 설명 바꿔 저장 | 거절 안내, 쓴 글 유지, 화면이 공개 설정만 모드로 (US3-2) |
| 9 | B가 회사 티켓에서 A의 공개 티켓 열기 | 버튼 없음 (US3-1) |
| 10 | 브라우저 콘솔/GraphQL로 B의 customerId로 A 티켓 수정 요청, 2단계 티켓에 description 요청 | 각각 `TICKET_EDIT_NOT_ALLOWED`, `TICKET_EDIT_STAGE_LOCKED` (US3-3, 4) |
| 11 | 직원 화면 활동 기록 | "고객이 수정함 — 바뀐 항목" 표시, 값 변화 없는 저장은 기록 없음 (US4) |
| 12 | 새 탭에서 보기 | 수정 버튼 없음 (FR-013) |
