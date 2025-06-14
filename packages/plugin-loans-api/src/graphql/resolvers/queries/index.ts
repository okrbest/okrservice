import periodLockQueries from './periodLocks';
import contractQueries from './contracts';
import contractTypeQueries from './contractTypes';
import insuranceTypeQueries from './insuranceTypes';
import invoiceQueries from './invoices';
import scheduleQueries from './schedules';
import transactionQueries from './transactions';
import collateralQueries from './collaterals';
import classificationQueries from './classification';
import nonBalanceTransactionQueries from './nonBalanceTransactions';
import collateralTypeQueries from './collateralTypes';
import purposeQueries from './purpose';

export default {
  ...periodLockQueries,
  ...contractTypeQueries,
  ...contractQueries,
  ...insuranceTypeQueries,
  ...invoiceQueries,
  ...scheduleQueries,
  ...transactionQueries,
  ...collateralQueries,
  ...classificationQueries,
  ...nonBalanceTransactionQueries,
  ...collateralTypeQueries,
  ...purposeQueries,
};
