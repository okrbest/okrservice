# Research: 자동화 메일에 고객용 티켓 바로 열기 링크

## R1. 링크를 어디서 바꿀까 — 받는 사람마다(sendEmails)
- **Decision**: automations-api `sendEmails`의 받는 사람 반복(`for (const toEmail of toEmails)`) 안에서 그 사람 몫으로 바꾼다.
- **Rationale**: 메일은 받는 사람마다 한 통씩 나간다. 자리표시자 바꾸기(`generateDoc` → tickets `replacePlaceHolders`)는 티켓 전체에 한 번이라 받는 사람을 모른다.
  `replacePlaceHolders`는 모르는 이름을 그대로 남기므로(빌더 확인) `{{ customerTicketLink }}`는 sendEmails까지 살아 온다.
- **Alternatives**: 티켓에 링크 하나(2안, 사용자 기각 — 댓글 작성자가 틀어짐).

## R2. 링크 모양 — `<a>` 태그째, 없으면 빈 문자열
- **Decision**: `<a href="URL" style="…">티켓 열기</a>`로 바꾼다. 못 받으면 `''`.
- **Rationale**: 사용자 결정(b). 빈 버튼·빈 문장이 남지 않는다. 템플릿 편집기가 href 안의 `{{ }}`를 `%7B%7B`로 바꿀 수 있어 주소만 넣는 방식은 지원하지 않는다 —
  `%7B%7B%20customerTicketLink%20%7D%7D` 형태도 찾아 빈 값으로 바꾼다(고객 아닌 사람에게 남지 않게).
- 칸 이름 매칭은 공백 허용 `\{\{\s*customerTicketLink\s*\}\}`.

## R3. 메일용 열쇠 — 기존 열쇠에 kind 추가
- **Decision**: `ticket_view_links`에 `kind: 'email'`(없으면 위젯). 메일용은 `expiresAt = 발급 + 14일` 고정, 사용해도 연장 안 함, 7일 최대 제한 미적용,
  고객당 1분 발급 제한 미적용(서버만 발급), 같은 티켓·고객 메일 링크 최근 20개 유지(위젯 5개와 따로).
- **Rationale**: `/ticket-view`·inbox-api 상세·댓글 경로를 그대로 쓰려면 같은 열쇠 체계여야 한다. TTL 인덱스(expiresAt)가 그대로 정리한다.
- 위젯 쪽 1분 발급 제한·5개 상한 집계에서 메일 링크를 빼야 위젯 버튼이 메일 발송 때문에 막히지 않는다(`kind: { $ne: 'email' }`).

## R4. 열 때 권한 재확인 — 메일 링크만, 5분 주기
- **Decision**: `useTicketViewLink`에서 메일 링크이고 `checkedAt`이 5분보다 오래됐으면 발급 때와 같은 판단(`canCustomerViewTicket`)을 다시 하고,
  통과하면 `checkedAt` 갱신, 실패하면 `TICKET_VIEW_LINK_EXPIRED`(만료와 같은 안내).
- **Rationale**: 사용자 결정. 14일 고정이라 권한이 빠진 뒤에도 열리는 빈틈이 길다. 판단 로직은 `createTicketViewLink`에서 함수로 빼 발급·재확인이 공유한다.
  티켓 고객 목록에 바로 있으면 core 조회 없이 끝난다.
- 실패한 링크는 그때 폐기(`revokedAt`)해 이후 요청은 core를 다시 부르지 않는다.

## R5. 직원 계정 제외
- **Decision**: 받는 주소로 core `users.findOne({ email })`이 찾아지면 발급하지 않는다(본문에 칸이 있을 때만 조회).
- **Rationale**: 사용자 결정. `customerMapByEmail`은 직원 주소도 고객 기록으로 찾아 넣을 수 있다(빌더 확인).

## R6. 위젯 공개 주소 — WIDGETS_DOMAIN
- **Decision**: automations-api에서 `WIDGETS_DOMAIN`을 읽어 `${WIDGETS_DOMAIN}/ticket-view#${token}`. 없으면 링크 없음(빈 값).
- **Rationale**: gateway·core·inbox-api가 이미 같은 이름을 쓴다. 위젯 쪽 `buildTicketViewUrl`과 같은 모양(열쇠는 # 뒤 — 서버 기록·Referer에 안 실림).
- 배포 시 automations-api 환경에 `WIDGETS_DOMAIN`을 추가해야 한다(quickstart에 기록).

## R7. 발송 기록·로그에 열쇠 남기지 않기
- **Decision**: `emailDeliveries.create`의 `body`는 바꾸기 전 `customHtml`(칸 그대로). 바꾼 본문은 `mailOptions.html`에만. 새 코드에서 본문·열쇠 로그 금지.

## R8. 발급 RPC
- **Decision**: `tickets:ticketView.createEmailLink` `{ ticketId, customerId }` → `{ token } | null`. 권한 없음·티켓 없음·보관 티켓도 `null`(오류 아님).
- **Rationale**: 메일 발송이 멈추면 안 된다(FR-008). automations-api 쪽에서도 호출 실패는 잡아 빈 값으로.
- 보관된 티켓: 위젯과 같이 상세 조회가 막히므로 발급하지 않는다.

## R9. 위젯 링크 2일
- **Decision**: `TICKET_VIEW_LINK_TTL_MS` = 2일. 위젯 쪽은 서버가 준 `expiresAt` 기준으로 1시간 전에 새로 받으므로 코드 변경 없음(주석만).

## R10. 테스트
- **Decision**: tickets-api `ticketViewLink.ts`(규칙), automations-api `customerTicketLink.ts`(본문 바꾸기)를 순수 함수로 두고 단위 테스트.
  권한 재확인 흐름은 `ticketViewRpc.ts`의 함수를 가짜 models/sendCore로 테스트(기존 widgetTicketEdit.test.ts 방식).
