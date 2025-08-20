import * as React from "react";

import {
  IconFeaturedChevronRight,
  IconFeaturedSearch,
} from "../../../icons/Icons";
import { IArticle } from "@erxes/ui-knowledgebase/src/types";
import Card from "../Card.tsx";
import { GET_FAQ_TOPIC } from "../../graphql/queries";
import { IFaqCategory } from "../../types";
import { __ } from "../../../utils";
import asyncComponent from "../../../AsyncComponent";
import { connection } from "../../connection";
import { getMessengerData } from "../../utils/util";
import { useQuery } from "@apollo/client";
import { useRouter } from "../../context/Router";
import gql from "graphql-tag";
import { faqSearchArticlesQuery } from "../../graphql/queries";
import Articles from "./Articles";

const getTodaySeed = () => {
  const today = new Date();
  return (
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  );
};

const stableArticleScore = (article: IArticle, todaySeed: number): number => {
  let hash = todaySeed;
  for (let i = 0; i < article._id.length; i++) {
    hash = (hash * 31 + article._id.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const LeadConnect = asyncComponent(
  () =>
    import(
      /* webpackChunkName: "MessengerLeadConnect" */ "../../containers/lead/LeadConnect"
    )
);

const Featured: React.FC = () => {
  const renderHardcodedArticles = () => {
    const hardcodedArticles = [
      {
        title: "포괄임금제, 법에는 없지만 현실에선 왜 여전히 쓰일까?",
        summary:
          "포괄임금제는 말 그대로 기본급 외의 수당(연장근로, 야간, 휴일수당 등)을 미리 포함해 지급하는 임금 방식이에요.",
        link: "https://5240.cloud/포괄임금제-의미-현실-폐지-대안/",
      },
    ];

    return (
      <ul className="featured-list-container">
        {hardcodedArticles.map((article, index) => (
          <li key={index} style={{ listStyle: "none", marginBottom: "1rem" }}>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "block",
                padding: "0.3rem",
                borderRadius: "8px",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                }}
              >
                {article.title}
              </div>
              <div style={{ color: "#888", fontSize: "0.95rem" }}>
                {article.summary}
              </div>
            </a>
          </li>
        ))}
      </ul>
    );
  };
  const { knowledgeBaseTopicId, formCodes } = getMessengerData();
  const topicId = knowledgeBaseTopicId;
  const brandCode = connection.setting.brand_id;

  const { goToFaqCategory, setActiveRoute } = useRouter();

  const { data, loading, error } = useQuery(GET_FAQ_TOPIC, {
    variables: { _id: topicId },
    skip: !topicId,
  });

  const {
    data: articlesData,
    loading: articlesLoading,
    error: articlesError,
  } = useQuery(gql(faqSearchArticlesQuery), {
    variables: { topicId, searchString: "" },
    skip: !topicId,
  });

  const handleFeaturedCategoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveRoute("faqCategories");
  };

  const handleCategoryClick = (category: IFaqCategory) => {
    goToFaqCategory(category);
  };

  const renderLead = () => {
    if (!formCodes || formCodes.length === 0) {
      return null;
    }

    return formCodes.map((formCode: string) => (
      <LeadConnect key={formCode} brandCode={brandCode} formCode={formCode} />
    ));
  };

  const renderRecentArticles = () => {
    if (articlesLoading) {
      return (
        <div className="category-detail-container">
          <div className="loader" />
        </div>
      );
    }

    if (articlesError) {
      return (
        <div className="empty-articles">{__("Error loading articles")}</div>
      );
    }

    const articles = (articlesData?.widgetsKnowledgeBaseArticles ||
      []) as IArticle[];

    const privateArticles = articles.filter((article) => article.isPrivate);

    const todaySeed = getTodaySeed();
    const stableSorted = [...privateArticles].sort((a, b) => {
      const scoreA = stableArticleScore(a, todaySeed);
      const scoreB = stableArticleScore(b, todaySeed);
      return scoreA - scoreB;
    });

    const dailyPrivateArticles = stableSorted.slice(0, 3);

    if (articles.length === 0) {
      return <div className="empty-articles">{__("No recent articles")}</div>;
    }

    return <Articles articles={dailyPrivateArticles} />;
  };

  const renderCategoryList = () => {
    if (loading) {
      return (
        <li>
          <div role="button" tabIndex={0} className="featured-list-item">
            <div className="item-title">{`${__("Loading")}...`}</div>
            <div className="icon-wrapper">
              <IconFeaturedChevronRight />
            </div>
          </div>
        </li>
      );
    }

    if (error) {
      return (
        <li>
          <div className="featured-list-item">
            <div className="item-title">{__("Error loading categories")}</div>
          </div>
        </li>
      );
    }

    const categories = data?.knowledgeBaseTopicDetail?.parentCategories;

    if (!categories || categories.length === 0) {
      return (
        <li>
          <div className="featured-list-item">
            <div className="item-title">{__("No categories available")}</div>
          </div>
        </li>
      );
    }

    return categories.map((category: IFaqCategory) => (
      <li key={category._id}>
        <div
          role="button"
          tabIndex={0}
          className="featured-list-item"
          onClick={() => handleCategoryClick(category)}
          onKeyDown={(e) => e.key === "Enter" && handleCategoryClick(category)}
        >
          <div className="item-title">{category.title}</div>
          <div className="icon-wrapper">
            <IconFeaturedChevronRight />
          </div>
        </div>
      </li>
    ));
  };

  return (
    <>
      <Card p="0.5rem">
        <div className="featured-container">
          <button
            className="featured-search"
            onClick={handleFeaturedCategoryClick}
          >
            <span>{__("Search for help")}</span>
            <IconFeaturedSearch />
          </button>
          <ul className="featured-list-container">{renderRecentArticles()}</ul>
        </div>
      </Card>
      <Card p="0.5rem">
        <div className="featured-container">{renderHardcodedArticles()}</div>
      </Card>
      {renderLead()}
    </>
  );
};

export default Featured;
