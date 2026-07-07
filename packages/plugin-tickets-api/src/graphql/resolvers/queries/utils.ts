import * as moment from "moment";
import { getCollection } from "../../../models/utils";
import {
  IItemCommonFields,
  IStageDocument,
} from "../../../models/definitions/boards";
import { BOARD_STATUSES } from "../../../models/definitions/constants";
import { CLOSE_DATE_TYPES } from "../../../constants";
import { getNextMonth, getToday, regexSearchText } from "@erxes/api-utils/src";
import { IListParams } from "./boards";
import {
  fetchSegment,
  sendCommonMessage,
  sendCoreMessage,
  sendNotificationsMessage,
} from "../../../messageBroker";
import { IUserDocument } from "@erxes/api-utils/src/types";
import { IModels } from "../../../connectionResolver";
import { USER_ROLES } from "@erxes/api-utils/src/constants";

export interface IArchiveArgs {
  pipelineId: string;
  search: string;
  page?: number;
  perPage?: number;
  userIds?: string[];
  priorities?: string[];
  assignedUserIds?: string[];
  labelIds?: string[];
  productIds?: string[];
  companyIds?: string[];
  customerIds?: string[];
  startDate?: string;
  endDate?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  noAssignee?: boolean;
  noCompany?: boolean;
  requestType?: string;
  functionCategory?: string;
  noRequestType?: boolean;
  noFunctionCategory?: boolean;
  sources?: string[];
  hackStages?: string[];
}

const contains = (values: string[]) => {
  return { $in: values };
};

export const getCloseDateByType = (closeDateType: string) => {
  if (closeDateType === CLOSE_DATE_TYPES.NEXT_DAY) {
    const tommorrow = moment().add(1, "days");

    return {
      $gte: new Date(tommorrow.startOf("day").toISOString()),
      $lte: new Date(tommorrow.endOf("day").toISOString()),
    };
  }

  if (closeDateType === CLOSE_DATE_TYPES.NEXT_WEEK) {
    const monday = moment()
      .day(1 + 7)
      .format("YYYY-MM-DD");
    const nextSunday = moment()
      .day(7 + 7)
      .format("YYYY-MM-DD");

    return {
      $gte: new Date(monday),
      $lte: new Date(nextSunday),
    };
  }

  if (closeDateType === CLOSE_DATE_TYPES.NEXT_MONTH) {
    const now = new Date();
    const { start, end } = getNextMonth(now);

    return {
      $gte: new Date(start),
      $lte: new Date(end),
    };
  }

  if (closeDateType === CLOSE_DATE_TYPES.NO_CLOSE_DATE) {
    return { $exists: false };
  }

  if (closeDateType === CLOSE_DATE_TYPES.OVERDUE) {
    const now = new Date();
    const today = getToday(now);

    return { $lt: today };
  }
};

export const generateExtraFilters = async (filter, extraParams) => {
  const {
    source,
    userIds,
    priority,
    qualityImpact,
    functionCategory,
    startDate,
    endDate,
    createdStartDate,
    createdEndDate,
    stateChangedStartDate,
    stateChangedEndDate,
    startDateStartDate,
    startDateEndDate,
    closeDateStartDate,
    closeDateEndDate,
  } = extraParams;

  const isListEmpty = (value) => {
    return value.length === 1 && value[0].length === 0;
  };

  if (source) {
    filter.source = contains(source);
  }

  if (userIds) {
    const isEmpty = isListEmpty(userIds);

    filter.userId = isEmpty ? { $in: [null, []] } : { $in: userIds };
  }

  if (priority) {
    filter.priority = contains(priority);
  }

  if (qualityImpact) {
    filter.qualityImpact = contains(qualityImpact);
  }

  if (functionCategory) {
    filter.functionCategory = contains(functionCategory);
  }

  if (startDate) {
    filter.closeDate = {
      $gte: new Date(startDate),
    };
  }

  if (endDate) {
    if (filter.closeDate) {
      filter.closeDate.$lte = new Date(endDate);
    } else {
      filter.closeDate = {
        $lte: new Date(endDate),
      };
    }
  }

  if (createdStartDate || createdEndDate) {
    filter.createdAt = {
      $gte: new Date(createdStartDate),
      $lte: new Date(createdEndDate),
    };
  }

  if (stateChangedStartDate || stateChangedEndDate) {
    filter.stageChangedDate = {
      $gte: new Date(stateChangedStartDate),
      $lte: new Date(stateChangedEndDate),
    };
  }

  if (startDateStartDate || startDateEndDate) {
    filter.startDate = {
      $gte: new Date(startDateStartDate),
      $lte: new Date(startDateEndDate),
    };
  }

  if (closeDateStartDate || closeDateEndDate) {
    filter.closeDate = {
      $gte: new Date(closeDateStartDate),
      $lte: new Date(closeDateEndDate),
    };
  }

  return filter;
};

export const generateCommonFilters = async (
  models: IModels,
  subdomain: string,
  currentUserId: string,
  args: any
) => {
  const {
    _ids,
    pipelineId,
    pipelineIds,
    stageId,
    parentId,
    boardIds,
    stageCodes,
    search,
    closeDateType,
    assignedUserIds,
    customerIds,
    companyIds,
    conformityMainType,
    conformityMainTypeId,
    conformityIsRelated,
    conformityIsSaved,
    initialStageId,
    type,
    labelIds,
    priority,
    userIds,
    tagIds,
    segment,
    segmentData,
    assignedToMe,
    startDate,
    endDate,
    hasStartAndCloseDate,
    stageChangedStartDate,
    stageChangedEndDate,
    noSkipArchive,
    number,
    branchIds,
    departmentIds,
    dateRangeFilters,
    customFieldsDataFilters,
    vendorCustomerIds,
    resolvedDayBetween,
    source,
    requestType,
    qualityImpact,
    functionCategory,
  } = args;

  const isListEmpty = (value) => {
    return value.length === 1 && value[0].length === 0;
  };

  const filter: any = noSkipArchive
    ? {}
    : { status: { $ne: BOARD_STATUSES.ARCHIVED }, parentId: undefined };

  let filterIds: string[] = [];

  if (parentId) {
    filter.parentId = parentId;
  }

  if (assignedUserIds) {
    // Filter by assigned to no one
    const notAssigned = isListEmpty(assignedUserIds);

    filter.assignedUserIds = notAssigned ? [] : contains(assignedUserIds);
  }

  if (branchIds) {
    const branches = await sendCoreMessage({
      subdomain,
      action: `branches.findWithChild`,
      data: {
        query: { _id: { $in: branchIds } },
        fields: { _id: 1 },
      },
      isRPC: true,
      defaultValue: [],
    });

    filter.branchIds = { $in: branches.map((item) => item._id) };
  }

  if (departmentIds) {
    const departments = await sendCoreMessage({
      subdomain,
      action: `departments.findWithChild`,
      data: {
        query: { _id: { $in: departmentIds } },
        fields: { _id: 1 },
      },
      isRPC: true,
      defaultValue: [],
    });

    filter.departmentIds = { $in: departments.map((item) => item._id) };
  }

  if (customerIds && type) {
    const relIds = await sendCoreMessage({
      subdomain,
      action: "conformities.filterConformity",
      data: {
        mainType: "customer",
        mainTypeIds: customerIds,
        relType: type,
      },
      isRPC: true,
      defaultValue: [],
    });

    filterIds = relIds;
  }

  if (companyIds && type) {
    const relIds = await sendCoreMessage({
      subdomain,
      action: "conformities.filterConformity",
      data: {
        mainType: "company",
        mainTypeIds: companyIds,
        relType: type,
      },
      isRPC: true,
      defaultValue: [],
    });

    filterIds = filterIds.length
      ? filterIds.filter((id) => relIds.includes(id))
      : relIds;
  }

  if (customerIds || companyIds) {
    filter._id = contains(filterIds || []);
  }

  if (_ids && _ids.length) {
    filter._id = contains(_ids);
  }

  if (conformityMainType && conformityMainTypeId) {
    if (conformityIsSaved) {
      const relIds = await sendCoreMessage({
        subdomain,
        action: "conformities.savedConformity",
        data: {
          mainType: conformityMainType,
          mainTypeId: conformityMainTypeId,
          relTypes: [type],
        },
        isRPC: true,
        defaultValue: [],
      });

      filter._id = contains(relIds || []);
    }

    if (conformityIsRelated) {
      const relIds = await sendCoreMessage({
        subdomain,
        action: "conformities.relatedConformity",
        data: {
          mainType: conformityMainType,
          mainTypeId: conformityMainTypeId,
          relType: type,
        },
        isRPC: true,
        defaultValue: [],
      });

      filter._id = contains(relIds);
    }
  }

  if (initialStageId) {
    filter.initialStageId = initialStageId;
  }

  if (closeDateType) {
    filter.closeDate = getCloseDateByType(closeDateType);
  }

  if (startDate) {
    filter.closeDate = {
      $gte: new Date(startDate),
    };
  }

  if (endDate) {
    if (filter.closeDate) {
      filter.closeDate.$lte = new Date(endDate);
    } else {
      filter.closeDate = {
        $lte: new Date(endDate),
      };
    }
  }

  if (dateRangeFilters) {
    for (const dateRangeFilter of dateRangeFilters) {
      const { name, from, to } = dateRangeFilter;

      if (from) {
        filter[name] = { $gte: new Date(from) };
      }

      if (to) {
        filter[name] = { ...filter[name], $lte: new Date(to) };
      }
    }
  }

  if (customFieldsDataFilters) {
    for (const { value, name } of customFieldsDataFilters) {
      if (Array.isArray(value) && value?.length) {
        filter[`customFieldsData.${name}`] = { $in: value };
      } else {
        filter[`customFieldsData.${name}`] = value;
      }
    }
  }

  const stageChangedDateFilter: any = {};
  if (stageChangedStartDate) {
    stageChangedDateFilter.$gte = new Date(stageChangedStartDate);
  }
  if (stageChangedEndDate) {
    stageChangedDateFilter.$lte = new Date(stageChangedEndDate);
  }
  if (Object.keys(stageChangedDateFilter).length) {
    filter.stageChangedDate = stageChangedDateFilter;
  }

  if (search) {
    Object.assign(filter, regexSearchText(search));
  }

  if (stageId) {
    filter.stageId = stageId;
  } else if (pipelineId || pipelineIds) {
    let filterPipeline = pipelineId;

    if (pipelineIds) {
      filterPipeline = { $in: pipelineIds };
    }

    const stageIds = await models.Stages.find({
      pipelineId: filterPipeline,
      status: { $ne: BOARD_STATUSES.ARCHIVED },
    }).distinct("_id");

    filter.stageId = { $in: stageIds };
  }

  if (boardIds) {
    const pipelineIds = await models.Pipelines.find({
      boardId: { $in: boardIds },
      status: { $ne: BOARD_STATUSES.ARCHIVED },
    }).distinct("_id");

    const filterStages: any = {
      pipelineId: { $in: pipelineIds },
      status: { $ne: BOARD_STATUSES.ARCHIVED },
    };

    if (filter?.stageId?.$in) {
      filterStages._id = { $in: filter?.stageId?.$in };
    }

    const stageIds = await models.Stages.find(filterStages).distinct("_id");

    filter.stageId = { $in: stageIds };
  }

  if (stageCodes) {
    const filterStages: any = { code: { $in: stageCodes } };

    if (filter?.stageId?.$in) {
      filterStages._id = { $in: filter?.stageId?.$in };
    }

    const stageIds = await models.Stages.find(filterStages).distinct("_id");

    filter.stageId = { $in: stageIds };
  }

  if (labelIds) {
    const isEmpty = isListEmpty(labelIds);

    filter.labelIds = isEmpty ? { $in: [null, []] } : { $in: labelIds };
  }

  if (priority) {
    filter.priority = contains(priority);
  }

  if (source) {
    filter.source = contains(source);
  }

  if (requestType) {
    filter.requestType = contains(requestType);
  }

  if (qualityImpact) {
    filter.qualityImpact = contains(qualityImpact);
  }

  if (functionCategory) {
    filter.functionCategory = contains(functionCategory);
  }

  if (tagIds) {
    filter.tagIds = { $in: tagIds };
  }

  if (pipelineId) {
    const pipeline = await models.Pipelines.getPipeline(pipelineId);
    const user = await sendCoreMessage({
      subdomain,
      action: "users.findOne",
      data: {
        _id: currentUserId,
      },
      isRPC: true,
    });
    const tmp =
      (await sendCoreMessage({
        subdomain,
        action: "departments.findWithChild",
        data: {
          query: {
            supervisorId: currentUserId,
          },
          fields: {
            _id: 1,
          },
        },
        isRPC: true,
      })) || [];

    const supervisorDepartmentIds = tmp?.map((x) => x._id) || [];
    const pipelineDepartmentIds = pipeline.departmentIds || [];

    const commonIds =
      supervisorDepartmentIds.filter((id) =>
        pipelineDepartmentIds.includes(id)
      ) || [];
    const isEligibleSeeAllCards = (pipeline.excludeCheckUserIds || []).includes(
      currentUserId
    );
    if (
      commonIds?.length > 0 &&
      (pipeline.isCheckUser || pipeline.isCheckDepartment) &&
      !isEligibleSeeAllCards
    ) {
      // current user is supervisor in departments and this pipeline has included that some of user's departments
      // so user is eligible to see all cards of people who share same department.
      const otherDepartmentUsers = await sendCoreMessage({
        subdomain,
        action: "users.find",
        data: {
          query: { departmentIds: { $in: commonIds } },
        },
        isRPC: true,
        defaultValue: [],
      });
      let includeCheckUserIds = otherDepartmentUsers.map((x) => x._id) || [];
      includeCheckUserIds = includeCheckUserIds.concat(user._id || []);

      const uqinueCheckUserIds = [
        ...new Set(includeCheckUserIds.concat(currentUserId)),
      ];

      Object.assign(filter, {
        $or: [
          { assignedUserIds: { $in: uqinueCheckUserIds } },
          { userId: { $in: uqinueCheckUserIds } },
        ],
      });
    } else {
      if (
        (pipeline.isCheckUser || pipeline.isCheckDepartment) &&
        !isEligibleSeeAllCards
      ) {
        let includeCheckUserIds: string[] = [];

        if (pipeline.isCheckDepartment) {
          const userDepartmentIds = user?.departmentIds || [];
          const commonIds = userDepartmentIds.filter((id) =>
            pipelineDepartmentIds.includes(id)
          );

          const otherDepartmentUsers = await sendCoreMessage({
            subdomain,
            action: "users.find",
            data: {
              query: { departmentIds: { $in: commonIds } },
            },
            isRPC: true,
            defaultValue: [],
          });

          for (const departmentUser of otherDepartmentUsers) {
            includeCheckUserIds = [...includeCheckUserIds, departmentUser._id];
          }

          if (
            !!pipelineDepartmentIds.filter((departmentId) =>
              userDepartmentIds.includes(departmentId)
            ).length
          ) {
            includeCheckUserIds = includeCheckUserIds.concat(user._id || []);
          }
        }

        const uqinueCheckUserIds = [
          ...new Set(includeCheckUserIds.concat(currentUserId)),
        ];

        Object.assign(filter, {
          $or: [
            { assignedUserIds: { $in: uqinueCheckUserIds } },
            { userId: { $in: uqinueCheckUserIds } },
          ],
        });
      }
    }
  }

  if (userIds) {
    const isEmpty = isListEmpty(userIds);

    filter.userId = isEmpty ? { $in: [null, []] } : { $in: userIds };
  }

  if (assignedToMe) {
    filter.assignedUserIds = { $in: [currentUserId] };
  }

  if (segmentData) {
    const segment = JSON.parse(segmentData);
    const itemIds = await fetchSegment(subdomain, "", {}, segment);
    filter._id = { $in: itemIds };
  }

  if (segment) {
    const segmentObj = await sendCoreMessage({
      subdomain,
      action: "segmentFindOne",
      data: { _id: segment },
      isRPC: true,
    });
    const itemIds = await fetchSegment(subdomain, segmentObj);

    filter._id = { $in: itemIds };
  }

  if (hasStartAndCloseDate) {
    filter.startDate = { $exists: true };
    filter.closeDate = { $exists: true };
  }

  if (number) {
    filter.number = { $regex: `${number}`, $options: "mui" };
  }

  if (vendorCustomerIds?.length > 0) {
    const cards = await sendCommonMessage({
      subdomain,
      serviceName: "clientportal",
      action: "clientPortalUserCards.find",
      data: {
        contentType: "ticket",
        cpUserId: { $in: vendorCustomerIds },
      },
      isRPC: true,
      defaultValue: [],
    });
    const cardIds = cards.map((d) => d.contentTypeId);
    if (filter._id) {
      const ids = filter._id.$in;
      const newIds = ids.filter((d) => cardIds.includes(d));
      filter._id = { $in: newIds };
    } else {
      filter._id = { $in: cardIds };
    }
  }

  if ((stageId || stageCodes) && resolvedDayBetween) {
    const [dayFrom, dayTo] = resolvedDayBetween;
    filter.$expr = {
      $and: [
        // Convert difference between stageChangedDate and createdAt to days
        {
          $gte: [
            {
              $divide: [
                { $subtract: ["$stageChangedDate", "$createdAt"] },
                1000 * 60 * 60 * 24, // Convert milliseconds to days
              ],
            },
            dayFrom, // Minimum day (0 days)
          ],
        },
        {
          $lt: [
            {
              $divide: [
                { $subtract: ["$stageChangedDate", "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
            dayTo, // Maximum day (3 days)
          ],
        },
      ],
    };
  }

  return filter;
};

export const calendarFilters = async (models: IModels, filter, args) => {
  const {
    date,
    pipelineId,
    createdStartDate,
    createdEndDate,
    stateChangedStartDate,
    stateChangedEndDate,
    startDateStartDate,
    startDateEndDate,
    closeDateStartDate,
    closeDateEndDate,
  } = args;

  if (date) {
    const stageIds = await models.Stages.find({ pipelineId }).distinct("_id");

    filter.closeDate = dateSelector(date);
    filter.stageId = { $in: stageIds };
  }

  if (createdStartDate || createdEndDate) {
    filter.createdAt = {
      $gte: new Date(createdStartDate),
      $lte: new Date(createdEndDate),
    };
  }
  if (stateChangedStartDate || stateChangedEndDate) {
    filter.stageChangedDate = {
      $gte: new Date(stateChangedStartDate),
      $lte: new Date(stateChangedEndDate),
    };
  }
  if (startDateStartDate || startDateEndDate) {
    filter.startDate = {
      $gte: new Date(startDateStartDate),
      $lte: new Date(startDateEndDate),
    };
  }
  if (closeDateStartDate || closeDateEndDate) {
    filter.closeDate = {
      $gte: new Date(closeDateStartDate),
      $lte: new Date(closeDateEndDate),
    };
  }

  return filter;
};

export const generateDealCommonFilters = async (
  models: IModels,
  subdomain: string,
  currentUserId: string,
  args = {} as any,
  extraParams?: any
) => {
  args.type = "deal";
  const { productIds } = extraParams || args;
  let filter = await generateCommonFilters(
    models,
    subdomain,
    currentUserId,
    args
  );

  if (extraParams) {
    filter = await generateExtraFilters(filter, extraParams);
  }

  if (productIds) {
    filter["productsData.productId"] = contains(productIds);
  }

  // Calendar monthly date
  await calendarFilters(models, filter, args);

  return filter;
};

export const generateTicketCommonFilters = async (
  models: IModels,
  subdomain: string,
  currentUserId: string,
  args = {} as any,
  extraParams?: any
) => {
  args.type = "ticket";
  const { productIds } = extraParams || args;

  let filter = await generateCommonFilters(
    models,
    subdomain,
    currentUserId,
    args
  );

  if (extraParams) {
    filter = await generateExtraFilters(filter, extraParams);
  }

  if (productIds) {
    filter["productsData.productId"] = contains(productIds);
  }

  // Calendar monthly date
  await calendarFilters(models, filter, args);

  return filter;
};

export const generateSort = (args: IListParams) => {
  let sort: any = { order: 1, createdAt: -1 };

  const { sortField, sortDirection } = args;

  if (sortField && sortDirection) {
    sort = { [sortField]: sortDirection };
  }

  return sort;
};

export const generateGrowthHackCommonFilters = async (
  models: IModels,
  subdomain: string,
  currentUserId: string,
  args = {} as any,
  extraParams?: any
) => {
  args.type = "growthHack";

  const { hackStage, pipelineId, stageId } = extraParams || args;

  let filter = await generateCommonFilters(
    models,
    subdomain,
    currentUserId,
    args
  );

  if (extraParams) {
    filter = await generateExtraFilters(filter, extraParams);
  }

  if (hackStage) {
    filter.hackStages = contains(hackStage);
  }

  if (!stageId && pipelineId) {
    const stageIds = await models.Stages.find({ pipelineId }).distinct("_id");

    filter.stageId = { $in: stageIds };
  }

  return filter;
};

interface IDate {
  month: number;
  year: number;
}

const dateSelector = (date: IDate) => {
  const { year, month } = date;

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));

  return {
    $gte: start,
    $lte: end,
  };
};

// comparing pipelines departmentIds and current user departmentIds
const compareDepartmentIds = (
  pipelineDepartmentIds: string[],
  userDepartmentIds: string[]
): boolean => {
  if (!pipelineDepartmentIds?.length || !userDepartmentIds?.length) {
    return false;
  }

  for (const uDepartmentId of userDepartmentIds) {
    if (pipelineDepartmentIds.includes(uDepartmentId)) {
      return true;
    }
  }

  return false;
};

export const checkItemPermByUser = async (
  subdomain: string,
  models: IModels,
  user: any,
  item: IItemCommonFields
) => {
  const stage = await models.Stages.getStage(item.stageId);

  const {
    visibility,
    memberIds,
    departmentIds = [],
    branchIds = [],
    isCheckUser,
  } = await models.Pipelines.getPipeline(stage.pipelineId);

  const supervisorDepartments =
    (await sendCoreMessage({
      subdomain,
      action: "departments.findWithChild",
      data: {
        query: {
          supervisorId: user?._id,
        },
        fields: {
          _id: 1,
        },
      },
      isRPC: true,
    })) || [];

  const supervisorDepartmentIds =
    supervisorDepartments?.map((x) => x._id) || [];
  const userDepartmentIds = user?.departmentIds || [];
  const userBranchIds = user?.branchIds || [];

  // check permission on department
  const hasUserInDepartment = compareDepartmentIds(departmentIds, [
    ...userDepartmentIds,
    ...supervisorDepartmentIds,
  ]);
  const isUserInBranch = compareDepartmentIds(branchIds, userBranchIds);

  if (
    visibility === "private" &&
    !(memberIds || []).includes(user._id) &&
    !hasUserInDepartment &&
    !isUserInBranch &&
    user?.role !== USER_ROLES.SYSTEM
  ) {
    throw new Error("You do not have permission to view.");
  }

  const isSuperVisorInDepartment = compareDepartmentIds(
    departmentIds,
    supervisorDepartmentIds
  );
  if (isSuperVisorInDepartment) {
    return item;
  }

  return item;
};

export const archivedItems = async (
  models: IModels,
  subdomain: string,
  params: IArchiveArgs,
  collection: any
) => {
  const { pipelineId, page = 0, perPage = 0 } = params;

  const stages = await models.Stages.find({ pipelineId }).lean();

  if (stages.length === 0) return [];

  const filter = generateArhivedItemsFilter(params, stages);

  if (params.companyIds && params.companyIds.length) {
    const relIds = await sendCoreMessage({
      subdomain,
      action: "conformities.filterConformity",
      data: { mainType: "company", mainTypeIds: params.companyIds, relType: "ticket" },
      isRPC: true,
      defaultValue: [],
    });
    filter._id = { $in: relIds };
  } else if (params.noCompany) {
    const allIds = (await collection.find(
      { stageId: { $in: stages.map((s: any) => s._id) }, status: BOARD_STATUSES.ARCHIVED },
      { _id: 1 }
    ).lean()).map((t: any) => String(t._id));

    const conformities = await sendCoreMessage({
      subdomain,
      action: "conformities.findConformities",
      data: { mainType: "ticket", relType: "company", mainTypeId: { $in: allIds } },
      isRPC: true,
      defaultValue: [],
    });

    const idsWithCompany = new Set(conformities.map((c: any) => String(c.mainTypeId)));
    filter._id = { $nin: [...idsWithCompany] };
  }

  return collection
    .find(filter)
    .sort({ modifiedAt: -1 })
    .skip(page || 0)
    .limit(perPage || 20)
    .lean();
};

export const archivedItemsCount = async (
  models: IModels,
  subdomain: string,
  params: IArchiveArgs,
  collection: any
) => {
  const { pipelineId } = params;

  const stages = await models.Stages.find({ pipelineId }).lean();

  if (stages.length === 0) return 0;

  const filter = generateArhivedItemsFilter(params, stages);

  if (params.companyIds && params.companyIds.length) {
    const relIds = await sendCoreMessage({
      subdomain,
      action: "conformities.filterConformity",
      data: { mainType: "company", mainTypeIds: params.companyIds, relType: "ticket" },
      isRPC: true,
      defaultValue: [],
    });
    filter._id = { $in: relIds };
  }

  return collection.find(filter).countDocuments();
};

const generateArhivedItemsFilter = (
  params: IArchiveArgs,
  stages: IStageDocument[]
) => {
  const {
    search,
    userIds,
    priorities,
    assignedUserIds,
    labelIds,
    productIds,
    startDate,
    endDate,
    createdAtStart,
    createdAtEnd,
    noAssignee,
    noCompany,
    requestType,
    functionCategory,
    noRequestType,
    noFunctionCategory,
    sources,
    hackStages
  } = params;

  const filter: any = { status: BOARD_STATUSES.ARCHIVED };

  filter.stageId = { $in: stages.map((stage) => stage._id) };

  if (search) {
    Object.assign(filter, regexSearchText(search, "name"));
  }

  if (userIds && userIds.length) {
    filter.userId = { $in: userIds };
  }

  if (priorities && priorities.length) {
    filter.priority = { $in: priorities };
  }

  if (noAssignee) {
    filter['assignedUserIds.0'] = { $exists: false };
  } else if (assignedUserIds && assignedUserIds.length) {
    filter.assignedUserIds = { $in: assignedUserIds };
  }

  if (labelIds && labelIds.length) {
    filter.labelIds = { $in: labelIds };
  }

  if (productIds && productIds.length) {
    filter["productsData.productId"] = { $in: productIds };
  }

  if (startDate) {
    filter.closeDate = {
      $gte: new Date(startDate),
    };
  }

  if (endDate) {
    if (filter.closeDate) {
      filter.closeDate.$lte = new Date(endDate);
    } else {
      filter.closeDate = {
        $lte: new Date(endDate),
      };
    }
  }

  if (createdAtStart) {
    filter.createdAt = { $gte: new Date(createdAtStart) };
  }

  if (createdAtEnd) {
    const endOfDay = new Date(createdAtEnd);
    endOfDay.setUTCHours(23, 59, 59, 999);
    filter.createdAt = { ...(filter.createdAt || {}), $lte: endOfDay };
  }

  if (noRequestType) {
    filter.requestType = { $in: [null, ''] };
  } else if (requestType) {
    filter.requestType = requestType;
  }

  if (noFunctionCategory) {
    filter.functionCategory = { $in: [null, ''] };
  } else if (functionCategory) {
    filter.functionCategory = functionCategory;
  }

  if (sources && sources.length) {
    filter.source = { $in: sources };
  }

  if (hackStages && hackStages.length) {
    filter.hackStages = { $in: hackStages };
  }

  return filter;
};

export interface IArchivedTicketsGroupsParams {
  pipelineId: string;
  groupBy: string;
  search?: string;
  assignedUserIds?: string[];
  startDate?: string;
  endDate?: string;
}

export const archivedTicketsGroups = async (
  models: IModels,
  subdomain: string,
  params: IArchivedTicketsGroupsParams
) => {
  const { pipelineId, groupBy, search, assignedUserIds, startDate, endDate } =
    params;

  const stages = await models.Stages.find({ pipelineId }).lean();
  if (stages.length === 0) return [];

  const stageIds = stages.map((s) => s._id);

  const baseFilter: any = {
    stageId: { $in: stageIds },
    status: BOARD_STATUSES.ARCHIVED,
  };

  if (search) {
    Object.assign(baseFilter, regexSearchText(search, "name"));
  }

  if (assignedUserIds && assignedUserIds.length > 0) {
    baseFilter.assignedUserIds = { $in: assignedUserIds };
  }

  if (startDate || endDate) {
    baseFilter.modifiedAt = {};
    if (startDate) {
      baseFilter.modifiedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      baseFilter.modifiedAt.$lte = new Date(endDate);
    }
  }

  let groupField: any;
  switch (groupBy) {
    case "month":
      groupField = {
        $dateToString: { format: "%Y-%m", date: "$createdAt" },
      };
      break;
    case "assignee":
      groupField = { $arrayElemAt: ["$assignedUserIds", 0] };
      break;
    case "requestType":
      groupField = "$requestType";
      break;
    case "functionCategory":
      groupField = "$functionCategory";
      break;
    case "company": {
      const ticketIds = (await models.Tickets.find(baseFilter, { _id: 1 }).lean()).map(
        (t: any) => String(t._id)
      );

      if (ticketIds.length === 0) return [];

      const conformities = await sendCoreMessage({
        subdomain,
        action: "conformities.findConformities",
        data: { mainType: "ticket", relType: "company", mainTypeId: { $in: ticketIds } },
        isRPC: true,
        defaultValue: [],
      });

      const ticketCompanyMap = new Map<string, string>();
      for (const c of conformities) {
        const tid = String(c.mainTypeId);
        if (!ticketCompanyMap.has(tid)) {
          ticketCompanyMap.set(tid, String(c.relTypeId));
        }
      }

      const companyCounts = new Map<string, number>();
      let noneCount = 0;
      for (const tid of ticketIds) {
        const cid = ticketCompanyMap.get(tid);
        if (cid) {
          companyCounts.set(cid, (companyCounts.get(cid) || 0) + 1);
        } else {
          noneCount++;
        }
      }

      const cIds = [...companyCounts.keys()];
      const companies = cIds.length
        ? await sendCoreMessage({
            subdomain,
            action: "companies.findActiveCompanies",
            data: { selector: { _id: { $in: cIds } }, fields: { primaryName: 1 } },
            isRPC: true,
            defaultValue: [],
          })
        : [];

      const nameMap = new Map(
        (companies as any[]).map((c) => [String(c._id), c.primaryName || String(c._id)])
      );

      const result = [...companyCounts.entries()].map(([cid, count]) => ({
        key: cid,
        label: nameMap.get(cid) || cid,
        count,
      }));

      if (noneCount > 0) {
        result.push({ key: "none", label: "미분류", count: noneCount });
      }

      return result.sort((a, b) => b.count - a.count);
    }
    default:
      groupField = "$requestType";
  }

  const groups = await models.Tickets.aggregate([
    { $match: baseFilter },
    { $group: { _id: groupField, count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  return groups.map((g) => ({
    key: g._id != null ? String(g._id) : "none",
    label: g._id != null ? String(g._id) : "미분류",
    count: g.count,
  }));
};

export const getItemList = async (
  models: IModels,
  subdomain: string,
  filter: any,
  args: IListParams,
  user: IUserDocument,
  type: string,
  extraFields?: { [key: string]: number },
  getExtraFields?: (item: any) => { [key: string]: any },
  serverTiming?
) => {
  const { collection } = getCollection(models, type);
  const { page, perPage } = args;
  const sort = generateSort(args);
  let limit = args.limit !== undefined ? args.limit : 10;

  const pipelines: any[] = [
    {
      $match: filter,
    },
    {
      $sort: sort,
    },
    {
      $skip: args.skip || 0,
    },
    {
      $lookup: {
        from: "users",
        localField: "assignedUserIds",
        foreignField: "_id",
        as: "users_doc",
      },
    },
    {
      $lookup: {
        from: "tickets_stages",
        localField: "stageId",
        foreignField: "_id",
        as: "stages_doc",
      },
    },
    {
      $lookup: {
        from: "tickets_pipeline_labels",
        localField: "labelIds",
        foreignField: "_id",
        as: "labels_doc",
      },
    },
    {
      $project: {
        assignedUsers: "$users_doc",
        labels: "$labels_doc",
        stage: { $arrayElemAt: ["$stages_doc", 0] },
        name: 1,
        isCheckUserTicket: 1,
        assignedUserIds: 1,
        isComplete: 1,
        startDate: 1,
        closeDate: 1,
        relations: 1,
        createdAt: 1,
        modifiedAt: 1,
        priority: 1,
        number: 1,
        watchedUserIds: 1,
        customFieldsData: 1,
        stageChangedDate: 1,
        tagIds: 1,
        status: 1,
        branchIds: 1,
        departmentIds: 1,
        userId: 1,
        requestType: 1,
        qualityImpact: 1,
        functionCategory: 1,
        hasNotified: 1,
        ...(extraFields || {}),
      },
    },
  ];

  if (page && perPage) {
    pipelines[2] = {
      $skip: (page - 1) * perPage,
    };
    limit = perPage;
  }

  if (limit > 0) {
    pipelines.splice(3, 0, { $limit: limit });
  }

  if (serverTiming) {
    serverTiming.startTime("getItemsPipelineAggregate");
  }

  const list = await collection.aggregate(pipelines as any);

  if (serverTiming) {
    serverTiming.endTime("getItemsPipelineAggregate");
  }

  const ids = list.map((item) => item._id);

  if (serverTiming) {
    serverTiming.startTime("conformities");
  }

  const conformities = ids.length
    ? await sendCoreMessage({
        subdomain,
        action: "conformities.getConformities",
        data: {
          mainType: type,
          mainTypeIds: ids,
          relTypes: ["company", "customer"],
        },
        isRPC: true,
        defaultValue: [],
      })
    : [];

  if (serverTiming) {
    serverTiming.endTime("conformities");
  }

  const companyIds: string[] = [];
  const customerIds: string[] = [];
  const companyIdsByItemId = {};
  const customerIdsByItemId = {};

  const perConformity = (
    conformity,
    cocIdsByItemId,
    cocIds,
    typeId1,
    typeId2
  ) => {
    cocIds.push(conformity[typeId1]);

    if (!cocIdsByItemId[conformity[typeId2]]) {
      cocIdsByItemId[conformity[typeId2]] = [];
    }

    cocIdsByItemId[conformity[typeId2]].push(conformity[typeId1]);
  };
  for (const conf of conformities) {
    if (conf.mainType === "company") {
      perConformity(
        conf,
        companyIdsByItemId,
        companyIds,
        "mainTypeId",
        "relTypeId"
      );
      continue;
    }
    if (conf.relType === "company") {
      perConformity(
        conf,
        companyIdsByItemId,
        companyIds,
        "relTypeId",
        "mainTypeId"
      );
      continue;
    }
    if (conf.mainType === "customer") {
      perConformity(
        conf,
        customerIdsByItemId,
        customerIds,
        "mainTypeId",
        "relTypeId"
      );
      continue;
    }
    if (conf.relType === "customer") {
      perConformity(
        conf,
        customerIdsByItemId,
        customerIds,
        "relTypeId",
        "mainTypeId"
      );
      continue;
    }
  }

  if (serverTiming) {
    serverTiming.startTime("getItemsCompanies");
  }

  const companies = companyIds.length
    ? await sendCoreMessage({
        subdomain,
        action: "companies.findActiveCompanies",
        data: {
          selector: {
            _id: { $in: [...new Set(companyIds)] },
          },

          fields: {
            primaryName: 1,
            primaryEmail: 1,
            primaryPhone: 1,
            emails: 1,
            phones: 1,
          },
        },
        isRPC: true,
      })
    : [];

  if (serverTiming) {
    serverTiming.endTime("getItemsCompanies");
  }

  if (serverTiming) {
    serverTiming.startTime("getItemsCustomers");
  }

  const customers = customerIds.length
    ? await sendCoreMessage({
        subdomain,
        action: "customers.findActiveCustomers",
        data: {
          selector: {
            _id: { $in: [...new Set(customerIds)] },
          },
          fields: {
            firstName: 1,
            lastName: 1,
            middleName: 1,
            visitorContactInfo: 1,
            primaryEmail: 1,
            primaryPhone: 1,
            emails: 1,
            phones: 1,
          },
        },
        isRPC: true,
        defaultValue: [],
      })
    : [];

  if (serverTiming) {
    serverTiming.endTime("getItemsCustomers");
  }

  const getCocsByItemId = (
    itemId: string,
    cocIdsByItemId: any,
    cocs: any[]
  ) => {
    const cocIds = cocIdsByItemId[itemId] || [];

    return cocIds.flatMap((cocId: string) => {
      const found = cocs.find((coc) => cocId === coc._id);

      return found || [];
    });
  };

  const updatedList: any[] = [];

  if (serverTiming) {
    serverTiming.startTime("getItemsNotifications");
  }

  const notifications = ids.length
    ? await sendNotificationsMessage({
        subdomain,
        action: "find",
        data: {
          selector: {
            contentTypeId: { $in: ids },
            isRead: false,
            receiver: user._id,
          },
          fields: { contentTypeId: 1 },
        },
        isRPC: true,
        defaultValue: [],
      })
    : [];

  if (serverTiming) {
    serverTiming.endTime("getItemsNotifications");
  }

  if (serverTiming) {
    serverTiming.startTime("getItemsFields");
  }

  const fields = await sendCoreMessage({
    subdomain,
    action: "fields.find",
    data: {
      query: {
        showInCard: true,
        contentType: `tickets:${type}`,
      },
    },
    isRPC: true,
    defaultValue: [],
  });

  if (serverTiming) {
    serverTiming.endTime("getItemsFields");
  }

  // add just incremented order to each item in list, not from db
  let order = 0;

  for (const item of list) {
    if (
      item.customFieldsData &&
      item.customFieldsData.length > 0 &&
      fields.length > 0
    ) {
      item.customProperties = [];

      for (const field of fields) {
        const fieldData = item.customFieldsData.find(
          (f) => f.field === field._id
        );

        if (!fieldData) continue;

        if (field.type === "users") {
          const valueIds = Array.isArray(fieldData.value)
            ? fieldData.value
            : [fieldData.value];

          const users = await sendCoreMessage({
            subdomain,
            action: "users.find",
            data: {
              query: { _id: { $in: valueIds } },
            },
            isRPC: true,
            defaultValue: [],
          });

          const userNames = users
            .map((u) => u.details?.fullName || u.email || u._id)
            .join(", ");

          item.customProperties.push({
            name: `${field.text} - ${userNames}`,
          });
        } else {
          item.customProperties.push({
            name: `${field.text} - ${fieldData.stringValue || fieldData.value || ""}`,
          });
        }
      }
    }

    if (
      item.isCheckUserTicket === true &&
      !(item.userId === user._id || item.assignedUserIds?.includes(user._id))
    ) {
      continue;
    }

    const notification = notifications.find(
      (n) => n.contentTypeId === item._id
    );

    updatedList.push({
      ...item,
      order: order++,
      isWatched: (item.watchedUserIds || []).includes(user._id),
      hasNotified: notification ? false : true,
      customers: getCocsByItemId(item._id, customerIdsByItemId, customers),
      companies: getCocsByItemId(item._id, companyIdsByItemId, companies),
      ...(getExtraFields ? await getExtraFields(item) : {}),
    });
  }

  return updatedList;
};
