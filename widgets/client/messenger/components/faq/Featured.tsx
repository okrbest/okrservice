import * as React from "react";

import {
  IconFeaturedChevronRight,
  IconFeaturedSearch,
} from "../../../icons/Icons";

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

const LeadConnect = asyncComponent(
  () =>
    import(
      /* webpackChunkName: "MessengerLeadConnect" */ "../../containers/lead/LeadConnect"
    )
);

const Featured: React.FC = () => {
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

    const articles = articlesData?.widgetsKnowledgeBaseArticles || [];

    if (articles.length === 0) {
      return (
        <div className="empty-articles">{__("No recent articles")}</div>
      );
    }
  
    const recentArticles = articles.slice(0, 5);
  
    return <Articles articles={recentArticles} />;
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
      {renderLead()}
    </>
  );
};

export default Featured;
