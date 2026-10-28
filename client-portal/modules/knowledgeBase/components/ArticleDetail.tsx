import React, { useMemo } from 'react';
import { Config, IKbArticle, Topic } from '../../types';
import { findCategoryPath } from '../utils/faqCategories';
import FaqBrowse from './browse/FaqBrowse';
import { CategoryCrumb } from './CategoryDetail';
import KbRightPanel, { TocItem } from './KbRightPanel';
import SingleArticle from './SingleArticle';

type Props = {
  article: IKbArticle;
  categoryId?: string;
  topic: Topic;
  config: Config;
  loading: boolean;
};

function extractToc(html: string): TocItem[] {
  if (typeof window === 'undefined' || !html) return [];
  const dom = new DOMParser().parseFromString(html, 'text/html');
  const items: TocItem[] = [];
  dom.querySelectorAll('h2, h3').forEach((el) => {
    const text = el.textContent?.trim().replace(/&nbsp;/g, '') || '';
    if (!text) return;
    const id = text.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '');
    el.setAttribute('id', id);
    items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 });
  });
  return items;
}

// 본문 화면: 구성(왼쪽 분류 · 가운데 본문 · 오른쪽 목차/많이 본 질문)은 그대로, 틀만 새 화면과 맞춤
function ArticleDetail({ loading, article, categoryId, topic, config }: Props) {
  const toc = useMemo(
    () => (article?.content ? extractToc(article.content) : []),
    [article?.content],
  );

  return (
    <FaqBrowse
      topic={topic}
      activeCategoryId={categoryId}
      topSlot={
        <CategoryCrumb path={findCategoryPath(topic, categoryId || '')} />
      }
      rightPanel={
        <KbRightPanel
          topic={topic}
          categoryId={categoryId}
          toc={toc}
          excludeId={article?._id}
        />
      }
    >
      <SingleArticle article={article} loading={loading} config={config} />
    </FaqBrowse>
  );
}

export default ArticleDetail;
