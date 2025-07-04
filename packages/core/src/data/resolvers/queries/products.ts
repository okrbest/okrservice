import {
  checkPermission,
  requireLogin
} from '@erxes/api-utils/src/permissions';
import { afterQueryWrapper, paginate } from '@erxes/api-utils/src';
import { escapeRegExp } from '@erxes/api-utils/src/core';
import { IContext, IModels } from '../../../connectionResolver';
import { sendSalesMessage } from '../../../messageBroker';
import {
  getSimilaritiesProducts,
  getSimilaritiesProductsCount
} from '../../../maskUtils';
import {
  ProductQueriesBuilder,
  countBySegmentProduct,
  countByTagProduct
} from '../../modules/product/productUtils';
import { PRODUCT_STATUSES } from '../../../db/models/definitions/products';

interface IQueryParams {
  ids?: string[];
  excludeIds?: boolean;
  type?: string;
  status?: string;
  categoryId?: string;
  searchValue?: string;
  vendorId?: string;
  brand?: string;
  tag: string;
  tags?: string[];
  excludeTags?: string[];
  tagWithRelated?: boolean;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: number;
  pipelineId?: string;
  boardId?: string;
  segment?: string;
  segmentData?: string;
  groupedSimilarity?: string;
  image?: string;
  bundleId?: string;
}

const generateFilter = async (
  subdomain: string,
  models: IModels,
  commonQuerySelector: any,
  params: IQueryParams
) => {
  const {
    type,
    categoryId,
    pipelineId,
    searchValue,
    vendorId,
    brand,
    tag,
    tags,
    excludeTags,
    tagWithRelated,
    ids,
    excludeIds,
    segment,
    segmentData,
    image,
    bundleId
  } = params;
  const filter: any = commonQuerySelector;
  const andFilters: any[] = [];

  filter.status = { $ne: PRODUCT_STATUSES.DELETED };

  if (params.status) {
    filter.status = params.status;
  }

  if (type) {
    filter.type = type;
  }

  if (pipelineId) {
    const pipeline =
      (await sendSalesMessage({
        subdomain,
        action: 'pipelines.findOne',
        data: { _id: pipelineId },
        isRPC: true,
        defaultValue: {}
      })) ?? {};

    if (pipeline.initialCategoryIds?.length) {
      let incCategories = await models.ProductCategories.getChildCategories(
        pipeline.initialCategoryIds
      );

      if (pipeline.excludeCategoryIds?.length) {
        const excCategories = await models.ProductCategories.getChildCategories(
          pipeline.initialCategoryIds
        );
        const excCatIds = excCategories.map(c => c._id);
        incCategories = incCategories.filter(c => !excCatIds.includes(c._id));
      }

      andFilters.push({ categoryId: { $in: incCategories.map(c => c._id) } });

      if (pipeline.excludeProductIds?.length) {
        andFilters.push({ _id: { $nin: pipeline.excludeProductIds } });
      }
    }
  }

  if (categoryId) {
    let categories = await models.ProductCategories.getChildCategories([
      categoryId
    ]);
    const catIds = categories.map(c => c._id);
    andFilters.push({ categoryId: { $in: catIds } });
  } else {
    const notActiveCategories = await models.ProductCategories.find({
      status: { $nin: [null, 'active'] }
    });

    andFilters.push({
      categoryId: { $nin: notActiveCategories.map(e => e._id) }
    });
  }

  if (ids && ids.length > 0) {
    filter._id = { [excludeIds ? '$nin' : '$in']: ids };
  }

  if (tag) {
    filter.tagIds = { $in: [tag] };
  }

  if (tags?.length) {
    let tagIds: string[] = tags;

    if (tagWithRelated) {
      const tagObjs = await models.Tags.find({ _id: { $in: tagIds } }).lean();
      tagObjs.forEach(tag => {
        tagIds = tagIds.concat(tag.relatedIds || []);
      });
    }

    andFilters.push({ tagIds: { $in: tagIds } });
  }

  if (excludeTags?.length) {
    let tagIds: string[] = excludeTags;

    if (tagWithRelated) {
      const tagObjs = await models.Tags.find({ _id: { $in: tagIds } }).lean();
      tagObjs.forEach(tag => {
        tagIds = tagIds.concat(tag.relatedIds || []);
      });
    }

    andFilters.push({ tagIds: { $nin: tagIds } });
  }

  // search =========
  if (searchValue) {
    const regex = new RegExp(`.*${escapeRegExp(searchValue)}.*`, 'i');

    let codeFilter = { code: { $in: [regex] } };
    if (
      searchValue.includes('.') ||
      searchValue.includes('_') ||
      searchValue.includes('*')
    ) {
      const codeRegex = new RegExp(
        `^${searchValue.replace(/\*/g, '.').replace(/_/g, '.')}$`,
        'igu'
      );
      codeFilter = { code: { $in: [codeRegex] } };
    }

    filter.$or = [
      codeFilter,
      { name: { $in: [regex] } },
      { barcodes: { $in: [searchValue] } }
    ];
  }

  if (segment || segmentData) {
    const qb = new ProductQueriesBuilder(
      models,
      subdomain,
      { segment, segmentData },
      {}
    );

    await qb.buildAllQueries();

    const { list } = await qb.runQueries();

    filter._id = { $in: list.map(l => l._id) };
  }

  if (vendorId) {
    filter.vendorId = vendorId;
  }

  if (brand) {
    filter.scopeBrandIds = { $in: [brand] };
  }

  if (image) {
    filter['attachment.url'] =
      image === 'hasImage' ? { $exists: true } : { $exists: false };
  }
  if (bundleId) {
    filter.bundleId = bundleId;
  }
  return { ...filter, ...(andFilters.length ? { $and: andFilters } : {}) };
};

const generateFilterCat = async ({
  models,
  parentId,
  withChild,
  searchValue,
  meta,
  brand,
  status,
  ids
}) => {
  const filter: any = {};
  filter.status = { $nin: ['disabled', 'archived'] };

  if (status && status !== 'active') {
    filter.status = status;
  }

  if (parentId) {
    if (withChild) {
      const category = await (
        models as IModels
      ).ProductCategories.getProductCategory({
        _id: parentId
      });

      const relatedCategoryIds = (
        await models.ProductCategories.find(
          { order: { $regex: new RegExp(`^${escapeRegExp(category.order)}`) } },
          { _id: 1 }
        ).lean()
      ).map(c => c._id);

      filter.parentId = { $in: relatedCategoryIds };
    } else {
      filter.parentId = parentId;
    }
  }

  if (brand) {
    filter.scopeBrandIds = { $in: [brand] };
  }

  if (meta) {
    if (!isNaN(meta)) {
      filter.meta = { $lte: Number(meta) };
    } else {
      filter.meta = meta;
    }
  }

  if (searchValue) {
    filter.name = new RegExp(`.*${searchValue}.*`, 'i');
  }

  if (ids?.length > 0) {
    filter._id = { $in: ids };
  }

  return filter;
};

const productQueries = {
  /**
   * Products list
   */
  async products(
    _root,
    params: IQueryParams,
    { commonQuerySelector, models, subdomain, user }: IContext
  ) {
    const filter = await generateFilter(
      subdomain,
      models,
      commonQuerySelector,
      params
    );

    const { sortField, sortDirection, page, perPage, ids, excludeIds } = params;

    const pagintationArgs = { page, perPage };
    if (
      ids &&
      ids.length &&
      !excludeIds &&
      ids.length > (pagintationArgs.perPage || 20)
    ) {
      pagintationArgs.page = 1;
      pagintationArgs.perPage = ids.length;
    }

    let sort: any = { code: 1 };
    if (sortField) {
      sort = { [sortField]: sortDirection || 1 };
    }

    if (params.groupedSimilarity) {
      return await getSimilaritiesProducts(models, filter, sort, {
        groupedSimilarity: params.groupedSimilarity,
        ...pagintationArgs
      });
    }

    return afterQueryWrapper(
      subdomain,
      'products',
      params,
      await paginate(
        models.Products.find(filter).sort(sort).lean(),
        pagintationArgs
      ),
      user
    );
  },

  async productsTotalCount(
    _root,
    params: IQueryParams,
    { commonQuerySelector, models, subdomain }: IContext
  ) {
    const filter = await generateFilter(
      subdomain,
      models,
      commonQuerySelector,
      params
    );

    if (params.groupedSimilarity) {
      return await getSimilaritiesProductsCount(models, filter, {
        groupedSimilarity: params.groupedSimilarity
      });
    }

    return models.Products.find(filter).countDocuments();
  },

  /**
   * Group product counts by segment or tag
   */
  async productsGroupCounts(
    _root,
    params,
    { commonQuerySelector, commonQuerySelectorElk, models, subdomain }: IContext
  ) {
    const counts = {
      bySegment: {},
      byTag: {}
    };

    const { only } = params;

    const qb = new ProductQueriesBuilder(models, subdomain, params, {
      commonQuerySelector,
      commonQuerySelectorElk
    });

    switch (only) {
      case 'byTag':
        counts.byTag = await countByTagProduct(models, 'core:product', qb);
        break;

      case 'bySegment':
        counts.bySegment = await countBySegmentProduct(
          models,
          'core:product',
          qb
        );
        break;
    }

    return counts;
  },

  async productSimilarities(
    _root,
    { _id, groupedSimilarity },
    { models }: IContext
  ) {
    const product = await models.Products.getProduct({ _id });

    if (groupedSimilarity === 'config') {
      const getRegex = str => {
        return ['*', '.', '_'].includes(str)
          ? new RegExp(
              `^${str
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.')
                .replace(/_/g, '.')}.*`,
              'igu'
            )
          : new RegExp(`.*${escapeRegExp(str)}.*`, 'igu');
      };

      const similarityGroups =
        await models.ProductsConfigs.getConfig('similarityGroup');

      const codeMasks = Object.keys(similarityGroups);
      const customFieldIds = (product.customFieldsData || []).map(
        cf => cf.field
      );

      const matchedMasks = codeMasks.filter(cm => {
        const mask = similarityGroups[cm];
        const filterFieldDef = mask.filterField || 'code';
        const regexer = getRegex(cm);

        if (filterFieldDef.includes('customFieldsData.')) {
          if (
            !(product.customFieldsData || []).find(
              cfd =>
                cfd.field === filterFieldDef.replace('customFieldsData.', '') &&
                cfd.stringValue?.match(regexer)
            )
          ) {
            return false;
          }
        } else {
          if (!product[filterFieldDef]?.match(regexer)) {
            return false;
          }
        }

        return (
          (similarityGroups[cm].rules || [])
            .map(sg => sg.fieldId)
            .filter(sgf => customFieldIds.includes(sgf)).length ===
          (similarityGroups[cm].rules || []).length
        );
      });

      if (!matchedMasks.length) {
        return {
          products: await models.Products.find({ _id })
        };
      }

      const codeRegexs: any[] = [];
      const fieldIds: string[] = [];
      const groups: { title: string; fieldId: string }[] = [];
      for (const matchedMask of matchedMasks) {
        const matched = similarityGroups[matchedMask];
        const filterFieldDef = matched.filterField || 'code';

        if (filterFieldDef.includes('customFieldsData.')) {
          codeRegexs.push({
            $and: [
              {
                'customFieldsData.field': filterFieldDef.replace(
                  'customFieldsData.',
                  ''
                )
              },
              {
                'customFieldsData.stringValue': {
                  $in: [getRegex(matchedMask)]
                }
              }
            ]
          });
        } else {
          codeRegexs.push({
            [filterFieldDef]: { $in: [getRegex(matchedMask)] }
          });
        }

        for (const rule of similarityGroups[matchedMask].rules || []) {
          const { fieldId, title } = rule;
          if (!fieldIds.includes(fieldId)) {
            fieldIds.push(fieldId);
            groups.push({ title, fieldId });
          }
        }
      }

      const filters: any = {
        $and: [
          {
            $or: codeRegexs
          },
          {
            'customFieldsData.field': { $in: fieldIds }
          }
        ]
      };

      let products = await models.Products.find(filters).sort({ code: 1 });
      if (!products.length) {
        products = [product];
      }
      return {
        products,
        groups
      };
    }

    const category = await models.ProductCategories.getProductCategory({
      _id: product.categoryId
    });
    if (!category.isSimilarity || !category.similarities?.length) {
      return {
        products: await models.Products.find({ _id })
      };
    }

    const fieldIds = category.similarities.map(r => r.fieldId);
    const filters: any = {
      $and: [
        {
          categoryId: category._id,
          'customFieldsData.field': { $in: fieldIds }
        }
      ]
    };

    const groups: {
      title: string;
      fieldId: string;
    }[] = category.similarities.map(r => ({ ...r }));

    return {
      products: await models.Products.find(filters).sort({ code: 1 }),
      groups
    };
  },

  async productCategories(
    _root,
    { parentId, withChild, searchValue, status, brand, meta, ids },
    { models }: IContext
  ) {
    const filter = await generateFilterCat({
      models,
      status,
      parentId,
      withChild,
      searchValue,
      brand,
      meta,
      ids
    });

    const sortParams: any = { order: 1 };

    return await models.ProductCategories.find(filter).sort(sortParams).lean();
  },

  async productCategoriesTotalCount(
    _root,
    { parentId, searchValue, status, withChild, brand, meta, ids },
    { models }: IContext
  ) {
    const filter = await generateFilterCat({
      models,
      parentId,
      withChild,
      searchValue,
      status,
      brand,
      meta,
      ids
    });
    return models.ProductCategories.find(filter).countDocuments();
  },

  async productDetail(_root, { _id }: { _id: string }, { models }: IContext) {
    return models.Products.findOne({ _id }).lean();
  },

  async productCategoryDetail(
    _root,
    { _id }: { _id: string },
    { models }: IContext
  ) {
    return models.ProductCategories.findOne({ _id }).lean();
  },

  async productCountByTags(_root, _params, { models, subdomain }: IContext) {
    const counts = {};

    const tags = await models.Tags.find({ type: 'core:product' }).lean();

    for (const tag of tags) {
      counts[tag._id] = await models.Products.find({
        tagIds: tag._id,
        status: { $ne: PRODUCT_STATUSES.DELETED }
      }).countDocuments();
    }

    return counts;
  },

  async productsCheckUsedPipeline(
    _root,
    params: IQueryParams & { excludeStageIds },
    { commonQuerySelector, models, subdomain, user }: IContext
  ) {
    const filter = await generateFilter(
      subdomain,
      models,
      commonQuerySelector,
      params
    );

    const {
      sortField,
      sortDirection,
      page,
      perPage,
      pipelineId,
      excludeStageIds
    } = params;

    const pagintationArgs = { page, perPage };

    let sort: any = { code: 1 };
    if (sortField) {
      sort = { [sortField]: sortDirection || 1 };
    }

    const products = await paginate(
      models.Products.find(filter).sort(sort).lean(),
      pagintationArgs
    );

    const counterByProductId = {};

    if (pipelineId) {
      const allStages = await sendSalesMessage({
        subdomain,
        action: 'stages.find',
        data: { pipelineId },
        isRPC: true,
        defaultValue: []
      });

      const allStageIds = allStages.map(s => s._id);

      const deals = await sendSalesMessage({
        subdomain,
        action: 'deals.find',
        data: {
          stageId: {
            $in: allStageIds.filter(s => !(excludeStageIds || []).includes(s))
          },
          status: { $in: ['active', ''] },
          'productsData.productId': { $in: products.map(p => p._id) }
        },
        isRPC: true,
        defaultValue: []
      });

      for (const deal of deals) {
        for (const pdata of deal.productsData || []) {
          if (!Object.keys(counterByProductId).includes(pdata.productId)) {
            counterByProductId[pdata.productId] = 0;
          }
          counterByProductId[pdata.productId] += 1;
        }
      }
    }

    for (const product of products) {
      product.usedCount = counterByProductId[product._id] || 0;
    }

    return products;
  }
};

requireLogin(productQueries, 'productsTotalCount');
checkPermission(productQueries, 'products', 'showProducts', []);
checkPermission(
  productQueries,
  'productsCheckUsedPipeline',
  'showProducts',
  []
);
checkPermission(productQueries, 'productCategories', 'showProducts', []);
checkPermission(productQueries, 'productCountByTags', 'showProducts', []);

export default productQueries;
