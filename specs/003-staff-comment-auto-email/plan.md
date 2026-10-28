# Implementation Plan: 직원 댓글 뒤 고객 알림 메일 자동 발송

**Branch**: `feature/skill-modify-hrchat-merge` (spec 폴더 `003-staff-comment-auto-email`) | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

## Summary

직원 위젯 댓글이 저장될 때 티켓에 `autoEmailDueAt = 지금 + 10분`을 적는다(덮어쓰기라 마지막 댓글 기준). tickets-api가 1분마다 예정 시각이 지난 티켓을 하나씩 **원자적으로 가져가며 지우고**(findOneAndUpdate + $unset), "Send Email" 버튼과 같은 자동화 트리거를 보낸다. `emailSent`는 건드리지 않아 버튼은 켜진 채 남는다. 직원이 버튼을 직접 누르면 기존 흐름에서 `autoEmailDueAt`도 지운다. 화면·서버 API·다른 흐름은 그대로.

## Technical Context

**Language/Version**: TypeScript(Node), plugin-tickets-api

**Primary Dependencies**: mongoose(티켓 모델), `@erxes/api-utils` sendMessage(automations 트리거)

**Storage**: MongoDB `tickets` 컬렉션에 필드 1개(`autoEmailDueAt: Date`, 기본 없음) + 희소(sparse) 색인 1개

**Testing**: tickets-api 자체 jest 없음 → widgets jest를 `rootDir` 지정으로 실행(기존 `packages/plugin-tickets-api/test/*.test.ts` 방식). 실동작은 로컬 pm2 tickets-api·automations-api로 확인

**Target Platform**: tickets-api 서버(VERSION=os, 단일 테넌트)

**Performance Goals**: 1분마다 `{ autoEmailDueAt: { $lte: now } }` 색인 조회 1회 — 대상 없으면 즉시 끝(목표 50ms 미만, SC-005)

**Constraints**: 중복 발송 0(서버 재시작·여러 대), 기존 고객 댓글·수동 발송 흐름 불변, 실제 고객에게 시험 메일 보내지 않기(로컬 확인은 이메일 없는 테스트 티켓으로)

## Research 요약 (결정)

| 주제 | 결정 | 근거 / 버린 안 |
|---|---|---|
| 예약 저장 | 티켓에 `autoEmailDueAt` | 서버 재시작에도 남음. 메모리 타이머(setTimeout)만 쓰면 재시작 때 사라짐 |
| 확인 주체 | tickets-api 안에서 `setInterval` 60초(onServerInit에서 시작) | 플랫폼 `crons` 서비스는 로컬 구성에 없고 운영 배포 여부 미확인. 자동화 "기다리기"는 automations의 cronjobs가 꺼져 있어(`plugin-automations-api/src/configs.ts`) 다시 이어지지 않음 |
| 중복 방지 | `findOneAndUpdate({autoEmailDueAt ≤ now}, {$unset})`로 한 건씩 가져가기 | 가져간 서버만 보냄 → 여러 대여도 1통. 보내기 전에 지우므로 실패해도 반복 안 함(FR-008) |
| 메일 보내기 | 수동 버튼과 같은 트리거(`type: tickets:ticket`, target에 `manualEmailRequest: true`, `triggerSource: manualEmailRequest`) | 자동화 세그먼트는 트리거 때 넘긴 객체(`targetObject`)로 조건을 본다(`core/.../segments/queryBuilder.ts:114`). DB 값을 바꿀 필요 없음. receiveTrigger는 수동 트리거를 재등록 검사 없이 실행(`plugin-automations-api/src/utils.ts:580`) |
| 버튼 상태 | 자동 발송은 `emailSent`·`manualEmailRequest`를 바꾸지 않음 | FR-005(자동 발송 뒤 버튼 켜짐) |
| 직접 발송 시 취소 | 수동 흐름의 마지막 `updateOne`에 `$unset: { autoEmailDueAt }` 추가 | FR-004 |
| 보관 티켓 | 가져간 뒤 `status === 'archived'`면 보내지 않음(이미 지워짐) | FR-006. 삭제된 티켓은 조회되지 않음 |
| 테넌트 | VERSION이 `saas`가 아니면 subdomain `'os'`로 시작, `saas`면 시작하지 않음(로그 1줄) | 이 배포는 os. saas는 범위 밖 |

## Constitution Check

| 원칙 | 판단 |
|---|---|
| I. 최소 범위 | 통과 — 티켓 필드 1개, 댓글 처리 1곳, 수동 발송 1곳, 새 모듈 1개, 시작 1줄 |
| II. 스펙 비례 | 통과 — 다중 파일·스키마 변경이라 specify → plan → tasks → implement |
| III. 실동작 검증 | 통과(계획) — 로컬 tickets-api에서 댓글 → 예약 저장 → 시각 당김 → 트리거·자동화 실행 기록 확인 |
| IV. 성능 회귀 금지 | 통과 — 색인 조회 1회/분, 화면 질의 변화 없음. 실제 조회 시간 측정 |
| V. 커밋 규칙 | 통과(계획) — `feat(tickets): …`, 요청 시에만 커밋 |

## Project Structure

```text
packages/plugin-tickets-api/
├── src/models/definitions/tickets.ts     # autoEmailDueAt 필드
├── src/models/Tickets.ts                 # 희소 색인 { autoEmailDueAt: 1 }
├── src/autoCustomerEmail.ts              # 새: 예약 계산·가져가기·트리거·스케줄러
├── src/messageBroker.ts                  # 직원 위젯 댓글 분기에서 예약 저장
├── src/graphql/resolvers/mutations/utils.ts  # 수동 발송 뒤 예약 지우기
├── src/configs.ts                        # onServerInit에서 스케줄러 시작
└── test/autoCustomerEmail.test.ts        # 새: 순수 로직 테스트(가짜 모델·가짜 전송)
```

## 확인 방법 (quickstart)

1. 단위 테스트: `cd widgets && npx jest --config '{"rootDir":"../packages/plugin-tickets-api",...,"testMatch":["<rootDir>/test/autoCustomerEmail.test.ts"]}'`
2. 타입: tickets-api `tsc --noEmit` 기존 오류 수와 비교
3. 실동작(로컬, 실제 메일 없음): 고객 이메일이 없는 테스트 티켓에 `widgetsTicketCommentAdd(userType: "team")` → DB `autoEmailDueAt ≈ 지금+10분` 확인 → 두 번째 댓글로 시각이 미뤄지는지 확인 → 시각을 과거로 당김 → 1분 안에 필드가 지워지고 tickets-api 로그에 트리거 전송, automations 실행 기록 생성, `emailSent` 그대로 확인
4. 성능: 확인 조회 `explain`/소요 시간 측정

## 코드 리뷰 반영(2026-10-28)

- 티켓 복사(itemsCopy) 때 `autoEmailDueAt`을 지워 복사본이 메일을 한 통 더 보내지 않게 함(FR-011).
- 전송 계층 오류(메시지 서버 끊김 등)면 그 예약을 다음 확인 때로 되돌리고(더 최신 예약이 있으면 덮지 않음) 이번 확인을 멈춤 — 끊긴 동안 예약을 잃지 않음.
- 직접 발송은 트리거 전에 예약부터 지움(스케줄러와 겹쳐 두 통 가는 틈을 줄임).
- 확인 작업 겹침 방지(running 표시), VERSION 판단을 `createGenerateModels`와 같게(비어 있거나 saas면 시작 안 함), 함수 이름 `computeAutoEmailDueAt`.
- 반영 안 함(보고만): MongoDB 4.0 복제본 장애 전환 때 쓰기 롤백으로 인한 중복(극히 드묾, `w: majority`는 단독 DB 구성에서 문제 소지), 공개 위젯 API가 클라이언트의 `userType`을 그대로 믿는 기존 보안 문제(별도 작업 제안).
