import {
  customFieldToObject,
  fetchPolaris,
  getBranch,
  sendMessageBrokerData,
} from '../utils';
import { integrateCollateralToLoan } from './integrateCollateralToLoan';
import { openCollateral } from './openCollateral';

export const createCollateral = async (
  subdomain: string,
  polarisConfig,
  loan: any
) => {
  const collateral = loan.collateralsData?.[0];
  if (!collateral) return;
  let collateralRes;

  const branch = await getBranch(subdomain, loan.branchId);

  const customer = await sendMessageBrokerData(
    subdomain,
    'core',
    'customers.findOne',
    { _id: loan.customerId }
  );

  const customerData = await customFieldToObject(
    subdomain,
    'core:customer',
    customer
  );

  let sendData = {
    name: `${customer.firstName} ${customer.lastName}`,
    name2: `${customer.firstName} ${customer.lastName}`,
    custCode: customer.code,
    prodCode: '700111220013', // ene code iig nyagtlah
    prodType: 'COLL',
    collType: '2',
    brchCode: branch.code,
    addrId: 300001,
    addrDetail: 'Address detail',
    status: 'N',
    maskCode4: 'ГД',
    mask2Code4: 'ГД',
    description: 'collateral.description',
    qty: 4,
    unitPrice: collateral.cost,
    price: collateral.cost,
    curCode: 'MNT',
    priceDate: new Date(),
    prvnReleasePrcnt: 10,
    maskType: 4,
    allowQty: 1,
    maskCode: 'ГД',
    maskCode2: 'ГД',
    marketValueType: '0',
    marketValueDate: new Date(),
    marketValue: collateral.marginAmount,
    registerCode: customerData.registerCode,
    identityType: 'NES',
    acntProp: {
      sizeSquare: 55,
      sizeSquareUnit: '1',
      cntRoom: 2,
      startDate: '2021-12-30 00:00:00.000',
      endDate: '2022-03-30 00:00:00.000',
      quality: '1',
      purpose: '1',
      mark: '7272',
      color: 'red',
      power: '75227',
      frameNumber: 'erfefe',
      importedDate: '2019-04-14 00:00:00.000',
      factoryDate: '2021-11-18 00:00:00.000',
      courtOrderDate: '2021-12-02 00:00:00.000',
      mrtConfirmedDate: '2021-12-16 00:00:00.000',
      cmrtRegisteredDate: '2018-02-05 00:00:00.000',
      mrtRegisteredDate: '2021-11-19 00:00:00.000',
      courtOrderNo: '74747474',
      mrtOrg: '01',
      registeredToAuthority: '1',
      causeToShiftTo: 0,
    },
  };

  if (
    customer?.code &&
    collateral?.cost &&
    customerData?.registerCode != null
  ) {
    collateralRes = await fetchPolaris({
      subdomain,
      op: '13610900',
      data: [sendData],
      polarisConfig,
    });
  }

  if (collateralRes.acntCode) {
    await openCollateral(subdomain, polarisConfig, collateralRes.acntCode);

    return await integrateCollateralToLoan(subdomain, polarisConfig, {
      code: collateralRes.acntCode,
      amount: collateral.marginAmount,
      loanNumber: loan.number,
    });
  }
};
