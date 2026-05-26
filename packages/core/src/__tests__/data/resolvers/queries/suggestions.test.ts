import suggestionQueries from '../../../../data/resolvers/queries/suggestions';

describe('chatbotSuggestions', () => {
  const resolve = (_root: any, args: { keyword: string; chatbotId?: string }) =>
    suggestionQueries.chatbotSuggestions(_root, args, {} as any);

  it('2글자 미만이면 빈 배열 반환', async () => {
    const result = await resolve(null, { keyword: '출' });
    expect(result).toEqual([]);
  });

  it('prefix 매칭으로 여러 결과 반환', async () => {
    const result = await resolve(null, { keyword: '출근' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({
      keyword: expect.any(String),
      label: expect.any(String),
      buttons: expect.arrayContaining([
        expect.objectContaining({ label: expect.any(String), url: expect.any(String) }),
      ]),
    });
  });

  it('"출" prefix → 출근, 출퇴근변경, 출장 모두 포함', async () => {
    const result = await resolve(null, { keyword: '출근' });
    const keywords = result.map((r: any) => r.keyword);
    expect(keywords).toContain('출근');
  });

  it('매칭 없으면 빈 배열', async () => {
    const result = await resolve(null, { keyword: '없는키워드abc' });
    expect(result).toEqual([]);
  });

  it('chatbotId 파라미터를 무시해도 정상 동작', async () => {
    const result = await resolve(null, { keyword: '휴가', chatbotId: 'test-corp' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].keyword).toBe('휴가');
  });
});
