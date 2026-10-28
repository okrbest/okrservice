import { CHATBOT_STARTER_GROUPS } from '../chatbotStarterQuestions';
import { KEYWORD_MAP } from '../chatbotKeywordMap';

describe('챗봇 첫 화면 질문 버튼', () => {
  it('내 근무 → 휴가 → 급여·증명서, 주제마다 질문 2개', () => {
    expect(CHATBOT_STARTER_GROUPS.map((group) => group.title)).toEqual([
      '내 근무',
      '휴가',
      '급여·증명서',
    ]);
    CHATBOT_STARTER_GROUPS.forEach((group) =>
      expect(group.questions).toHaveLength(2),
    );
  });

  it('질문은 챗봇에 정리된 예시 질문 목록에서만 고른다(답할 수 있는 질문만)', () => {
    const known = new Set(
      Object.values(KEYWORD_MAP).flatMap((match) => match.suggestedQuestions),
    );
    const starters = CHATBOT_STARTER_GROUPS.flatMap((group) => group.questions);

    expect(starters.filter((question) => !known.has(question))).toEqual([]);
  });
});
