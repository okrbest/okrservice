export interface IPolarisDeposit {
  acntType: string;
  prodCode: string;
  brchCode: string;
  curCode: string;
  custCode: string;
  name: string;
  name2: string;
  slevel: string;
  jointOrSingle: string;
  dormancyDate: string;
  statusDate: string;
  flagNoCredit: string;
  flagNoDebit: string;
  salaryAcnt: string;
  corporateAcnt: string;
  capAcntCode: string;
  capMethod: string;
  segCode: string;
  paymtDefault: string;
  odType: string;
}

export interface IPolarisUpdateDeposit {
  corporateAcnt: string;
  capAcntSysNo: string;
  jointOrSingle: string;
  salaryAcnt: string;
  flagNoDebit: number;
  flagNoCredit: number;
  statusProd: number;
  sysNo: string;
  statusSys: string;
  slevel: number;
  capMethod: string;
  paymtDefault: number;
  classNoTrm: number;
  acntCode: string;
  statusSysName2: string;
  readName: number;
  totalAvailBal: number;
  lastSeqTxn: number;
  crntBal: number;
  prodName: string;
  flagStoppedPayment: number;
  companyCode: string;
  acntManagerName: string;
  acntManager: number;
  readTran: number;
  flagFrozen: number;
  odBal: number;
  name: string;
  name2: string;
  custType: number;
  modifiedDate: Date;
  flagDormant: number;
  createdDatetime: Date;
  odType: string;
  doTran: number;
  brchCode: string;
  odTypeName: string;
  readDetail: number;
  modifiedDatetime: Date;
  flagStopped: number;
  custName2: string;
  prodName2: string;
  acntType: 'CA';
  modifiedBy: number;
  curCode: string;
  classNoQlt: number;
  brchName: string;
  dailyBasisCode: string;
  isSecure: number;
  monthlyWdCount: number;
  custName: string;
  flagStoppedInt: number;
  custCode: string;
  availBal: number;
  prodCode: string;
  readBal: number;
  createdDate: Date;
  segCode: string;
  createdBy: number;
  statusSysName: string;
  passbookFacility: number;
  totalBal: number;
  odClassNo: number;
}
