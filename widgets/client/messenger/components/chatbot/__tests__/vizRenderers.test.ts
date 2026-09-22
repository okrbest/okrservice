import {
  dispatchViz,
  renderOrgChart,
  renderWorkStatusChart,
  renderSalaryTrendChart,
} from '../vizRenderers';

describe('renderWorkStatusChart', () => {
  it('정상 입력을 recharts용 {label, value, color} 배열로 변환한다', () => {
    const r = renderWorkStatusChart({
      labels: ['정상', '지각'],
      values: [28, 2],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.data).toEqual([
        { label: '정상', value: 28, color: expect.any(String) },
        { label: '지각', value: 2, color: expect.any(String) },
      ]);
    }
  });

  it('상태 라벨별로 서로 다른 색을 매긴다(정상=good, 지각/조퇴/출퇴근누락=warning, 결근=critical, 그 외=accent)', () => {
    const r = renderWorkStatusChart({
      labels: ['정상', '지각', '조퇴', '결근', '출퇴근누락', '휴가'],
      values: [1, 1, 1, 1, 1, 1],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      const colorByLabel = Object.fromEntries(
        r.payload.data.map((d) => [d.label, d.color]),
      );
      expect(colorByLabel['정상']).toBe(colorByLabel['정상']);
      expect(colorByLabel['지각']).toBe(colorByLabel['조퇴']);
      expect(colorByLabel['지각']).toBe(colorByLabel['출퇴근누락']);
      expect(colorByLabel['결근']).not.toBe(colorByLabel['정상']);
      expect(colorByLabel['결근']).not.toBe(colorByLabel['지각']);
      expect(colorByLabel['휴가']).not.toBe(colorByLabel['정상']);
      expect(colorByLabel['휴가']).not.toBe(colorByLabel['지각']);
      expect(colorByLabel['휴가']).not.toBe(colorByLabel['결근']);
    }
  });

  it('빈 배열이면 empty를 반환한다', () => {
    expect(renderWorkStatusChart({ labels: [], values: [] })).toEqual({
      status: 'empty',
    });
  });

  it('필수 필드 누락 시 invalid를 반환한다', () => {
    expect(renderWorkStatusChart({ labels: ['정상'] })).toEqual({
      status: 'invalid',
    });
  });

  it('labels/values 길이가 다르면 invalid를 반환한다', () => {
    expect(
      renderWorkStatusChart({ labels: ['정상', '지각'], values: [1] }),
    ).toEqual({
      status: 'invalid',
    });
  });
});

describe('renderSalaryTrendChart', () => {
  it('정상 입력을 recharts용 행 데이터 + series 메타로 변환한다', () => {
    const r = renderSalaryTrendChart({
      labels: ['2025-01', '2025-02'],
      series: [{ name: '실지급액', values: [3200000, 3200000] }],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.data).toEqual([
        { __x: '2025-01', s0: 3200000 },
        { __x: '2025-02', s0: 3200000 },
      ]);
      expect(r.payload.series).toEqual([
        { key: 's0', name: '실지급액', color: expect.any(String) },
      ]);
    }
  });

  it('시리즈 이름이 x·__x·중복이어도 내부 키가 충돌하지 않는다', () => {
    const r = renderSalaryTrendChart({
      labels: ['2025-01'],
      series: [
        { name: 'x', values: [1] },
        { name: '__x', values: [2] },
        { name: 'x', values: [3] },
      ],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.data).toEqual([{ __x: '2025-01', s0: 1, s1: 2, s2: 3 }]);
      expect(r.payload.series.map((s) => s.key)).toEqual(['s0', 's1', 's2']);
      expect(r.payload.series.map((s) => s.name)).toEqual(['x', '__x', 'x']);
    }
  });

  it('단일 월 데이터도 정상 변환된다', () => {
    const r = renderSalaryTrendChart({
      labels: ['2025-03'],
      series: [{ name: '실지급액', values: [3290000] }],
    });
    expect(r.status).toBe('ok');
  });

  it('series 누락 시 invalid를 반환한다', () => {
    expect(renderSalaryTrendChart({ labels: ['2025-01'] })).toEqual({
      status: 'invalid',
    });
  });

  it('labels가 빈 배열이면 empty를 반환한다', () => {
    expect(
      renderSalaryTrendChart({
        labels: [],
        series: [{ name: 'x', values: [] }],
      }),
    ).toEqual({
      status: 'empty',
    });
  });
});

describe('renderOrgChart', () => {
  it('정상 입력을 트리 렌더용 {root, members} 데이터로 변환한다', () => {
    const r = renderOrgChart({
      root: '개발1팀',
      members: [
        { name: '홍길동', title: '팀장' },
        { name: '김철수', title: '사원' },
      ],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.root).toBe('개발1팀');
      expect(r.payload.members).toEqual([
        { name: '홍길동', title: '팀장' },
        { name: '김철수', title: '사원' },
      ]);
    }
  });

  it('구성원 1명일 때도 정상 변환된다', () => {
    const r = renderOrgChart({
      root: '개발1팀',
      members: [{ name: '오사공' }],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.members).toEqual([{ name: '오사공' }]);
    }
  });

  it('members가 빈 배열이면 empty를 반환한다', () => {
    expect(renderOrgChart({ root: '개발1팀', members: [] })).toEqual({
      status: 'empty',
    });
  });

  it('root 누락 시 invalid를 반환한다', () => {
    expect(renderOrgChart({ members: [{ name: '홍길동' }] })).toEqual({
      status: 'invalid',
    });
  });
});

describe('dispatchViz', () => {
  it('workstatus 블록을 파싱해 위임한다', () => {
    const d = dispatchViz(
      JSON.stringify({
        type: 'workstatus',
        data: { labels: ['정상'], values: [1] },
      }),
    );
    expect(d.kind).toBe('workstatus');
  });

  it('orgchart 블록을 파싱해 위임한다', () => {
    const d = dispatchViz(
      JSON.stringify({
        type: 'orgchart',
        data: { root: '개발1팀', members: [{ name: '홍길동' }] },
      }),
    );
    expect(d.kind).toBe('orgchart');
  });

  it('salarytrend 블록을 파싱해 위임한다', () => {
    const d = dispatchViz(
      JSON.stringify({
        type: 'salarytrend',
        data: {
          labels: ['2025-01'],
          series: [{ name: '실지급액', values: [1] }],
        },
      }),
    );
    expect(d.kind).toBe('salarytrend');
  });

  it('잘못된 JSON이면 invalid를 반환한다', () => {
    expect(dispatchViz('{not json')).toEqual({ kind: 'invalid' });
  });

  it('알 수 없는 type이면 invalid를 반환한다', () => {
    expect(dispatchViz(JSON.stringify({ type: 'unknown', data: {} }))).toEqual({
      kind: 'invalid',
    });
  });
});
