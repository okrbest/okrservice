import { getService } from "@erxes/api-utils/src/serviceDiscovery";
import { IModels } from "./connectionResolver";
import { fetchServiceForms, sendInboxMessage } from "./messageBroker";
import { IFormSubmissionFilter } from "./db/models/definitions/forms";
import { getRealIdFromElk } from "@erxes/api-utils/src/elasticsearch";

/** 직원 규모 — 필드 code가 employeeSize이거나 라벨이 직원 규모인 경우 통일된 선택지 */
const EMPLOYEE_SIZE_OPTIONS: string[] = [
  "임직원 100명 이하",
  "임직원 100~300명",
  "임직원 300~500명",
  "임직원 500~1000명",
  "임직원 1000명 이상",
];

function resolveEmployeeSizeOptions(customField: {
  code?: string;
  text?: string;
  options?: string[];
}): string[] | undefined {
  if (customField.code === "employeeSize") {
    return EMPLOYEE_SIZE_OPTIONS;
  }
  const t = customField.text || "";
  if (/직원\s*규모|직원규모/.test(t)) {
    return EMPLOYEE_SIZE_OPTIONS;
  }
  return undefined;
}

export const getCustomFields = async (
  models: IModels,
  contentType: string,
  validation?: string
) => {
  const qry: any = {
    contentType,
    isDefinedByErxes: false
  };

  validation && (qry.validation = validation);

  return models.Fields.find(qry);
};

const getFieldGroup = async (models: IModels, _id: string) => {
  return models.FieldsGroups.findOne({ _id });
};

interface ICombinedParams {
  contentType: string;
  usageType?: string;
  excludedNames?: string[];
  segmentId?: string;
  config?: any;
  onlyDates?: boolean;
}

// cache group for reuse in fieldsCombinedByContentType
const getGroupWithCache = async (models, groupId, cache) => {
  if (cache.has(groupId)) return cache.get(groupId);
  const group = await getFieldGroup(models, groupId);
  if (!group) {
    return null;
  }
  cache.set(groupId, group);
  return group;
};

// prepare select options
const generateSelectOptions = options => {
  if (!options || options.length === 0) return [];
  return options.map(option => ({
    value: option,
    label: option
  }));
};

/**
 * Generates all field choices base on given kind.
 */
export const fieldsCombinedByContentType = async (
  models: IModels,
  subdomain: string,
  {
    contentType,
    usageType,
    excludedNames,
    segmentId,
    config,
    onlyDates
  }: ICombinedParams
) => {
  let fields = await fetchServiceForms(
    subdomain,
    contentType,
    "getList",
    {
      segmentId,
      usageType,
      config: config || {}
    },
    []
  );

  let validation;

  if (onlyDates) {
    fields = fields.filter(f => f.type === "Date");
    validation = "date";
  }

  const type = ["core:visitor", "core:lead", "core:customer"].includes(
    contentType
  )
    ? "core:customer"
    : contentType;

  const customFields = await getCustomFields(models, type, validation);

  const groupCache = new Map();

  const customFieldsWithGroups = await Promise.all(
    customFields.map(async customField => {
      const group = await getGroupWithCache(
        models,
        customField.groupId || "",
        groupCache
      );
      return { customField, group };
    })
  );

  const extendedFields = customFieldsWithGroups
    .filter(({ group }) => group?.isVisible)
    .map(({ customField, group }) => {
      const employeeOpts = resolveEmployeeSizeOptions(customField);
      const optionList = employeeOpts ?? customField.options;

      return {
      _id: Math.random(),
      name: `customFieldsData.${getRealIdFromElk(customField._id)}`,
      label: customField.text,
      options: optionList,
      selectOptions: generateSelectOptions(optionList),
      validation: customField.validation,
      type: customField.type,
      group: group._id,
      code: customField.code,
      fieldId: customField._id,
      groupDetail: group
        ? {
            _id: group._id,
            name: group.name,
            contentType: group.contentType,
            code: group.code,
            description: group.description
          }
        : undefined
    };
    });

  fields = [...fields, ...extendedFields];

  return fields.filter(field => !(excludedNames || []).includes(field.name));
};

export const formSubmissionsQuery = async (
  subdomain,
  models,
  {
    formId,
    tagId,
    contentTypeIds,
    customerId,
    filters
  }: {
    formId: string;
    tagId: string;
    contentTypeIds: string[];
    customerId: string;
    filters: IFormSubmissionFilter[];
  }
) => {
  const integrationsSelector: any = { kind: "lead", isActive: true };
  let conversationIds: string[] = [];

  if (formId) {
    integrationsSelector.formId = formId;
  }

  if (tagId) {
    integrationsSelector.tagIds = tagId;
  }

  if (contentTypeIds && contentTypeIds.length > 0) {
    conversationIds = contentTypeIds;
  }

  const submissionFilters: any[] = [];

  if (customerId) {
    submissionFilters.push({ customerId });
  }

  if (filters && filters.length > 0) {
    for (const filter of filters) {
      const { formFieldId, value } = filter;

      switch (filter.operator) {
        case "eq":
          submissionFilters.push({ formFieldId, value: { $eq: value } });
          break;

        case "c":
          submissionFilters.push({
            formFieldId,
            value: { $regex: new RegExp(value) }
          });
          break;

        case "gte":
          submissionFilters.push({
            formFieldId,
            value: { $gte: value }
          });
          break;

        case "lte":
          submissionFilters.push({
            formFieldId,
            value: { $lte: value }
          });
          break;

        default:
          break;
      }
    }

    const subs = await models.FormSubmissions.find({
      $and: submissionFilters
    }).lean();
    conversationIds = subs.map(e => e.contentTypeId);
  }

  const integration = await sendInboxMessage({
    subdomain,
    action: "integrations.findOne",
    data: integrationsSelector,
    isRPC: true,
    defaultValue: {}
  });

  if (!integration._id) {
    return null;
  }

  let convsSelector: any = { integrationId: integration._id };

  if (conversationIds.length > 0) {
    convsSelector = { _id: { $in: conversationIds } };
  }

  return convsSelector;
};

export const getContentTypes = async serviceName => {
  const service = await getService(serviceName);
  const meta = service.config.meta || {};
  const types = (meta.tags && meta.tags.types) || [];
  return types.map(type => `${serviceName}:${type.type}`);
};
