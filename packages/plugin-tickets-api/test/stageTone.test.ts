// 실행: ticketViewLink.test.ts 첫 줄과 같은 명령에서 testMatch만 이 파일로
import { stageTone } from '../src/stageTone';

const stages = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ _id: `s${i}`, order: i }));

describe('stageTone — 위젯 단계 색과 같은 규칙', () => {
  it('5단계: 회색·파랑·보라·주황·초록', () => {
    expect(
      ['s0', 's1', 's2', 's3', 's4'].map((id) => stageTone(id, '', stages(5))),
    ).toEqual(['gray', 'blue', 'purple', 'orange', 'green']);
  });

  it('4단계: 회색·파랑·주황·초록', () => {
    expect(
      ['s0', 's1', 's2', 's3'].map((id) => stageTone(id, '', stages(4))),
    ).toEqual(['gray', 'blue', 'orange', 'green']);
  });

  it('3단계 이하에는 주황이 없다', () => {
    expect(
      ['s0', 's1', 's2'].map((id) => stageTone(id, '', stages(3))),
    ).toEqual(['gray', 'blue', 'green']);
  });

  it('가운데가 많으면 파랑·보라·청록을 돌려 쓴다', () => {
    expect(
      ['s1', 's2', 's3', 's4'].map((id) => stageTone(id, '', stages(7))),
    ).toEqual(['blue', 'purple', 'teal', 'blue']);
  });

  it('순서 값으로 정렬하고 보관된 단계는 빼고 센다', () => {
    const list = [
      { _id: 'b', order: 2 },
      { _id: 'x', order: 1, status: 'archived' },
      { _id: 'a', order: 0 },
    ];
    expect(stageTone('b', '', list)).toBe('green');
    expect(stageTone('a', '', list)).toBe('gray');
  });

  it('단계 목록에 없으면 이름이 완료 계열일 때만 초록, 아니면 기본', () => {
    expect(stageTone('zz', '처리 완료', stages(3))).toBe('green');
    expect(stageTone('zz', '접수', stages(3))).toBe('default');
  });
});
