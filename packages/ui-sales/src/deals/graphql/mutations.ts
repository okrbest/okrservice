import {
  commonDragParams,
  commonDragVariables,
  commonFields,
  commonMutationParams,
  commonMutationVariables,
} from '../../boards/graphql/mutations';

import { dealFields } from './queries';

const dealMutationVariables = `
  $productsData: JSON,
  $paymentsData: JSON,
  $extraData: JSON,
`;

const dealMutationParams = `
  productsData: $productsData,
  paymentsData: $paymentsData,
  extraData: $extraData,
`;

const copyVariables = `$companyIds: [String], $customerIds: [String], $labelIds: [String]`;
const copyParams = `companyIds: $companyIds, customerIds: $customerIds, labelIds: $labelIds`;

const dealsAdd = `
  mutation dealsAdd($name: String, ${copyVariables}, ${dealMutationVariables} ${commonMutationVariables}) {
    dealsAdd(name: $name, ${copyParams}, ${dealMutationParams}, ${commonMutationParams}) {
      ${dealFields}
      ${commonFields}
    }
  }
`;

const dealsEdit = `
  mutation dealsEdit($_id: String!, $name: String, ${dealMutationVariables}, ${commonMutationVariables}) {
    dealsEdit(_id: $_id, name: $name, ${dealMutationParams}, ${commonMutationParams}) {
      ${dealFields}
      ${commonFields}
    }
  }
`;

const dealsEditProductData = `
  mutation dealsEditProductData($proccessId: String, $dealId: String, $dataId: String, $doc: JSON) {
    dealsEditProductData(proccessId: $proccessId, dealId: $dealId, dataId: $dataId, doc: $doc)
  }
`;

const dealsCreateProductsData = `
mutation DealsCreateProductsData($proccessId: String, $dealId: String, $docs: JSON) {
  dealsCreateProductsData(proccessId: $proccessId, dealId: $dealId, docs: $docs)
}
`;

const dealsRemove = `
  mutation dealsRemove($_id: String!) {
    dealsRemove(_id: $_id) {
      _id
    }
  }
`;

const dealsChange = `
  mutation dealsChange(${commonDragVariables}) {
    dealsChange(${commonDragParams}) {
      _id
    }
  }
`;

const dealsWatch = `
  mutation dealsWatch($_id: String!, $isAdd: Boolean!) {
    dealsWatch(_id: $_id, isAdd: $isAdd) {
      _id
      isWatched
    }
  }
`;

const dealsArchive = `
  mutation dealsArchive($stageId: String!, $proccessId: String) {
    dealsArchive(stageId: $stageId, proccessId: $proccessId)
  }
`;

const dealsCopy = `
  mutation dealsCopy($_id: String!, $proccessId: String) {
    dealsCopy(_id: $_id, proccessId: $proccessId) {
      ${commonFields}
      ${dealFields}
    }
  }
`;

const confirmLoyalties = `
  mutation ConfirmLoyalties($checkInfo: JSON) {
    confirmLoyalties(checkInfo: $checkInfo)
  }
`;

export default {
  dealsAdd,
  dealsEdit,
  dealsCreateProductsData,
  dealsEditProductData,
  dealsRemove,
  dealsChange,
  dealsWatch,
  dealsArchive,
  dealsCopy,
  confirmLoyalties,
};
