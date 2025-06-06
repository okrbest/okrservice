import { IContext } from '../../connectionResolver';
import { sendMessageBroker } from '../../messageBroker';
import { IContractDocument } from '../../models/definitions/contracts';
import { IContract } from '../../models/definitions/contracts';

const Contracts = {
  async contractType(contract: IContract, _, { models }: IContext) {
    return models.ContractTypes.findOne({ _id: contract.contractTypeId });
  },

  async customers(contract: IContract, _, { subdomain }: IContext) {
    if (contract.customerType !== 'customer') return null;

    const customer = await sendMessageBroker(
      {
        subdomain,
        action: 'customers.findOne',
        data: { _id: contract.customerId },
        isRPC: true,
      },
      'core'
    );

    return customer;
  },

  async companies(contract: IContract, _, { subdomain }: IContext) {
    if (contract.customerType !== 'company') return null;

    const company = await sendMessageBroker(
      {
        subdomain,
        action: 'companies.findOne',
        data: { _id: contract.customerId },
        isRPC: true,
      },
      'core'
    );

    return company;
  },

  async hasTransaction(contract: IContractDocument, _, { models }: IContext) {
    return (
      (await models.Transactions.countDocuments({
        contractId: contract._id,
      })) > 0
    );
  },

  async savingTransactionHistory(
    contract: IContractDocument,
    _,
    { models }: IContext
  ) {
    const transactions = await models.Transactions.find({
      contractId: contract._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return transactions;
  },
  async storeInterest(contract: IContractDocument, _, { models }: IContext) {
    const transactions = await models.Transactions.find({
      contractId: contract._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return transactions;
  },
  async loansOfForeclosed(
    contract: IContractDocument,
    _,
    { subdomain }: IContext
  ) {
    const loans = await sendMessageBroker(
      {
        subdomain,
        action: 'contracts.find',
        data: { savingContractId: contract._id, status: { $ne: 'closed' } },
        isRPC: true,
      },
      'loans'
    );

    return loans;
  },
  async remainAmount(contract: IContractDocument, _, { models }: IContext) {
    const contractType = await models.ContractTypes.findOne({
      _id: contract.contractTypeId,
    });

    if (contractType)
      return (
        (contract.savingAmount / 100) * contractType.limitPercentage -
        contract.blockAmount
      );
  },
};

export default Contracts;
