/**
 * hrBridge 단위 테스트 — R1 브리지 보안 규칙 (작업지시서 §1.4/§1.5/§4)
 * allowlist 거부 / path+cmd 조합 거부 / searchType=mobile 거부 / $SELF_STAFF_ID 치환 / origin·source 검증
 */
import { initHrBridge } from '../hrBridge';

declare const window: any;

const WIDGET_ORIGIN = 'https://widgets.example.com';

function makeIframe(): HTMLIFrameElement {
  // DOM에 붙이지 않음 — jsdom이 teardown 시 오버라이드된 contentWindow를
  // close하려다 실패하는 문제 회피 (브리지는 contentWindow 참조만 사용)
  const iframe = document.createElement('iframe');
  iframe.src = `${WIDGET_ORIGIN}/messenger`;
  return iframe;
}

function dispatchRequest(
  iframe: HTMLIFrameElement,
  data: any,
  overrides: { origin?: string; source?: any } = {},
) {
  const event = new MessageEvent('message', {
    data,
    origin: overrides.origin ?? WIDGET_ORIGIN,
  });
  // MessageEvent 생성자는 source에 실제 Window 프록시만 허용 — defineProperty로 주입
  Object.defineProperty(event, 'source', {
    value: 'source' in overrides ? overrides.source : iframe.contentWindow,
  });
  window.dispatchEvent(event);
}

// 서버가 실제로 보내는 형태 — 사번 키 필수 경로는 본인 마커를 넣는다(teamplgpt specs/017)
const SELF = '$SELF_STAFF_ID';
function addSelfInput(value = 'STAFF123') {
  const input = document.createElement('input');
  input.id = 'searchUserId';
  input.value = value;
  document.body.appendChild(input);
}

const request = (spec: any, callId = 'call-1') => ({
  type: 'teamplgpt:hr-tool-request',
  callId,
  spec,
});

describe('initHrBridge', () => {
  let fetchMock: jest.Mock;
  let replyMock: jest.Mock;
  let iframe: HTMLIFrameElement;

  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    document.body.innerHTML = '';
    window.erxesSettings = {
      messenger: { hrBaseUrl: 'https://kiwibox.example.com' },
    };

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('RESPONSE_BODY'),
    });
    (global as any).fetch = fetchMock;

    iframe = makeIframe();
    replyMock = jest.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage: replyMock },
      configurable: true,
    });

    initHrBridge(iframe);
  });

  it('허용 경로 요청을 kiwibox로 fetch하고 결과를 회신한다', async () => {
    const staffInput = document.createElement('input');
    staffInput.id = 'searchUserId';
    staffInput.value = 'STAFF123';
    document.body.appendChild(staffInput);

    dispatchRequest(
      iframe,
      request({
        transport: 'kiwibox-bridge',
        path: '/TAADclzVcatnList.do',
        method: 'POST',
        form: {
          cmd: 'getTAADclzVcatnList1',
          searchType: '1',
          cmmSearchStaffId: '$SELF_STAFF_ID',
          staffId: '$SELF_STAFF_ID',
        },
      }),
    );
    await flush();

    // /kiwibox 자동 보정 금지 — hrBaseUrl 그대로 사용 (작업지시서 §4 정정, 루트 배포)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/TAADclzVcatnList.do',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: 'cmd=getTAADclzVcatnList1&searchType=1&cmmSearchStaffId=STAFF123&staffId=STAFF123',
      }),
    );
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: 'call-1',
        ok: true,
        status: 200,
        body: 'RESPONSE_BODY',
      }),
      WIDGET_ORIGIN,
    );
  });

  it('allowlist 외 경로는 fetch 없이 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({ path: '/deleteEverything.do', method: 'POST', form: {} }),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: path not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('확장 정적 경로(hr-welfare 등)를 허용한다', async () => {
    addSelfInput();
    dispatchRequest(
      iframe,
      request({
        path: '/LONLoanReqstListMgr.do',
        method: 'POST',
        form: { cmd: 'getLONLoanReqstListMgrList1', cmmSearchStaffId: SELF },
      }),
    );
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/LONLoanReqstListMgr.do',
      expect.anything(),
    );
  });

  it('신판 카탈로그 신규 경로(specs/011)를 허용한다', async () => {
    addSelfInput();
    for (const [path, form] of [
      [
        '/TAADclzVcatnList.do',
        { cmd: 'getTAADclzVcatnList2', staffId: SELF, cmmSearchStaffId: SELF },
      ],
      [
        '/SALSalaryBassMgr.do',
        { cmd: 'getSALSalaryBassMgrTab110List', staffId: SELF },
      ],
    ] as const) {
      dispatchRequest(iframe, request({ path, method: 'POST', form }));
    }
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/TAADclzVcatnList.do',
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/SALSalaryBassMgr.do',
      expect.anything(),
    );
  });

  it('폐기 경로 3종은 allowlist에서 제거되어 거부한다', async () => {
    for (const path of [
      '/TAAWrkTimeListMgrByDate.do',
      '/getMBLLeavDetailStaff.do',
      '/getMBLHomeLeaveDetail.do',
    ]) {
      dispatchRequest(iframe, request({ path, method: 'POST', form: {} }));
    }
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(3);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: path not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('다른 직원 정보 경로(조직 휴가캘린더)는 거부한다 (teamplgpt specs/016)', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/TAADclzVcatnCldrMgr.do',
        method: 'POST',
        form: { cmd: 'getTAADclzVcatnCldrMgr' },
      }),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: path not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('결재함은 본인 기안함(selectGubun=2)만 통과시킨다 (teamplgpt specs/016)', async () => {
    const approval = (selectGubun?: string, callId = 'call-1') =>
      request(
        {
          path: '/EAPRequestMgr.do',
          method: 'POST',
          form: {
            cmd: 'getEAPRequestMgrList',
            ...(selectGubun === undefined ? {} : { selectGubun }),
            sdt: '20260101',
            edt: '20261015',
          },
        },
        callId,
      );

    // 미결(3)·기결(4)·참조(5)·반려(6)는 다른 직원 문서, 미지정은 서버 기본 범위라 거부
    ['3', '4', '5', '6', undefined].forEach((g, i) =>
      dispatchRequest(iframe, approval(g, `deny-${i}`)),
    );
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(5);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: param not allowed' }),
      WIDGET_ORIGIN,
    );

    dispatchRequest(iframe, approval('2', 'allow'));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/EAPRequestMgr.do',
      expect.anything(),
    );
  });

  it("selectGubun 배열 값: ['2','3']은 거부, ['2']는 허용 (teamplgpt specs/016)", async () => {
    const send = (selectGubun: unknown, callId: string) =>
      dispatchRequest(
        iframe,
        request(
          {
            path: '/EAPRequestMgr.do',
            method: 'POST',
            form: { cmd: 'getEAPRequestMgrList', selectGubun },
          },
          callId,
        ),
      );
    send(['2', '3'], 'arr-deny');
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    send(['2'], 'arr-allow');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('회사 일정·공휴일 제목 경로(/getHRDetailList.do)는 허용하고, 미사용 연락처 경로는 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/getHRDetailList.do',
        method: 'POST',
        form: { staYmd: '20260701', endYmd: '20260731' },
      }),
    );
    dispatchRequest(
      iframe,
      request(
        { path: '/getContactList.do', method: 'POST', form: {} },
        'call-2',
      ),
    );
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/getHRDetailList.do',
      expect.anything(),
    );
    // 거부 응답은 즉시, 허용 응답은 fetch 후 비동기로 온다 — 순서 대신 callId로 확인
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        callId: 'call-2',
        ok: false,
        body: 'bridge: path not allowed',
      }),
      WIDGET_ORIGIN,
    );
  });

  it('사번 파라미터는 본인 마커만 허용한다 — 리터럴 STAFF_ID는 거부 (teamplgpt specs/016)', async () => {
    for (const [key, i] of [
      ['cmmSearchStaffId', 0],
      ['searchStaffId', 1],
      ['staffId', 2],
      ['searchId', 3],
    ] as const) {
      dispatchRequest(
        iframe,
        request(
          {
            // 사번 키 필수 검사보다 값 규칙을 보려고 필수 키가 없는 경로를 쓴다
            path: '/getTodoIconCnt.do',
            method: 'POST',
            form: {
              [key]: 'OTHER_STAFF_999',
            },
          },
          `literal-${i}`,
        ),
      );
    }
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(4);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ok: false,
        body: 'bridge: staff param must be self',
      }),
      WIDGET_ORIGIN,
    );
  });

  it('허용 경로라도 저장·삭제 cmd는 fetch 없이 거부한다', async () => {
    for (const cmd of ['saveCTIMcrtfIssuMgr', 'saveCTIMcrtfIssuMgrDelete']) {
      dispatchRequest(
        iframe,
        request({ path: '/CTIMcrtfIssuMgr.do', method: 'POST', form: { cmd } }),
      );
    }
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(2);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: cmd not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('cmd 분기 경로의 cmd 누락·타 경로 cmd 교차 사용은 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({ path: '/CTIMcrtfIssuMgr.do', method: 'POST', form: {} }),
    );
    dispatchRequest(
      iframe,
      request(
        {
          path: '/CTIMcrtfIssuMgr.do',
          method: 'POST',
          form: { cmd: 'getEAPRequestMgrList' },
        },
        'call-2',
      ),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(2);
  });

  it('cmd 분기가 없는 경로에 cmd를 붙이면 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/getTodoIconCnt.do',
        method: 'POST',
        form: { cmd: 'getTodoIconCnt' },
      }),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: cmd not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('증명서 발급내역 조회 cmd는 허용한다', async () => {
    addSelfInput();
    dispatchRequest(
      iframe,
      request({
        path: '/CTIMcrtfIssuMgr.do',
        method: 'POST',
        form: { cmd: 'getCTIMcrtfIssuMgrList', staffIdNm: SELF },
      }),
    );
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/CTIMcrtfIssuMgr.do',
      expect.objectContaining({
        body: 'cmd=getCTIMcrtfIssuMgrList&staffIdNm=STAFF123',
      }),
    );
  });

  it('마커 3중 파라미터를 모두 페이지 STAFF_ID로 치환한다', async () => {
    const staffInput = document.createElement('input');
    staffInput.id = 'searchUserId';
    staffInput.value = 'STAFF123';
    document.body.appendChild(staffInput);

    dispatchRequest(
      iframe,
      request({
        path: '/TAADclzVcatnList.do',
        method: 'POST',
        form: {
          cmd: 'getTAADclzVcatnList1',
          staffId: '$SELF_STAFF_ID',
          cmmSearchStaffId: '$SELF_STAFF_ID',
          searchStaffId: '$SELF_STAFF_ID',
        },
      }),
    );
    await flush();

    expect(fetchMock.mock.calls[0][1].body).toBe(
      'cmd=getTAADclzVcatnList1&staffId=STAFF123&cmmSearchStaffId=STAFF123&searchStaffId=STAFF123',
    );
  });

  it('YTA 정규식: 지원 endpoint×연도는 허용한다', async () => {
    addSelfInput();
    dispatchRequest(
      iframe,
      request({
        path: '/YTASummaryMgr2024.do',
        method: 'POST',
        form: { cmd: 'getYTASummaryMgrList', cmmSearchStaffId: SELF },
      }),
    );
    dispatchRequest(
      iframe,
      request(
        {
          path: '/YTAInDctMgr2025.do',
          method: 'POST',
          form: { cmd: 'getYTASummaryMgrList' }, // 타 컨트롤러 cmd — 거부
        },
        'call-2',
      ),
    );
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/YTASummaryMgr2024.do',
      expect.anything(),
    );
  });

  it('YTA 미지원 연도(2021·2026)·유사 경로는 거부한다', async () => {
    for (const path of [
      '/YTASummaryMgr2021.do',
      '/YTASummaryMgr2026.do',
      '/YTAFakeMgr2024.do',
      '/YTASummaryMgr2024.do.jsp',
    ]) {
      dispatchRequest(iframe, request({ path, method: 'POST', form: {} }));
    }
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(4);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: path not allowed' }),
      WIDGET_ORIGIN,
    );
  });

  it('CommonCode.do는 허용 queryId만 통과시킨다', async () => {
    addSelfInput();
    dispatchRequest(
      iframe,
      request({
        path: '/CommonCode.do',
        method: 'POST',
        form: {
          cmd: 'getCommonNSCodeList',
          queryId: 'getSalYmdTypeCdList2',
          staffId: SELF,
        },
      }),
    );
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/CommonCode.do',
      expect.objectContaining({
        body: 'cmd=getCommonNSCodeList&queryId=getSalYmdTypeCdList2&staffId=STAFF123',
      }),
    );
  });

  it('CommonCode.do 임의 queryId·queryId 부재는 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/CommonCode.do',
        method: 'POST',
        form: {
          cmd: 'getCommonNSCodeList',
          queryId: 'getAllStaffSalaries',
          staffId: SELF,
        },
      }),
    );
    dispatchRequest(
      iframe,
      request(
        {
          path: '/CommonCode.do',
          method: 'POST',
          form: { cmd: 'getCommonNSCodeList', staffId: SELF },
        },
        'call-2',
      ),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledTimes(2);
    expect(replyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ok: false,
        body: 'bridge: queryId not allowed',
      }),
      WIDGET_ORIGIN,
    );
  });

  it('searchType=mobile은 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/TAADclzVcatnList.do',
        method: 'POST',
        form: {
          cmd: 'getTAADclzVcatnList1',
          searchType: 'mobile',
          staffId: SELF,
          cmmSearchStaffId: SELF,
        },
      }),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        body: 'bridge: forbidden param value',
      }),
      WIDGET_ORIGIN,
    );
  });

  it('staffId를 찾지 못하면 거부한다', async () => {
    dispatchRequest(
      iframe,
      request({
        path: '/TAADclzVcatnList.do',
        method: 'POST',
        form: {
          cmd: 'getTAADclzVcatnList1',
          cmmSearchStaffId: '$SELF_STAFF_ID',
          staffId: '$SELF_STAFF_ID',
        },
      }),
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, body: 'bridge: staffId not found' }),
      WIDGET_ORIGIN,
    );
  });

  it('빈 #searchUserId가 먼저 있으면 값 있는 input으로 폴백한다', async () => {
    const empty = document.createElement('input');
    empty.id = 'searchUserId';
    document.body.appendChild(empty);
    const filled = document.createElement('input');
    filled.id = 'searchUserId';
    filled.setAttribute('value', 'STAFF777');
    document.body.appendChild(filled);

    dispatchRequest(
      iframe,
      request({
        path: '/TAADclzVcatnList.do',
        method: 'POST',
        form: {
          cmd: 'getTAADclzVcatnList1',
          cmmSearchStaffId: '$SELF_STAFF_ID',
          staffId: '$SELF_STAFF_ID',
        },
      }),
    );
    await flush();

    expect(fetchMock.mock.calls[0][1].body).toBe(
      'cmd=getTAADclzVcatnList1&cmmSearchStaffId=STAFF777&staffId=STAFF777',
    );
  });

  it('origin 불일치 메시지는 무시한다', async () => {
    dispatchRequest(
      iframe,
      request({ path: '/TAADclzVcatnList.do', method: 'POST', form: {} }),
      { origin: 'https://evil.example.com' },
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).not.toHaveBeenCalled();
  });

  it('source가 chatbot iframe이 아니면 무시한다', async () => {
    dispatchRequest(
      iframe,
      request({ path: '/TAADclzVcatnList.do', method: 'POST', form: {} }),
      { source: {} },
    );
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(replyMock).not.toHaveBeenCalled();
  });

  it('hrBaseUrl 없으면 리스너를 등록하지 않는다', async () => {
    window.erxesSettings = { messenger: {} };
    const iframe2 = makeIframe();
    const reply2 = jest.fn();
    Object.defineProperty(iframe2, 'contentWindow', {
      value: { postMessage: reply2 },
      configurable: true,
    });
    initHrBridge(iframe2);

    dispatchRequest(
      iframe2,
      request({ path: '/TAADclzVcatnList.do', method: 'POST', form: {} }),
    );
    await flush();
    expect(reply2).not.toHaveBeenCalled();
  });

  it('hrBaseUrl에 컨텍스트 경로가 이미 있으면 보정하지 않는다', async () => {
    window.erxesSettings = {
      messenger: { hrBaseUrl: 'https://kiwibox.example.com/kiwibox/' },
    };
    const iframe3 = makeIframe();
    Object.defineProperty(iframe3, 'contentWindow', {
      value: { postMessage: jest.fn() },
      configurable: true,
    });
    initHrBridge(iframe3);

    dispatchRequest(
      iframe3,
      request({ path: '/getTodoIconCnt.do', method: 'POST', form: {} }),
      undefined,
    );
    // 이 이벤트는 iframe(첫 번째)의 리스너에도 도달하지만 source 불일치로 무시됨
    const event = new MessageEvent('message', {
      data: request({ path: '/getTodoIconCnt.do', method: 'POST', form: {} }),
      origin: WIDGET_ORIGIN,
    });
    Object.defineProperty(event, 'source', { value: iframe3.contentWindow });
    window.dispatchEvent(event);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://kiwibox.example.com/kiwibox/getTodoIconCnt.do',
      expect.anything(),
    );
  });

  // 연장근무현황(모바일) — 대상 직원이 비면 kiwibox가 조회 권한 범위 직원 전체를 돌려준다
  // (MBLDclzWorkOtSchdul_SQL "본인소속조회"). 사번 키가 아예 없는 요청도 막는다(teamplgpt specs/017).
  describe('연장근무현황 경로 (teamplgpt specs/017)', () => {
    const OT_LIMIT = '/getMBLDclzWorkOtSchdul.do';
    const OT_PERSON = '/getMBLDclzWorkOtSchdulPerson.do';
    const addStaff = () => {
      const input = document.createElement('input');
      input.id = 'searchUserId';
      input.value = 'STAFF123';
      document.body.appendChild(input);
    };
    const send = (
      path: string,
      form: Record<string, unknown>,
      callId: string,
    ) =>
      dispatchRequest(iframe, request({ path, method: 'POST', form }, callId));
    const lastBody = () =>
      replyMock.mock.calls[replyMock.mock.calls.length - 1][0].body;

    it('본인 마커가 있으면 두 경로 모두 본인 STAFF_ID로 조회한다', async () => {
      addStaff();
      send(
        OT_LIMIT,
        {
          searchType: '3',
          searchBaseSYmd: '2026-10-19',
          cmmSearchStaffId: '$SELF_STAFF_ID',
        },
        'ok-1',
      );
      send(
        OT_PERSON,
        {
          searchBaseSYmd: '2026-10-01',
          searchBaseEYmd: '2026-10-19',
          cmmSearchStaffId: '$SELF_STAFF_ID',
        },
        'ok-2',
      );
      await flush();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://kiwibox.example.com${OT_LIMIT}`,
        expect.objectContaining({
          body: 'searchType=3&searchBaseSYmd=2026-10-19&cmmSearchStaffId=STAFF123',
        }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        `https://kiwibox.example.com${OT_PERSON}`,
        expect.objectContaining({
          body: 'searchBaseSYmd=2026-10-01&searchBaseEYmd=2026-10-19&cmmSearchStaffId=STAFF123',
        }),
      );
    });

    it('사번 키가 없으면 fetch 없이 거부한다', async () => {
      addStaff();
      send(
        OT_LIMIT,
        { searchType: '2', searchBaseSYmd: '2026-10-19' },
        'no-key-1',
      );
      await flush();
      expect(lastBody()).toBe('bridge: staff param required');
      send(
        OT_PERSON,
        { searchBaseSYmd: '2026-10-01', searchBaseEYmd: '2026-10-19' },
        'no-key-2',
      );
      await flush();
      expect(lastBody()).toBe('bridge: staff param required');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('사번이 빈 값이면 fetch 없이 거부한다', async () => {
      addStaff();
      send(OT_LIMIT, { searchType: '2', cmmSearchStaffId: '' }, 'empty');
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(lastBody()).toBe('bridge: staff param must be self');
    });

    it('한도 경로는 searchType 2·3만 허용한다', async () => {
      addStaff();
      send(
        OT_LIMIT,
        { searchType: '1', cmmSearchStaffId: '$SELF_STAFF_ID' },
        'type-1',
      );
      send(OT_LIMIT, { cmmSearchStaffId: '$SELF_STAFF_ID' }, 'type-none');
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(lastBody()).toBe('bridge: param not allowed');
    });

    it('cmd를 붙이면 거부한다', async () => {
      addStaff();
      send(
        OT_LIMIT,
        {
          cmd: 'anything',
          searchType: '2',
          cmmSearchStaffId: '$SELF_STAFF_ID',
        },
        'cmd',
      );
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(lastBody()).toBe('bridge: cmd not allowed');
    });

    it('정해진 키 외의 파라미터는 거부한다(파라미터 수 한도로 사번 키를 잘라내는 시도 포함)', async () => {
      addStaff();
      const padding = Object.fromEntries(
        Array.from({ length: 3 }, (_, i) => [`x${i}`, '1']),
      );
      send(
        OT_LIMIT,
        { searchType: '2', ...padding, cmmSearchStaffId: '$SELF_STAFF_ID' },
        'extra',
      );
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(lastBody()).toBe('bridge: param key not allowed');
    });
  });

  // 대상 직원 키가 없으면 kiwibox가 조회 권한 범위 직원 전체를 돌려주는 경로들 —
  // 서버는 항상 본인 마커를 보내므로 키 필수로 막는다(teamplgpt specs/017 보안 리뷰).
  describe('사번 키 필수 경로 (teamplgpt specs/017 보안 리뷰)', () => {
    const send = (
      path: string,
      form: Record<string, unknown>,
      callId: string,
    ) =>
      dispatchRequest(iframe, request({ path, method: 'POST', form }, callId));

    it.each([
      ['/TAAWrkTimeStatusMgr.do', { cmd: 'getTAAWrkTimeStatusMgrList' }],
      [
        '/TAADclzWorkOtSchdul.do',
        {
          cmd: 'getTAADclzWorkOtSchdulList',
          searchType: '2',
          searchYm: '202610',
        },
      ],
      ['/TAADclzVcatnList.do', { cmd: 'getTAADclzVcatnList1' }],
      ['/SALSalaryDtstmnMgr.do', { cmd: 'getSALSalaryDtstmnMgrList' }],
      ['/CTIMcrtfIssuMgr.do', { cmd: 'getCTIMcrtfIssuMgrList' }],
      ['/YTASummaryMgr2025.do', { cmd: 'getYTASummaryMgrList' }],
      ['/YTAInDctMgr2025.do', { cmd: 'getYTAInDctMgrTab06List' }],
    ])('%s: 사번 키 없이 요청하면 거부한다', async (path, form) => {
      send(path, form, 'no-key');
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(replyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ok: false,
          body: 'bridge: staff param required',
        }),
        WIDGET_ORIGIN,
      );
    });

    it('증명서 검색 칸(staffIdNm)도 본인 마커만 허용한다', async () => {
      send(
        '/CTIMcrtfIssuMgr.do',
        { cmd: 'getCTIMcrtfIssuMgrList', staffIdNm: '김' },
        'literal',
      );
      send(
        '/CTIMcrtfIssuMgr.do',
        { cmd: 'getCTIMcrtfIssuMgrList', staffIdNm: '' },
        'empty',
      );
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(replyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ok: false,
          body: 'bridge: staff param must be self',
        }),
        WIDGET_ORIGIN,
      );
    });

    it('페이지의 본인 ID가 공백뿐이면 거부한다(SQL에서 빈 값 = 팀 전체)', async () => {
      const input = document.createElement('input');
      input.id = 'searchUserId';
      input.value = '   ';
      document.body.appendChild(input);
      send(
        '/TAAWrkTimeStatusMgr.do',
        {
          cmd: 'getTAAWrkTimeStatusMgrList',
          cmmSearchStaffId: '$SELF_STAFF_ID',
        },
        'blank',
      );
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(replyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ok: false,
          body: 'bridge: staffId not found',
        }),
        WIDGET_ORIGIN,
      );
    });

    it('예약어 키(constructor)가 와도 예외로 멈추지 않고 응답한다', async () => {
      send('/getTodoIconCnt.do', { constructor: 'x' }, 'proto');
      await flush();
      expect(replyMock).toHaveBeenCalledWith(
        expect.objectContaining({ callId: 'proto' }),
        WIDGET_ORIGIN,
      );
    });
  });
});
