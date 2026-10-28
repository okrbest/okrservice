import { parse } from 'graphql';
import {
  articleDetailAndIncViewCountQuery,
  articleDetailQuery,
  articleListQuery,
} from '../../graphql/queries';

describe('FAQ 질의 문자열', () => {
  it('조회수 질의는 올바른 GraphQL이고 조회수 올리는 루트 필드를 부른다', () => {
    const doc: any = parse(articleDetailAndIncViewCountQuery);
    const op = doc.definitions[0];
    expect(op.name.value).toBe('knowledgeBaseArticleDetailAndIncViewCount');
    expect(op.selectionSet.selections[0].name.value).toBe(
      'knowledgeBaseArticleDetailAndIncViewCount',
    );
  });

  it('조회수 질의는 기존 상세 질의와 같은 필드를 받는다', () => {
    const fields = (q: string) =>
      (
        parse(q) as any
      ).definitions[0].selectionSet.selections[0].selectionSet.selections.map(
        (s: any) => s.name.value,
      );
    expect(fields(articleDetailAndIncViewCountQuery)).toEqual(
      fields(articleDetailQuery),
    );
  });

  it('목록 질의는 본문(content)을 받지 않고 분류로 거를 수 있다', () => {
    expect(articleListQuery).not.toMatch(/\bcontent\b/);
    expect(articleListQuery).toMatch(/\$categoryIds: \[String\]/);
    parse(articleListQuery);
  });
});
