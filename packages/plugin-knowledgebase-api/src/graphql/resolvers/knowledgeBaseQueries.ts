import { checkPermission, paginate, requireLogin } from '@erxes/api-utils/src';

import { IContext } from '../../connectionResolver';

// Helper function for common query selector
const getCommonQuerySelector = (context: IContext) => {
  const disableBrandFiltering = process.env.DISABLE_KB_BRAND_FILTERING === 'true';
  
  if (disableBrandFiltering) {
    return {};
  }

  const { commonQuerySelector } = context;
  return commonQuerySelector || {};
};

const findDetail = async (model, _id) => {
  return await model.findOne({ $or: [{ _id }, { code: _id }] });
};

const buildQuery = (args: any) => {
  const qry: any = {};

  const keys = ['codes', 'categoryIds', 'articleIds', 'topicIds'];

  keys.forEach((key) => {
    if (args[key] && args[key].length > 0) {
      const field = key.replace('s', '');
      qry[field] = { $in: args[key] };
    }
  });

  if (args.searchValue && args.searchValue.trim()) {
    qry.$or = [
      { title: { $regex: `.*${args.searchValue.trim()}.*`, $options: 'i' } },
      { content: { $regex: `.*${args.searchValue.trim()}.*`, $options: 'i' } },
      { summary: { $regex: `.*${args.searchValue.trim()}.*`, $options: 'i' } },
    ];
  }

  if (args.brandId) {
    qry.brandId = args.brandId;
  }

  if (args.icon) {
    qry.icon = args.icon;
  }

  if (args?.ids?.length) {
    qry._id = { $in: args.ids };
  }

  if (args?.status) {
    qry.status = args.status;
  }

  return qry;
};

const knowledgeBaseQueries = {
  /**
   * Article list
   */
  async knowledgeBaseArticles(
    _root,
    args: {
      page?: number;
      perPage?: number;
      searchValue?: string;
      categoryIds: string[];
      articleIds: string[];
      codes: string[];
      topicIds: string[];
      sortField?: string;
      sortDirection?: number;
      status?: string;
    },
    context: IContext
  ) {
    const selector: any = buildQuery(args);
    let sort: any = { createdDate: -1 };

    // 기본값 설정
    const page = args.page || 1;
    const perPage = args.perPage || 20;
    const pageArgs = { page, perPage };

    if (args.topicIds && args.topicIds.length > 0) {
      const categoryIds = await context.models.KnowledgeBaseCategories.find({
        topicId: { $in: args.topicIds },
      }).distinct('_id');

      selector.categoryId = { $in: categoryIds };

      delete selector.topicIds;
    }

    if (args.sortField) {
      sort = { [args.sortField]: args.sortDirection };
    }

    // Use getCommonQuerySelector for conditional brand filtering
    const finalSelector = {
      ...selector,
      ...getCommonQuerySelector(context),
    };
    
    console.log('Final query selector:', finalSelector);

    const articles = context.models.KnowledgeBaseArticles.find(finalSelector).sort(sort);
    
    const result = await paginate(articles, pageArgs);
    console.log('Query result count:', result.length);
    console.log('Query result:', result);

    // 백엔드 진단 정보 추가
    console.log('=== 백엔드 쿼리 진단 ===');
    console.log('1. 쿼리 파라미터 분석:');
    console.log('   page:', page);
    console.log('   perPage:', perPage);
    console.log('   categoryIds:', args.categoryIds);
    console.log('   articleIds:', args.articleIds);
    console.log('   topicIds:', args.topicIds);
    console.log('   status:', args.status);
    
    console.log('2. 필터링 분석:');
    console.log('   기본 selector:', selector);
    console.log('   commonQuerySelector:', context.commonQuerySelector);
    console.log('   최종 selector:', finalSelector);
    
    console.log('3. 결과 분석:');
    console.log('   결과 개수:', result.length);
    console.log('   결과가 비어있음:', result.length === 0);
    
    if (result.length === 0) {
      console.log('❌ 문제 발견: 아티클이 없음');
      console.log('   가능한 원인:');
      console.log('   - commonQuerySelector가 너무 제한적');
      console.log('   - categoryIds가 잘못됨');
      console.log('   - 데이터베이스에 아티클이 없음');
    } else {
      console.log('✅ 정상: 아티클을 가져옴');
    }

    return result;
  },

  /**
   * Article detail
   */
  async knowledgeBaseArticleDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return findDetail(models.KnowledgeBaseArticles, _id);
  },

  /**
   * Article detail anc increase a view count
   */
  async knowledgeBaseArticleDetailAndIncViewCount(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return models.KnowledgeBaseArticles.findOneAndUpdate(
      { _id },
      { $inc: { viewCount: 1 } },
      { new: true }
    );
  },

  /**
   * Total article count
   */
  async knowledgeBaseArticlesTotalCount(
    _root,
    args,
    { models }: IContext
  ) {
    const qry: any = buildQuery(args);

    return models.KnowledgeBaseArticles.find(qry).countDocuments();
  },

  /**
   * Category list
   */
  async knowledgeBaseCategories(
    _root,
    args: {
      ids: string[];
      page: number;
      perPage: number;
      topicIds: string[];
      codes: string[];
      icon: string;
    },
    { models }: IContext
  ) {
    const qry: any = buildQuery(args);

    const categories = models.KnowledgeBaseCategories.find(qry).sort({
      title: 1,
    });

    const { page, perPage } = args;

    if (!page && !perPage) {
      return categories;
    }

    return paginate(categories, { page, perPage });
  },

  /**
   * Category detail
   */
  async knowledgeBaseCategoryDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return findDetail(models.KnowledgeBaseCategories, _id);
  },

  /**
   * Category total count
   */
  async knowledgeBaseCategoriesTotalCount(
    _root,
    args: { topicIds: string[]; codes: string[] },
    { models }: IContext
  ) {
    const qry: any = buildQuery(args);

    return models.KnowledgeBaseCategories.find(qry).countDocuments();
  },

  /**
   * Get last category
   */
  async knowledgeBaseCategoriesGetLast(
    _root,
    _args,
    { commonQuerySelector, models }: IContext
  ) {
    return models.KnowledgeBaseCategories.findOne(commonQuerySelector).sort({
      createdDate: -1,
    });
  },

  /**
   * Topic list
   */
  async knowledgeBaseTopics(
    _root,
    args: { page: number; perPage: number; brandId: string; codes: string[] },
    { commonQuerySelector, models }: IContext
  ) {
    const qry: any = buildQuery(args);

    const topics = models.KnowledgeBaseTopics.find({
      ...qry,
      ...commonQuerySelector,
    }).sort({ modifiedDate: -1 });

    return paginate(topics, args);
  },

  /**
   * Topic detail
   */
  async knowledgeBaseTopicDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return findDetail(models.KnowledgeBaseTopics, _id);
  },

  /**
   * Total topic count
   */
  async knowledgeBaseTopicsTotalCount(
    _root,
    _args,
    { commonQuerySelector, models }: IContext
  ) {
    return models.KnowledgeBaseTopics.find(
      commonQuerySelector
    ).countDocuments();
  },
};

requireLogin(knowledgeBaseQueries, 'knowledgeBaseArticlesTotalCount');
requireLogin(knowledgeBaseQueries, 'knowledgeBaseTopicsTotalCount');
requireLogin(knowledgeBaseQueries, 'knowledgeBaseCategoriesGetLast');
requireLogin(knowledgeBaseQueries, 'knowledgeBaseCategoriesTotalCount');

checkPermission(
  knowledgeBaseQueries,
  'knowledgeBaseArticles',
  'showKnowledgeBase',
  []
);
checkPermission(
  knowledgeBaseQueries,
  'knowledgeBaseTopics',
  'showKnowledgeBase',
  []
);
checkPermission(
  knowledgeBaseQueries,
  'knowledgeBaseCategories',
  'showKnowledgeBase',
  []
);

export default knowledgeBaseQueries;
