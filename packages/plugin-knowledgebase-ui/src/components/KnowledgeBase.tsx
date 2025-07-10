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

  // 디버깅 로그 추가
  console.log('=== KnowledgeBase Debug Info ===');
  console.log('queryParams:', queryParams);
  console.log('currentCategory:', currentCategory);
  console.log('currentCategory._id:', currentCategory._id);
  console.log('allArticles count:', allArticles.length);
  console.log('allArticles:', allArticles);
  
  // 필터링된 아티클들 확인
  const isMainCategory = queryParams?.id === "main-category";
  const filteredArticles = isMainCategory
    ? allArticles.filter((a) => a.isPrivate)
    : allArticles.filter(
        (a) => a.categoryId && a.categoryId === currentCategory._id
      );
  
  console.log('isMainCategory:', isMainCategory);
  console.log('filteredArticles count:', filteredArticles.length);
  console.log('filteredArticles:', filteredArticles);
  
  // 각 아티클의 categoryId 확인
  allArticles.forEach((article, index) => {
    console.log(`Article ${index + 1}:`, {
      id: article._id,
      title: article.title,
      categoryId: article.categoryId,
      isPrivate: article.isPrivate,
      matchesCategory: article.categoryId === currentCategory._id
    });
  });

  // 문제 진단 정보 추가
  console.log('=== 문제 진단 ===');
  console.log('1. allArticles count가 0이면: 백엔드 쿼리에서 아티클을 가져오지 못함');
  console.log('   현재 allArticles count:', allArticles.length);
  console.log('   진단 결과:', allArticles.length === 0 ? '❌ 문제 발견: 아티클을 가져오지 못함' : '✅ 정상: 아티클을 가져옴');
  
  console.log('2. filteredArticles count가 0이면: 필터링 조건에 맞는 아티클이 없음');
  console.log('   현재 filteredArticles count:', filteredArticles.length);
  console.log('   진단 결과:', filteredArticles.length === 0 ? '❌ 문제 발견: 필터링된 아티클이 없음' : '✅ 정상: 필터링된 아티클이 있음');
  
  console.log('3. 현재 카테고리에 속한 아티클 분석:');
  const currentCategoryArticles = allArticles.filter(article => 
    article.categoryId === currentCategory._id
  );
  console.log('   현재 카테고리 ID:', currentCategory._id);
  console.log('   현재 카테고리에 속한 아티클 수:', currentCategoryArticles.length);
  console.log('   다른 카테고리에 속한 아티클 수:', allArticles.length - currentCategoryArticles.length);
  console.log('   진단 결과:', currentCategoryArticles.length === 0 ? '❌ 문제 발견: 현재 카테고리에 아티클이 없음' : '✅ 정상: 현재 카테고리에 아티클이 있음');
  
  console.log('4. 현재 카테고리 정보:');
  console.log('   카테고리 ID:', currentCategory._id);
  console.log('   카테고리 제목:', currentCategory.title);
  console.log('   메인 카테고리 여부:', isMainCategory);
  
  // 현재 카테고리에 속한 아티클들 상세 정보
  if (currentCategoryArticles.length > 0) {
    console.log('5. 현재 카테고리에 속한 아티클들:');
    currentCategoryArticles.forEach((article, index) => {
      console.log(`   아티클 ${index + 1}:`, {
        id: article._id,
        title: article.title,
        categoryId: article.categoryId,
        isPrivate: article.isPrivate
      });
    });
  } else {
    console.log('5. 현재 카테고리에 속한 아티클이 없음');
  }
  
  // 실제 UI에 렌더링되는 아티클들과 비교
  console.log('6. UI 렌더링 비교:');
  console.log('   필터링된 아티클 수 (UI에 표시될 예정):', filteredArticles.length);
  console.log('   실제 카테고리에 속한 아티클 수:', currentCategoryArticles.length);
  console.log('   차이:', currentCategoryArticles.length - filteredArticles.length);
  
  if (currentCategoryArticles.length !== filteredArticles.length) {
    console.log('❌ 문제 발견: 필터링된 아티클 수와 실제 아티클 수가 다름');
    console.log('   필터링되지 않은 아티클들:');
    const unfilteredArticles = currentCategoryArticles.filter(article => 
      !filteredArticles.find(fa => fa._id === article._id)
    );
    unfilteredArticles.forEach((article, index) => {
      console.log(`   미표시 아티클 ${index + 1}:`, {
        id: article._id,
        title: article.title,
        categoryId: article.categoryId,
        isPrivate: article.isPrivate,
        shouldBeVisible: !isMainCategory || article.isPrivate
      });
    });
  } else {
    console.log('✅ 정상: 필터링된 아티클 수와 실제 아티클 수가 일치');
  }
  
  console.log('=== 진단 완료 ===');

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
