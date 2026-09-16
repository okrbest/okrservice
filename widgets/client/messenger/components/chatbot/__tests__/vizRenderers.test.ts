import {
  dispatchViz,
  renderOrgChart,
  renderWorkStatusChart,
  renderSalaryTrendChart,
} from '../vizRenderers';

describe('renderWorkStatusChart', () => {
  it('정상 입력을 Chart.js bar config로 변환한다', () => {
    const r = renderWorkStatusChart({
      labels: ['정상', '지각'],
      values: [28, 2],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.type).toBe('bar');
      expect(r.payload.data.labels).toEqual(['정상', '지각']);
      expect(r.payload.data.datasets[0].data).toEqual([28, 2]);
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
  it('정상 입력을 Chart.js line config로 변환한다', () => {
    const r = renderSalaryTrendChart({
      labels: ['2025-01', '2025-02'],
      series: [{ name: '실지급액', values: [3200000, 3200000] }],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload.type).toBe('line');
      expect(r.payload.data.datasets[0].label).toBe('실지급액');
      expect(r.payload.data.datasets[0].data).toEqual([3200000, 3200000]);
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
  it('정상 입력을 Mermaid graph TD 문자열로 변환한다', () => {
    const r = renderOrgChart({
      root: '개발1팀',
      members: [
        { name: '홍길동', title: '팀장' },
        { name: '김철수', title: '사원' },
      ],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload).toContain('graph TD');
      expect(r.payload).toContain('개발1팀');
      expect(r.payload).toContain('홍길동 (팀장)');
      expect(r.payload).toContain('김철수 (사원)');
    }
  });

  it('구성원 1명일 때도 정상 변환된다', () => {
    const r = renderOrgChart({
      root: '개발1팀',
      members: [{ name: '오사공' }],
    });
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.payload).toContain('오사공');
      expect(r.payload).not.toContain('undefined');
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

  it('잘못된 JSON이면 invalid를 반환한다', () => {
    expect(dispatchViz('{not json')).toEqual({ kind: 'invalid' });
  });

  it('알 수 없는 type이면 invalid를 반환한다', () => {
    expect(dispatchViz(JSON.stringify({ type: 'unknown', data: {} }))).toEqual({
      kind: 'invalid',
    });
  });
});
