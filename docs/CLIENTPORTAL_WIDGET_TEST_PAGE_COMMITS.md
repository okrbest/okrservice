# 클라이언트 포털 위젯 테스트 페이지 동작에 필요한 커밋

테스트 URL 예: `http://127.0.0.1:3200/static/clientportal-widget-test.html`  
(`widgets` 개발 서버가 `PORT=3200` 등으로 떠 있고, `yarn dev` / 번들 빌드가 가능한 상태를 가정)

## 비교 기준

- 이 저장소에는 원격 기본 브랜치로 **`origin/master`** 가 있습니다. (`main` 브랜치 없음)
- 분석 시점의 기능 브랜치: **`feature/mobile`**
- 아래 목록은 **`origin/master..feature/mobile`** 구간에서, 아래 경로에 변경이 있는 커밋만 **위상 정렬(`--topo-order`)** 로 나열한 것입니다.

포함 경로:

- `widgets/client/clientportal/**`
- `widgets/server/index.ts`, `widgets/server/views/widget-clientportal-test.ejs`
- `widgets/public/clientportal-widget-test.html`
- `widgets/webpack.config.js`
- `packages/plugin-clientportal-api/**`
- `packages/gateway/src/**`
- `packages/plugin-notifications-api/**`

## 필수 커밋 (위에서부터 순서대로 적용)

Cherry-pick 시에는 **이 순서(오래된 것 → 최신)** 를 유지하는 것이 안전합니다.

| # | 커밋 ID | 제목 (한 줄) |
|---|---------|----------------|
| 1 | `2700ac93acc179bc9d332dea1549e876a3874f7e` | feat(mobile): 토큰 추출 및 검증 개선으로 인증 흐름 강화 *(clientportal User/유틸)* |
| 2 | `a0d57a97c561ef8d854a6ae797592cb1313f813c` | feat(clientportal): 티켓 보드/파이프라인/스테이지 쿼리 스키마 추가 |
| 3 | `4ba08d36f13bfd16f8c6a3c1e2ceea5d3a10a604` | fix(clientportal): getCards에 staff 분기 추가 |
| 4 | `a5fd08d4d53109a2015442d27761c114eb685bae` | feat(clientportal): 티켓 보드/파이프라인/스테이지 resolver 구현 |
| 5 | `dce051935413a0b310feddfffd8d84d33430386d` | fix(clientportal): showAll=true일 때 assignedUserIds 필터 무시 |
| 6 | `c97306c3c24175503308f235fc7d1a907fd0450b` | feat(notifications): notifications:find RPC sort/limit/skip |
| 7 | `4041dfd384088deca7ad449c4251ca3820be6ec2` | feat(notifications): 알림 insert 후 직원 FCM 발송 |
| 8 | `b738687636dcce1f649ed8dc7ef94471539960b8` | feat(clientportal): 직원 모바일 FCM consumer |
| 9 | `9155a0c2d4e708efc20d3d4a9a4ff2f4e319d4d8` | feat(clientportal): StaffNotificationItem 스키마 |
| 10 | `c66e1e75aed32fd40c3ab285bce14163d0a0ebd7` | feat(clientportal): 알림 목록·읽음 처리 resolver |
| 11 | `5b68af75a0ac02aa5ed1e19499ec43e181b47f8b` | feat(clientportal): Resolved 스테이지 서버 필터 |
| 12 | `b66daf83d8b2efefd476c0d64f5aa41a8ac5c701` | feat(clientportal): 티켓 연락처·댓글·담당자 RPC |
| 13 | `dffe28b8fd666bf74f5833882ad553d7092564ac` | fix(gateway): import 경로·플러그인 다운로드 안정화 |
| 14 | `6c3fea6f6797adbcfc1ae0278202abea69fbc821` | feat: 직원 티켓 댓글 → 고객 푸시·comment resolver *(모바일 파일 포함 — cherry-pick 시 충돌 가능)* |
| 15 | `bb6561b78609f6368ea135c68cf913d47c97fd60` | fix(clientportal): 티켓 고객 전체에 푸시 |
| 16 | `3376cc8326ff7b158bea4d3611dc15b774d99837` | fix(notifications): 티켓 댓글 고객 푸시 보강 |
| 17 | `8684ca45a49e99c3fcd761ec7bc3f89098b39ce1` | feat(notifications): 알림 삭제·티켓 알림 처리 개선 |
| 18 | `a8d1099f48e9de85106afa880c2ebd15aa3afa01` | feat(clientportal): WorkSchedule 모델 |
| 19 | `e14f7a39851dad6f8b2b3399df863604eb5b8d1a` | fix(clientportal): WorkSchedule import/deeplinkParams |
| 20 | `4697a08870838f0a1b6766bd9fab8d4857101376` | feat(clientportal): WorkSchedule GraphQL |
| 21 | `56a1148a059998d4025075a102351baa6e0220fe` | fix(clientportal): workSchedule query resolver |
| 22 | `90090524e0299f746510233a67c38feca8df9f53` | feat(clientportal): 출근 푸시 스케줄러 추가 |
| 23 | `b9ce6a7356cc9622d6f084fbb5adfcdacd28993b` | fix(clientportal): WorkSchedule 중복 쿼리 정리 |
| 24 | `aa7135105a449b6de47a59947b3f44dbe3fcb195` | feat(widget): clientportal webpack entry |
| 25 | `e591998f6222c60e9111b56f7924cc6318eb6445` | feat(widget): clientportal graphql queries |
| 26 | `673d3e41a15d7131aaac81fe13a39686881c0917` | feat(widget): apollo client factory |
| 27 | `f86b6d08b58635931baf71e71b3ac040dba999f9` | feat(widget): useAttendanceRecord |
| 28 | `e5edd3a401f07a49eb15059a67a2aa43766a785f` | fix(widget): useAttendanceRecord setRecord |
| 29 | `5a31ae24e324cd1d101dc36aad17c143af6dc176` | feat(widget): AttendanceCard |
| 30 | `cd7b20f3d37f46820c3aff2e7e2ba214088a98b5` | test(widget): AttendanceCard 테스트 **(런타임에는 불필요·생략 가능)** |
| 31 | `23f0b9d632105aed3f98f97924345a4b4033ca7e` | feat(widget): useMessages |
| 32 | `c3042955e24782704bc3411cf8b496c1ac2711ce` | feat(widget): useCustomerNotifications |
| 33 | `ba0495c523cab1544cb2a2a0306a22314dcfc67a` | feat(widget): ChatTab |
| 34 | `850a0ad23cff36a3af45cb531cf5643387270d5c` | feat(widget): NotificationsTab |
| 35 | `e2729712322c9e2814d8fc593121317dede0d2f2` | feat(widget): 2탭 App 컨테이너 |
| 36 | `890add9df9ad869bd1e8f69173e1d8b9ef3e50e5` | feat(widget): clientportal entry + postMessage |
| 37 | `385c0e15957c6cf57882e2cd41d517da986cac08` | feat(widget): /clientportal 라우트 |
| 38 | `1f73d086c203d7988b4d9332cf4444b42a694ee8` | feat(widget): 티켓 UI + **`clientportal-widget-test.html`** · 서버 라우트 · `widget-clientportal-test.ejs` |
| 39 | `805155176f2ff375ae9e3a4d6f3ef8fcf6d5e574` | feat(clientportal): 클라이언트 포털 로그인 개선 |
| 40 | `dd444e8453c219e0e9fe813018b4e268add4f018` | refactor(clientportal): 출근 스케줄러 비활성화 |

**총 40개** (위 표의 #30 테스트 커밋을 빼면 **런타임 기준 39개**)

## 한 줄로 목록 복사 (cherry-pick 용)

```text
2700ac93acc179bc9d332dea1549e876a3874f7e
a0d57a97c561ef8d854a6ae797592cb1313f813c
4ba08d36f13bfd16f8c6a3c1e2ceea5d3a10a604
a5fd08d4d53109a2015442d27761c114eb685bae
dce051935413a0b310feddfffd8d84d33430386d
c97306c3c24175503308f235fc7d1a907fd0450b
4041dfd384088deca7ad449c4251ca3820be6ec2
b738687636dcce1f649ed8dc7ef94471539960b8
9155a0c2d4e708efc20d3d4a9a4ff2f4e319d4d8
c66e1e75aed32fd40c3ab285bce14163d0a0ebd7
5b68af75a0ac02aa5ed1e19499ec43e181b47f8b
b66daf83d8b2efefd476c0d64f5aa41a8ac5c701
dffe28b8fd666bf74f5833882ad553d7092564ac
6c3fea6f6797adbcfc1ae0278202abea69fbc821
bb6561b78609f6368ea135c68cf913d47c97fd60
3376cc8326ff7b158bea4d3611dc15b774d99837
8684ca45a49e99c3fcd761ec7bc3f89098b39ce1
a8d1099f48e9de85106afa880c2ebd15aa3afa01
e14f7a39851dad6f8b2b3399df863604eb5b8d1a
4697a08870838f0a1b6766bd9fab8d4857101376
56a1148a059998d4025075a102351baa6e0220fe
90090524e0299f746510233a67c38feca8df9f53
b9ce6a7356cc9622d6f084fbb5adfcdacd28993b
aa7135105a449b6de47a59947b3f44dbe3fcb195
e591998f6222c60e9111b56f7924cc6318eb6445
673d3e41a15d7131aaac81fe13a39686881c0917
f86b6d08b58635931baf71e71b3ac040dba999f9
e5edd3a401f07a49eb15059a67a2aa43766a785f
5a31ae24e324cd1d101dc36aad17c143af6dc176
cd7b20f3d37f46820c3aff2e7e2ba214088a98b5
23f0b9d632105aed3f98f97924345a4b4033ca7e
c3042955e24782704bc3411cf8b496c1ac2711ce
ba0495c523cab1544cb2a2a0306a22314dcfc67a
850a0ad23cff36a3af45cb531cf5643387270d5c
e2729712322c9e2814d8fc593121317dede0d2f2
890add9df9ad869bd1e8f69173e1d8b9ef3e50e5
385c0e15957c6cf57882e2cd41d517da986cac08
1f73d086c203d7988b4d9332cf4444b42a694ee8
805155176f2ff375ae9e3a4d6f3ef8fcf6d5e574
dd444e8453c219e0e9fe813018b4e268add4f018
```

*(테스트 커밋 생략 시 `cd7b20f3d37f46820c3aff2e7e2ba214088a98b5` 줄을 제거.)*

## 선택(권장) 커밋 — 티켓 쪽 알림 파이프라인

위 필터에는 안 잡혔지만, **티켓 댓글/완료 알림**을 `plugin-tickets-api` 쪽에서 같이 맞추려면 다음 커밋이 브랜치에 있습니다.

- `a40b3fe77821ff5400930178c1e5959d8f74efab` — feat(notifications): 티켓 댓글 및 처리 완료 알림 기능 개선 *(대부분 `plugin-tickets-api` + 모바일)*

위젯·게이트웨이만 옮길 때는 **필수는 아닐 수 있으나**, 서버 동작을 `feature/mobile` 과 동일하게 맞출 때 포함하는 것을 권장합니다.

## 재생성 명령

다른 브랜치나 최신 `master` 기준으로 다시 뽑을 때:

```bash
git log origin/master..HEAD --reverse --topo-order --format='%H %s' -- \
  widgets/client/clientportal \
  widgets/server/index.ts \
  widgets/server/views/widget-clientportal-test.ejs \
  widgets/public/clientportal-widget-test.html \
  widgets/webpack.config.js \
  packages/plugin-clientportal-api \
  packages/gateway/src \
  packages/plugin-notifications-api
```

## 참고

- E2E로 “페이지만 뜨는지”와 “로그인·티켓·알림까지 동작”은 요구 범위가 다릅니다. 위 목록은 **현재 브랜치의 위젯 테스트 페이지 + 동일 GraphQL 기능**을 `origin/master` 대비 재현하는 데 필요한 변경을 모은 것입니다.
- 게이트웨이·코어·다른 플러그인 설정(`clientportal` 플러그인 활성화, env 등)은 이 문서 범위 밖이며, 운영 환경에 따라 추가 커밋이 필요할 수 있습니다.

## `feature/widget` 브랜치 (cherry-pick 적용)

`origin/master` 에서 `feature/widget` 를 만든 뒤, 위 표의 원본 커밋들을 순서대로 cherry-pick 했습니다. **문서에 적힌 원본 SHA와 `feature/widget` 의 커밋 SHA는 다릅니다** (재적용 시 새 해시가 생김).

다음 원본 커밋들은 `origin/master` 에 `mobile/` 트리가 없어 **모바일 파일 변경은 제외**하고 서버/UI 패치만 남겼습니다.

- `2700ac93ac…` — `packages/plugin-clientportal-api`, `plugin-inbox-api` 만 반영
- `6c3fea6f67…` — `packages/plugin-clientportal-api/.../comment.ts` 만 반영
- `8684ca45a4…` — 모바일 제외; `plugin-tickets-api/.../utils.ts` 는 `TICKET_AUTOMATION_TRIGGER_SOURCE` import와 알림 헬퍼 블록을 **병합**해 충돌 해소

원격에 올릴 때: `git push -u origin feature/widget`
