# Contracts: 자동화 메일에 고객용 티켓 바로 열기 링크

## 1. 메일 템플릿 자리표시자

- 이름: `customerTicketLink` (템플릿에 `{{ customerTicketLink }}`, 공백 허용)
- 템플릿 칸 목록(tickets `fieldUtils` 자동화 속성)에 `{ name: 'customerTicketLink', label: 'Customer ticket link', type: 'String' }` 추가
- 받는 주소가 그 고객의 **대표 메일(primaryEmail, 대소문자 무시)**과 같을 때만 그 고객 몫으로 만든다. 직원 판정은 소문자 주소로 core `users.findOne({ email })`.
- 제목(subject)의 칸은 비운다. 다른 태그 속성 값 안의 칸도 비운다. 링크 태그에는 `ses:no-track`(SES 클릭 추적 제외).
- 바뀌는 값(받는 사람마다)
  - 발급되면: 티켓 카드(표·인라인 스타일) — 티켓 번호, 제목, "현재 단계 · {단계}" 배지, `<a ses:no-track href="{WIDGETS_DOMAIN}/ticket-view#{token}">티켓 열고 답변 보기</a>` 버튼, "로그인 없이 바로 열려요. 이 버튼은 {만료일}까지 쓸 수 있어요."(한국 시간)
  - 그 밖(직원 계정·고객 아님·권한 없음·티켓 아닌 자동화·설정 없음·발급 실패): `''`
- `href` 안에 넣어 인코딩된 형태(`%7B%7B%20customerTicketLink%20%7D%7D`)도 `''`로 바꾼다(지원하지 않는 사용).
- 발송 기록(`emailDeliveries`) 본문에는 바꾸기 전 원본을 저장한다.

## 2. RPC — tickets:ticketView.createEmailLink (신규)

- 호출: automations-api → tickets-api (`sendCommonMessage({ serviceName: 'tickets', action: 'ticketView.createEmailLink', isRPC: true, defaultValue: null })`)
- 요청: `{ ticketId: string, customerId: string }`
- 응답: `{ token: string, expiresAt: Date, ticket: { number, name, stageName } }` 또는 `null` (ticket은 카드에 보여 줄 요약)
  - `null`: 티켓 없음, 보관된 티켓, 고객이 그 티켓을 볼 수 없음(`canCustomerViewTicket` 실패)
  - 오류를 던지지 않는다(DB 오류 등 예외만 RPC 오류로 전달 — 호출 쪽이 잡아 빈 값 처리)
- 효과: `ticket_view_links`에 `kind: 'email'`, `expiresAt = now + 14일`, `checkedAt = now` 문서 생성, 같은 티켓·고객 메일 링크 20개 초과분 폐기

## 3. 기존 RPC 동작 변경 — tickets:widgets.ticketViewLink.use

- 메일 링크(`kind: 'email'`)일 때
  - 만료를 연장하지 않는다(`lastUsedAt`만 5분 주기로 기록해도 됨).
  - `checkedAt`이 5분보다 오래됐으면 권한을 다시 판단한다. 통과하면 `checkedAt` 갱신, 실패하면 `TICKET_VIEW_LINK_EXPIRED`만 던진다(폐기·확인 시각 갱신 없음 — core 일시 장애로 거부된 경우 다음 요청에서 다시 판단). 위젯 화면은 기존대로 만료 안내.
- 위젯 링크: 연장 기간만 2일로(그 외 동일).

## 4. tickets:widgets.ticketViewLink.create (위젯, 기존)

- 고객당 1분 발급 수·같은 티켓·고객 상한 5개 계산에서 메일 링크(`kind: 'email'`)를 뺀다. 응답 형식 동일.

## 5. 위젯 만료 안내 문구

- 기본(영문): "The link has expired. Please open the link in your latest email, or press 'Open in new tab' again in the widget."
- 한국어: "링크가 만료됐어요. 최근 받은 메일의 링크를 누르거나, 위젯에서 '새 탭에서 보기'를 다시 눌러 주세요."
- 일본어: 같은 뜻으로 번역
