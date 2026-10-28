const categoryFields = `
  _id
  title
  description
  icon
  numOfArticles
  authors {
    _id
    details {
      fullName
      avatar
    }
  }
`;

export const getKbTopicQuery = `
  query knowledgeBaseTopicDetail($_id: String!) {
    clientPortalKnowledgeBaseTopicDetail(_id: $_id) {
      _id
      title
      description
      color
      backgroundImage
      languageCode

      categories {
        ${categoryFields}
      }
      
      parentCategories {
        ${categoryFields}
        childrens {
          ${categoryFields}
        }
        articles{
          _id
          title        
        }
      }
    }
  }
`;

export const articleDetailQuery = `
  query knowledgeBaseArticleDetail($_id: String!) {
    knowledgeBaseArticleDetail(_id: $_id) {
      _id
      title
      viewCount
      summary
      content
      status
      forms {
        brandId
        formId
      }
      reactionChoices
      reactionCounts
      createdBy
      createdUser {
        details {
          fullName
          avatar
        }
      }
      publishedUser {
        details {
          fullName
          avatar
        }
      }
      categoryId
      createdDate
      modifiedBy
      modifiedDate
      attachments {
        url
        name
        type
        size
      }
    }
  }
`;

export const articleReactMutation = `
  mutation knowledgeBaseArticleReact($_id: String!, $reaction: String!) {
    knowledgeBaseArticleReact(_id: $_id, reaction: $reaction)
  }
`;

// FAQ 목록용: 본문(content) 없이 목록에 필요한 필드만 받는다.
// 서버는 검색어가 없으면 topicId로 거르지 않으므로 categoryIds(이 주제의 분류)로 한정한다
export const articleListQuery = `
  query faqArticleList($topicId: String, $categoryIds: [String], $searchValue: String, $isPrivate: Boolean) {
    clientPortalKnowledgeBaseArticles(topicId: $topicId, categoryIds: $categoryIds, searchValue: $searchValue, isPrivate: $isPrivate) {
      _id
      title
      summary
      viewCount
      categoryId
      createdDate
      modifiedDate
      publishedAt
    }
  }
`;

// 본문을 받으면서 조회수를 1 올린다(필드는 articleDetailQuery와 같음)
export const articleDetailAndIncViewCountQuery = articleDetailQuery
  .replace(
    'query knowledgeBaseArticleDetail(',
    'query knowledgeBaseArticleDetailAndIncViewCount(',
  )
  .replace(
    'knowledgeBaseArticleDetail(_id: $_id)',
    'knowledgeBaseArticleDetailAndIncViewCount(_id: $_id)',
  );
