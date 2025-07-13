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

type Props = {
  queryParams: any;
  articlesCount: number;
  currentCategory: ICategory;
  allArticles: IArticle[]; // ✅ Added
};

const KnowledgeBase = (props: Props) => {
  const { articlesCount, queryParams, currentCategory, allArticles } = props;

  const breadcrumb = () => {
    const currentBreadcrumb =
      currentCategory ||
      ({
        title: "",
        firstTopic: { title: "" },
      } as ICategory);

    const currentKnowledgeBase = currentBreadcrumb.firstTopic || { title: "" };
    const list = [{ title: __("Knowledge Base"), link: "/knowledgeBase" }];
    const categoryLink = `/knowledgeBase?id=${currentBreadcrumb._id}`;

    if (currentKnowledgeBase.title) {
      list.push({
        title: currentKnowledgeBase.title,
        link: currentBreadcrumb ? categoryLink : "",
      });
    }

    if (currentBreadcrumb.title) {
      list.push({
        title: currentBreadcrumb.title,
        link: categoryLink,
      });
    }

    return list;
  };

  const content = (props) => (
    <ArticleForm
      {...props}
      queryParams={queryParams}
      currentCategoryId={currentCategory._id}
      topicId={currentCategory.firstTopic && currentCategory.firstTopic._id}
    />
  );

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
        {queryParams.id === "main-category"
          ? `${__("Main Articles")}(${allArticles.filter((a) => a.isPrivate).length})`
          : `${currentCategory.title || ""} (${articlesCount})`}
      </Title>
    );

    return <Wrapper.ActionBar left={leftActionBar} right={actionBarLeft} />;
  };

  const isPrivateCategory = queryParams?.id === "main-category";

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
          queryParams={{ ...queryParams, articles: allArticles }} // ✅ Use allArticles
        />
      }
      actionBar={renderActionBar()}
      footer={
        <Pagination
          count={
            queryParams.id === "main-category"
              ? allArticles.filter((a) => a.isPrivate).length
              : articlesCount
          }
        />
      }
      transparent={true}
      content={
        <ArticleList
          queryParams={{ ...queryParams, articles: allArticles }}
          currentCategoryId={currentCategory._id}
          topicId={currentCategory.firstTopic && currentCategory.firstTopic._id}
          loading={false}
          articles={
            queryParams?.id === "main-category"
              ? allArticles.filter((a) => a.isPrivate)
              : allArticles.filter(
                  (a) => a.categoryId && a.categoryId === currentCategory._id
                )
          }
        />
      }
      hasBorder={true}
    />
  );
};

export default KnowledgeBase;
