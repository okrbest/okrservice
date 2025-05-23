export const types = () => `
  type SavingContractType {
    _id: String!
    code: String
    name: String
    description: String
    status: String
    number: String
    vacancy: Float
    createdAt: Date
    config: JSON
    currency:String
    interestCalcType: String
    interestRate: Float
    closeInterestRate: Float
    storeInterestInterval: String
    branchId: String
    isAllowIncome: Boolean
    isAllowOutcome: Boolean
    isDeposit: Boolean
    productType: String
    limitPercentage: Float
  }

  type SavingContractTypesListResponse {
    list: [SavingContractType],
    totalCount: Float,
  }
`;

const queryParams = `
  page: Int
  perPage: Int
  ids: [String]
  excludeIds: Boolean
  searchValue: String
  sortField: String
  sortDirection: Int
  isDeposit: Boolean
  productType: String
`;

export const queries = `
  savingsContractTypesMain(${queryParams}): SavingContractTypesListResponse
  savingsContractTypes(${queryParams}): [SavingContractType]
  savingsContractTypeDetail(_id: String!): SavingContractType
`;

const commonFields = `
  code: String
  name: String
  description: String
  status: String
  number: String
  vacancy: Float
  createdAt: Date
  config: JSON
  currency:String
  interestCalcType: String
  storeInterestInterval: String
  interestRate: Float
  closeInterestRate: Float
  branchId: String
  isAllowIncome: Boolean
  isAllowOutcome: Boolean
  isDeposit: Boolean
  productType: String
  limitPercentage: Float
`;

export const mutations = `
  savingsContractTypesAdd(${commonFields}): SavingContractType
  savingsContractTypesEdit(_id: String!, ${commonFields}): SavingContractType
  savingsContractTypesRemove(contractTypeIds: [String]): [String]
`;
