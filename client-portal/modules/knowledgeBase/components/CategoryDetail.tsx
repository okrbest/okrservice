import Link from 'next/link';
import React from 'react';
import { IKbArticle, IKbCategory, Topic } from '../../types';
import useFaqArticles from '../containers/useFaqArticles';
import { CategoryPath, findCategoryPath } from '../utils/faqCategories';
import {
  categoryTone,
  flattenCategories,
  stripCategoryNumber,
} from '../utils/faqDisplay';
import FaqBrowse from './browse/FaqBrowse';
import FaqQuestionRow from './browse/FaqQuestionRow';
import {
  FaqCrumb,
  FaqGroup,
  FaqGroupHead,
  FaqGroupIcon,
} from './browse/browseStyles';
import { FaqEmpty } from './faqStyles';
import HeroSearch from './HeroSearch';
import KbRightPanel from './KbRightPanel';
import { ERXES_TO_MATERIAL } from './SideBar';

type Props = {
  categoryId: string;
  topic: Topic;
};

function NotFound() {
  return (
    <FaqEmpty>
      <span className="material-icons" aria-hidden="true">
        folder_off
      </span>
      <h4>찾는 분류가 없어요.</h4>
      <p>분류가 바뀌었거나 주소가 잘못됐을 수 있어요.</p>
      <Link href="/knowledge-base?view=all">
        <a>전체 질문 보기 →</a>
      </Link>
    </FaqEmpty>
  );
}

// "전체 › 상위 분류 › 분류" 경로
export function CategoryCrumb({
  path,
}: {
  path: CategoryPath<IKbCategory> | null;
}) {
  const link = (cat: IKbCategory, bold = false) => (
    <Link href={`/knowledge-base/category?id=${cat._id}`}>
      <a>
        {bold ? (
          <b>{stripCategoryNumber(cat.title)}</b>
        ) : (
          stripCategoryNumber(cat.title)
        )}
      </a>
    </Link>
  );

  return (
    <FaqCrumb>
      <Link href="/knowledge-base?view=all">
        <a>전체</a>
      </Link>
      {path?.parent && <> › {link(path.parent)}</>}
      {path && <> › {link(path.category, true)}</>}
    </FaqCrumb>
  );
}

type QuestionsProps = {
  category: IKbCategory;
  index: number;
  articles: IKbArticle[];
};

function CategoryQuestions({ category, index, articles }: QuestionsProps) {
  const tone = categoryTone(Math.max(index, 0));

  return (
    <FaqGroup>
      <FaqGroupHead>
        <FaqGroupIcon bg={tone.bg} fg={tone.fg}>
          <span className="material-icons" aria-hidden="true">
            {ERXES_TO_MATERIAL[category.icon] || 'folder'}
          </span>
        </FaqGroupIcon>
        {stripCategoryNumber(category.title)}
        <small>{articles.length}개</small>
      </FaqGroupHead>
      {articles.length === 0 && (
        <FaqEmpty>
          <p>아직 이 분류에 질문이 없어요.</p>
        </FaqEmpty>
      )}
      {articles.map((article) => (
        <FaqQuestionRow key={article._id} article={article} />
      ))}
    </FaqGroup>
  );
}

// 분류 화면: 그 분류(+하위 분류) 질문 전부(서버 순서)
function CategoryDetail({ categoryId, topic }: Props) {
  const { loading, error, seed, inScope } = useFaqArticles(topic);
  const path = findCategoryPath(topic, categoryId);
  const index = flattenCategories(topic.parentCategories).findIndex(
    ({ category }) => category._id === categoryId,
  );

  return (
    <FaqBrowse
      topic={topic}
      activeCategoryId={categoryId}
      loading={loading}
      error={error}
      topSlot={
        <>
          <HeroSearch topicId={topic._id} variant="compact" />
          {path && <CategoryCrumb path={path} />}
        </>
      }
      rightPanel={
        path && (
          <KbRightPanel topic={topic} categoryId={categoryId} seed={seed} />
        )
      }
    >
      {path ? (
        <CategoryQuestions
          category={path.category}
          index={index}
          articles={inScope(path.category)}
        />
      ) : (
        <NotFound />
      )}
    </FaqBrowse>
  );
}

export default CategoryDetail;
