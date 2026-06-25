import ArticleForm from "../containers/article/ArticleForm";
import ArticleList from "../containers/article/ArticleList";
import Button from "@erxes/ui/src/components/Button";
import { IArticle, ICategory } from "@erxes/ui-knowledgebase/src/types";
import KnowledgeList from "../containers/knowledge/KnowledgeList";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import Pagination from "@erxes/ui/src/components/pagination/Pagination";
import React from "react";
import Wrapper from "@erxes/ui/src/layout/components/Wrapper";
import { __ } from "coreui/utils";
import { Title } from "@erxes/ui-settings/src/styles";
import { StatsBar, StatCard } from "./article/styles";

type Props = {
  queryParams: any;
  articlesCount: number;
  currentCategory: ICategory;
  allArticles: IArticle[];
};

function getFeedbackStats(reactionCounts: any) {
  const counts = reactionCounts || {};
  const helpful = counts.helpful || 0;
  const notHelpful = counts.not_helpful || 0;
  const total = helpful + notHelpful;
  const ratio = total > 0 ? Math.round((helpful / total) * 100) : null;
  return { helpful, notHelpful, total, ratio };
}

function buildAggregateStats(articles: IArticle[]) {
  let totalHelpful = 0;
  let totalNotHelpful = 0;
  let needsImprovement = 0;
  let noFeedback = 0;

  articles.forEach((a) => {
    const { helpful, notHelpful, total, ratio } = getFeedbackStats(a.reactionCounts);
    totalHelpful += helpful;
    totalNotHelpful += notHelpful;
    if (total === 0) noFeedback++;
    else if (ratio !== null && ratio < 50 && total >= 3) needsImprovement++;
  });

  const totalFeedback = totalHelpful + totalNotHelpful;
  const overallRatio = totalFeedback > 0
    ? Math.round((totalHelpful / totalFeedback) * 100)
    : null;

  return { totalHelpful, totalNotHelpful, overallRatio, needsImprovement, noFeedback };
}

const KnowledgeBase = (props: Props) => {
  const { articlesCount, queryParams, currentCategory, allArticles } = props;

  const isMainCategory = queryParams?.id === "main-category";

  const displayedArticles = isMainCategory
    ? allArticles.filter((a) => a.isPrivate)
    : allArticles.filter((a) => a.categoryId && a.categoryId === currentCategory._id);

  const stats = buildAggregateStats(displayedArticles);

  const breadcrumb = () => {
    const current = currentCategory || ({ title: "", firstTopic: { title: "" } } as ICategory);
    const topic = current.firstTopic || { title: "" };
    const list = [{ title: __("Knowledge Base"), link: "/knowledgeBase" }];
    const categoryLink = `/knowledgeBase?id=${current._id}`;
    if (topic.title) list.push({ title: topic.title, link: current ? categoryLink : "" });
    if (current.title) list.push({ title: current.title, link: categoryLink });
    return list;
  };

  const content = (formProps) => (
    <ArticleForm
      {...formProps}
      queryParams={queryParams}
      currentCategoryId={currentCategory._id}
      topicId={currentCategory.firstTopic && currentCategory.firstTopic._id}
    />
  );

  const renderStats = () => {
    if (displayedArticles.length === 0) return null;

    const ratioColor = stats.overallRatio === null
      ? '#6b7280'
      : stats.overallRatio >= 70 ? '#16a34a'
      : stats.overallRatio >= 50 ? '#d97706'
      : '#dc2626';

    return (
      <StatsBar>
        <StatCard accent="#3b82f6">
          <div className="stat-label">전체 문서</div>
          <div className="stat-value">{displayedArticles.length}</div>
          <div className="stat-sub">이 카테고리</div>
        </StatCard>

        <StatCard accent="#16a34a">
          <div className="stat-label">👍 도움됐어요</div>
          <div className="stat-value">{stats.totalHelpful}</div>
          <div className="stat-sub">총 피드백 {stats.totalHelpful + stats.totalNotHelpful}건</div>
        </StatCard>

        <StatCard accent="#dc2626">
          <div className="stat-label">👎 아니에요</div>
          <div className="stat-value">{stats.totalNotHelpful}</div>
          <div className="stat-sub">전체 피드백 중</div>
        </StatCard>

        <StatCard accent={ratioColor}>
          <div className="stat-label">전체 도움도</div>
          <div className="stat-value" style={{ color: ratioColor }}>
            {stats.overallRatio !== null ? `${stats.overallRatio}%` : '—'}
          </div>
          <div className="stat-sub">
            {stats.overallRatio === null ? '피드백 없음' :
             stats.overallRatio >= 70 ? '양호' :
             stats.overallRatio >= 50 ? '보통' : '개선 필요'}
          </div>
        </StatCard>

        <StatCard accent="#dc2626">
          <div className="stat-label">⚠ 개선 필요</div>
          <div className="stat-value" style={{ color: stats.needsImprovement > 0 ? '#dc2626' : '#16a34a' }}>
            {stats.needsImprovement}건
          </div>
          <div className="stat-sub">도움도 50% 미만</div>
        </StatCard>

        <StatCard accent="#9ca3af">
          <div className="stat-label">피드백 없음</div>
          <div className="stat-value">{stats.noFeedback}</div>
          <div className="stat-sub">아직 평가 없음</div>
        </StatCard>
      </StatsBar>
    );
  };

  const renderActionBar = () => {
    const trigger = (
      <Button btnStyle="success" icon="plus-circle">
        Add Article
      </Button>
    );

    const actionBarLeft = currentCategory._id && (
      <ModalTrigger
        title={__("Add Article")}
        trigger={trigger}
        size="lg"
        autoOpenKey="showKBAddArticleModal"
        content={content}
        enforceFocus={false}
      />
    );

    const leftActionBar = (
      <Title>
        {isMainCategory
          ? `${__("Main Articles")}(${allArticles.filter((a) => a.isPrivate).length})`
          : `${currentCategory.title || ""} (${articlesCount})`}
      </Title>
    );

    return <Wrapper.ActionBar left={leftActionBar} right={actionBarLeft} />;
  };

  return (
    <Wrapper
      header={
        <Wrapper.Header
          title={`${currentCategory.title || ""}`}
          breadcrumb={breadcrumb()}
        />
      }
      leftSidebar={
        <KnowledgeList
          currentCategoryId={currentCategory._id}
          articlesCount={articlesCount}
          queryParams={{ ...queryParams, articles: allArticles }}
        />
      }
      actionBar={renderActionBar()}
      footer={
        !isMainCategory && (
          <Pagination
            count={articlesCount}
            perPage={Number(queryParams.perPage) > 0 ? Number(queryParams.perPage) : 20}
          />
        )
      }
      transparent={true}
      content={
        <>
          {renderStats()}
          <ArticleList
            queryParams={{ ...queryParams, articles: allArticles }}
            currentCategoryId={isMainCategory ? "main-category" : currentCategory._id}
            topicId={currentCategory.firstTopic && currentCategory.firstTopic._id}
            loading={false}
            isMainCategory={isMainCategory}
            articles={displayedArticles}
          />
        </>
      }
      hasBorder={true}
    />
  );
};

export default KnowledgeBase;
