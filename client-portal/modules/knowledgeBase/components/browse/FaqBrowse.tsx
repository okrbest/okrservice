import Link from 'next/link';
import React from 'react';
import { Topic } from '../../../types';
import useFaqArticles from '../../containers/useFaqArticles';
import { flattenCategories, stripCategoryNumber } from '../../utils/faqDisplay';
import { FaqEmpty, FaqSkeleton } from '../faqStyles';
import SideBar from '../SideBar';
import {
  FaqBrowseLayout,
  FaqBrowseMain,
  FaqBrowseRight,
  FaqBrowseSide,
  FaqMobileChip,
  FaqMobileChips,
} from './browseStyles';

type Props = {
  topic: Topic;
  activeCategoryId?: string;
  allActive?: boolean;
  topSlot?: React.ReactNode;
  rightPanel?: React.ReactNode;
  loading?: boolean;
  error?: unknown;
  children?: React.ReactNode;
};

type ChipsProps = {
  topic: Topic;
  activeCategoryId?: string;
  allActive?: boolean;
  counts: Record<string, number>;
  total: number;
};

function MobileCategoryChips({
  topic,
  activeCategoryId,
  allActive,
  counts,
  total,
}: ChipsProps) {
  return (
    <FaqMobileChips aria-label="분류">
      <Link href="/knowledge-base?view=all" passHref={true}>
        <FaqMobileChip
          active={allActive}
          aria-current={allActive ? 'page' : undefined}
        >
          전체<small>{total}</small>
        </FaqMobileChip>
      </Link>
      {flattenCategories(topic.parentCategories).map(({ category }) => {
        const active = category._id === activeCategoryId;

        return (
          <Link
            key={category._id}
            href={`/knowledge-base/category?id=${category._id}`}
            passHref={true}
          >
            <FaqMobileChip
              active={active}
              aria-current={active ? 'page' : undefined}
            >
              {stripCategoryNumber(category.title)}
              <small>{counts[category._id] || 0}</small>
            </FaqMobileChip>
          </Link>
        );
      })}
    </FaqMobileChips>
  );
}

function MainContent({ loading, error, children }: Props) {
  if (loading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <FaqSkeleton key={i} h={180} />
        ))}
      </>
    );
  }

  if (error) {
    return (
      <FaqEmpty>
        <span className="material-icons" aria-hidden="true">
          cloud_off
        </span>
        <h4>질문을 불러오지 못했어요.</h4>
        <p>잠시 후 새로고침해 주세요.</p>
      </FaqEmpty>
    );
  }

  return <>{children}</>;
}

// 시안 C 틀: 왼쪽 분류 메뉴 · 가운데 목록 · 오른쪽 많이 본 질문(휴대폰은 위쪽 분류 칩)
function FaqBrowse(props: Props) {
  const { topic, activeCategoryId, allActive, topSlot, rightPanel } = props;
  // 메뉴 숫자는 검색과 상관없이 전체 목록 기준(같은 질의라 추가 요청 없음)
  const { counts, total } = useFaqArticles(topic);
  const navProps = { activeCategoryId, allActive, counts, total };

  return (
    <>
      <MobileCategoryChips topic={topic} {...navProps} />
      <FaqBrowseLayout>
        <FaqBrowseSide>
          <SideBar parentCategories={topic.parentCategories} {...navProps} />
        </FaqBrowseSide>
        <FaqBrowseMain>
          {topSlot}
          <MainContent {...props} />
        </FaqBrowseMain>
        {rightPanel && <FaqBrowseRight>{rightPanel}</FaqBrowseRight>}
      </FaqBrowseLayout>
    </>
  );
}

export default FaqBrowse;
