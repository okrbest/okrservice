import React, { useState } from 'react';
import { Config, IKbArticle } from '../../types';
import { pickManualLink } from '../utils/faqDisplay';
import FaqQuestionRow from './browse/FaqQuestionRow';
import { FaqGroup } from './browse/browseStyles';
import { FaqEmpty } from './faqStyles';
import { ResultBar, SortButton } from './styles';

type SortType = 'relevance' | 'latest';

type Props = {
  articles: IKbArticle[];
  config: Config;
  searchValue?: string;
};

function NoResult({
  searchValue,
  config,
}: {
  searchValue?: string;
  config: Config;
}) {
  const manual = pickManualLink(config.externalLinks);

  return (
    <FaqEmpty>
      <span className="material-icons">search_off</span>
      <h4>‘{searchValue}’에 대한 검색 결과가 없어요.</h4>
      <p>다른 말로 검색하거나 매뉴얼을 확인해 보세요.</p>
      {manual && (
        <a href={manual.url} target="_blank" rel="noopener noreferrer">
          매뉴얼 보러 가기 →
        </a>
      )}
      {config.ticketToggle && (
        <p>서비스데스크에서 티켓을 발급받아 문의할 수도 있어요.</p>
      )}
    </FaqEmpty>
  );
}

const byLatest = (a: IKbArticle, b: IKbArticle) =>
  new Date(b.modifiedDate || b.createdDate).getTime() -
  new Date(a.modifiedDate || a.createdDate).getTime();

// 검색 결과 목록(시안 C 가운데 칸)
function ArticleList({ articles, config, searchValue }: Props) {
  const [sort, setSort] = useState<SortType>('relevance');

  if (!articles || articles.length === 0) {
    return (
      <FaqGroup>
        <NoResult searchValue={searchValue} config={config} />
      </FaqGroup>
    );
  }

  // relevance: 서버 순서 유지
  const sorted = sort === 'latest' ? [...articles].sort(byLatest) : articles;

  return (
    <FaqGroup>
      <ResultBar>
        <span>
          ‘{searchValue}’ 검색 결과 <strong>{articles.length}</strong>개
        </span>
        <div className="sort-group">
          <SortButton
            active={sort === 'relevance'}
            onClick={() => setSort('relevance')}
          >
            정확도순
          </SortButton>
          <SortButton
            active={sort === 'latest'}
            onClick={() => setSort('latest')}
          >
            최신순
          </SortButton>
        </div>
      </ResultBar>
      {sorted.map((article) => (
        <FaqQuestionRow
          key={article._id}
          article={article}
          searchValue={searchValue}
        />
      ))}
    </FaqGroup>
  );
}

export default ArticleList;
