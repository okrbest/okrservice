import React, { useMemo } from 'react';
import { Config, IKbArticle, IKbCategory, Topic } from '../../types';
import SectionHeader from '../../common/SectionHeader';
import SideBar from './SideBar';
import SingleArticle from './SingleArticle';
import KbRightPanel, { TocItem } from './KbRightPanel';
import { KbPageContainer, KbThreeCol, KbLeftCol, KbCenterCol, KbRightCol, MobileCategoryNav, MobileCategoryTab } from './styles';
import Link from 'next/link';

type Props = {
  article: IKbArticle;
  category: IKbCategory;
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

function ArticleDetail({ loading, article, category, topic, config }: Props) {
  const toc = useMemo(
    () => (article?.content ? extractToc(article.content) : []),
    [article?.content]
  );

  return (
    <KbPageContainer>
      <SectionHeader
        categories={topic.parentCategories}
        selectedCat={category}
      />
      <MobileCategoryNav>
        <Link href="/knowledge-base?view=all">
          <MobileCategoryTab as="a">전체</MobileCategoryTab>
        </Link>
        {topic.parentCategories?.map((cat) => (
          <Link key={cat._id} href={`/knowledge-base/category?id=${cat._id}`}>
            <MobileCategoryTab as="a" active={cat._id === category._id}>
              {cat.title}
            </MobileCategoryTab>
          </Link>
        ))}
      </MobileCategoryNav>
      <KbThreeCol>
        <KbLeftCol>
          <SideBar
            parentCategories={topic.parentCategories}
            category={category}
            articleId={article._id}
            config={config}
          />
        </KbLeftCol>

        <KbCenterCol>
          <SingleArticle article={article} loading={loading} config={config} />
        </KbCenterCol>

        <KbRightCol>
          <KbRightPanel
            topicId={topic._id}
            categoryId={category._id}
            toc={toc}
          />
        </KbRightCol>
      </KbThreeCol>
    </KbPageContainer>
  );
}

export default ArticleDetail;
