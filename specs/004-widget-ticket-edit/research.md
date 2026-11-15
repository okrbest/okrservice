# Research: 위젯 티켓 접수 후 수정

## R1. "수정 가능 여부"를 누가 판단하나

- **Decision**: 서버가 판단한다. 새 조회 `widgetsTicketEditState(customerId, ticketId)`가 `canEdit`(버튼 표시)·`canEditContent`(요청 구분·설명·첨부 편집 가능)와 수정 화면에 채울 현재 값을 돌려준다. 저장(`widgetsTicketEdit`)도 같은 판단 함수를 다시 거친다.
- **Rationale**: 위젯 목록 응답(`widgets.ticketList.find`)에는 "내 티켓" 표시가 없고(회사 티켓 보기에서는 동료 티켓이 섞임), 단계 순서·`visibility`도 내려오지 않는다. 목록 핸들러는 같은 코드가 3벌 등록돼 있어 필드를 늘리면 3곳을 고쳐야 한다. 별도 조회는 진행 상황 화면에서만 부르므로 목록 성능에 영향이 없다.
- **Alternatives**: 목록 응답에 `isMine`·`isFirstStage` 추가 — 3중 핸들러 수정 + 캐시된 목록의 단계가 낡을 수 있어 기각.

## R2. 접수자 본인 판정

- **Decision**: `ticket.customerIds`에 `customerId`가 있거나, `conformities.savedConformity(mainType: ticket, relTypes: [customer])` 결과에 있으면 본인. 회사(company) 연결은 보지 않는다.
- **Rationale**: 위젯 목록이 "내 티켓"으로 보여 주는 연결(`customerIds` 또는 고객 conformity)과 같다. 목록은 `customerIds`가 다른 고객이어도 conformity로 연결된 티켓을 보여 줄 수 있어, "customerIds가 있으면 그것만" 규칙은 목록에 보이는 내 티켓에서 버튼이 빠지는 경우를 만든다(구현 중 확인 후 수정). `createTicketViewLink`의 `canIssueLink`는 회사 공개 티켓도 허용하므로 그대로 쓰면 동료 수정이 열린다 — 쓰지 않는다.
- **신뢰 수준**: `customerId`는 위젯이 보내는 값을 믿는다(댓글 등록과 같은 수준, spec Assumptions).

## R3. 첫 단계 판정

- **Decision**: 티켓 `stageId`의 `pipelineId`로 단계 목록을 받아 `status !== 'archived'`인 단계를 `order` 오름차순 정렬했을 때 맨 앞 단계면 첫 단계.
- **Rationale**: 위젯 단계 막대(`progressHelpers.progressSteps`)와 같은 규칙이라 고객이 보는 "첫 칸"과 일치한다.

## R4. 보관 티켓

- **Decision**: `ticket.status === 'archived'`이면 `canEdit = false`, 저장 거절. (`ticketViewRpc.isOpenTicket`과 같은 기준)

## R5. 설명 왕복(HTML ↔ 입력칸)

- **Decision**:
  - 수정 화면은 저장된 HTML을 입력칸용 글로 바꿔 보여 준다: `</p>`·`<br>` → 줄바꿈, 나머지 태그 제거, 기본 HTML 엔티티 복원.
  - **고객이 설명을 바꾼 경우에만** 설명을 보낸다(처음 채운 글과 비교).
  - 서버는 접수(`widgets.createTicket`)와 같은 규칙(태그가 없으면 줄마다 `<p>`)으로 저장한다. 같은 규칙을 새 순수 함수로 두고, 접수 경로는 건드리지 않는다(최소 범위 — 통합은 후속 제안).
- **Rationale**: 첫 단계에서도 직원이 설명에 서식·이미지를 넣었을 수 있다. 고객이 설명을 건드리지 않으면 원본 HTML이 그대로 남는다. 건드리면 글만 남는 손실이 있으나 고객이 보는 입력칸 그대로 저장되는 것이라 받아들인다.
- **동시 편집**: 직원 화면은 설명 지문(`descriptionConflict.hasDescriptionConflict`)으로 저장 충돌을 막는다. 고객이 설명을 바꾸면 지문이 달라져 직원의 낡은 저장은 기존 충돌 안내로 걸린다 — 추가 작업 없음.

## R6. 첨부파일

- **Decision**:
  - 수정 화면은 기존 첨부를 파일 칩으로 보여 주고 빼기·추가를 허용한다(`useAttachUpload` 재사용).
  - 새로 올린 파일은 **저장 키**로 보낸다(댓글 경로와 같은 규칙. 접수 경로는 `readFile()`로 전체 주소를 저장하던 예전 방식).
  - 서버 검증: 각 첨부는 (a) 지금 티켓 첨부에 같은 `url`로 이미 있거나 (b) 저장 키(`isStorageKey`)여야 한다. 개수 상한은 댓글과 같은 값(`TICKET_VIEW_COMMENT_MAX_ATTACHMENTS`)을 쓴다.
- **Rationale**: 외부 주소를 첨부로 끼워 넣는 것을 막고, 예전 접수 첨부(전체 주소)는 그대로 유지한다. `readFile()`은 키·주소 모두 처리한다.

## R7. 저장 방식과 부수 효과

- **Decision**: tickets-api RPC에서 `models.Tickets.updateOne({_id}, {$set: {...바뀐 필드, modifiedAt: new Date()}})`. 직원용 `itemsEdit`는 쓰지 않는다. 저장 뒤 `ticketsPipelinesChanged:{pipelineId}`를 `{ _id: pipelineId }`로 발행해 열려 있는 직원 보드가 새로 그리게 한다.
- **Rationale**: `itemsEdit`는 직원 편집용이라 설명이 바뀌면 `widgetAlarm=false`·고객 메일 자동 발송 예약·자동화 트리거가 돈다 — 고객 본인 수정에는 맞지 않는다(spec: 담당자 알림 없음).
- `type`이 바뀌면 `requestType`도 같이 바꾼다(접수 시 `requestType = type` 규칙과 동일).

## R8. 활동 기록

- **Decision**: 값이 실제로 바뀐 경우에만 `putActivityLog(subdomain, { action: 'customerEdit', data: { contentType: 'ticket', contentId, action: 'customerEdit', createdBy: customerId, content: { changedFields } } })`. core `putActivityLog` 소비자는 모르는 action도 `addActivityLog`로 저장한다.
- 직원 화면(`plugin-tickets-ui/src/activityLogs/activityLog.tsx`)은 모르는 action을 빈칸으로 그리므로 `customerEdit` 분기 + 작은 표시 부품을 추가한다: "고객이 티켓을 수정했습니다 — 바뀐 항목: 설명, 첨부파일".
- 위젯 대화 타임라인(`progressHelpers.SHOWN_EVENTS`)에는 넣지 않는다(고객 본인 행동이라 표시 불필요).

## R9. 오류 코드

| 코드 | 언제 | 위젯 안내 |
|---|---|---|
| `TICKET_EDIT_NOT_ALLOWED` | 본인 아님·방문자·티켓 없음·보관 | "이 티켓은 수정할 수 없어요." |
| `TICKET_EDIT_STAGE_LOCKED` | 첫 단계가 아닌데 공개 설정 외 항목 변경 | "이미 처리가 시작되어 공개 설정만 바꿀 수 있어요." |
| `TICKET_EDIT_INVALID_INPUT` | 설명 비움·허용되지 않은 첨부·잘못된 값 | "입력한 내용을 확인해 주세요." |

실패 시 수정 화면과 입력값은 그대로 둔다. `STAGE_LOCKED`를 받으면 수정 상태를 다시 조회해 화면을 "공개 설정만" 모드로 바꾼다(쓴 글은 유지).

## R10. 화면 구성

- **Decision**: 새 라우트 `ticket-edit` + `TicketEditContainer`. 표시 부품은 `TicketSubmitForm`에 수정 모드 props(`mode="edit"`, `contentLocked`, `lockedNotice`)를 더해 재사용한다. 수정 모드에서는 제목 입력칸을 읽기 전용, 연락처 영역 숨김, 버튼 문구 "저장하기", 뒤로 가기는 `ticket-progress`.
- 진행 상황 상단 카드(`TicketProgressHero`)에 `edit?: { onClick }` prop을 추가해 번호·상태 줄에 "수정" 버튼을 그린다(새 탭 화면은 prop을 넘기지 않아 버튼 없음).
- 저장 성공 시 `setTicketData({...ticketData, ...수정된 티켓})`로 진행 상황 화면을 바로 갱신하고 `ticket-progress`로 돌아간다. 목록은 기존 `cache-and-network`로 돌아올 때 새로 받는다.

## R11. 조회 정책(성능)

- 진행 상황 화면의 `widgetsTicketEditState`: `cache-and-network`(같은 화면의 댓글·기록 조회와 동일). 버튼 표시가 조금 늦게 떠도 저장은 서버가 다시 판단한다.
- 수정 화면 진입 시 같은 조회를 `network-only`로 한 번 — 최신 값으로 채우기 위해.
- 목록·단계 조회 정책은 바꾸지 않는다(cache-first 단계 조회 유지).

## R12. 테스트 환경

- tickets-api·inbox-api에는 자체 jest가 없고 `widgets`의 jest를 `--config`로 빌려 쓴다(기존 `test/ticketViewLink.test.ts` 머리 주석 참고).
- 순수 함수(본인·첫 단계 판정, 변경 항목 계산, 첨부 검증, 설명 변환)는 단위 테스트, 화면은 실제 위젯 구동으로 확인한다.
