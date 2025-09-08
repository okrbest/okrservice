import SelectCompanies from "@erxes/ui-contacts/src/companies/containers/SelectCompanies";
import SelectCustomers from "@erxes/ui-contacts/src/customers/containers/SelectCustomers";
import { IField } from "@erxes/ui/src/types";
import React, { useState, useEffect } from "react";

type Props = {
  contentType: string;
  field: IField;
  onChange: (ids: string[], relationType: string) => void;
  relationData?: any;
  selectedCompanyIds?: string[];
};

const SelectContacts = (props: Props) => {
  const {
    field,
    onChange,
    relationData = {},
    selectedCompanyIds: externalCompanyIds,
  } = props;
  const { relationType = "" } = field;
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

  // 디버깅을 위한 콘솔 출력
  console.log("SelectContactsRelation - props:", props);
  console.log(
    "SelectContactsRelation - externalCompanyIds:",
    externalCompanyIds
  );
  console.log("SelectContactsRelation - relationData:", relationData);
  console.log("SelectContactsRelation - relationType:", relationType);

  // externalCompanyIds가 변경될 때 selectedCompanyIds 업데이트
  useEffect(() => {
    if (externalCompanyIds && externalCompanyIds.length > 0) {
      console.log(
        "SelectContactsRelation - updating selectedCompanyIds from external:",
        externalCompanyIds
      );
      setSelectedCompanyIds(externalCompanyIds);
    }
  }, [externalCompanyIds]);

  if (!["core:customer", "core:company"].includes(relationType)) {
    return null;
  }

  const onSelect = (value: string[] | string, name: string) => {
    const ids = Array.isArray(value) ? value : [value];
    onChange(ids, relationType);
  };

  const onCompanySelect = (value: string[] | string, name: string) => {
    const ids = Array.isArray(value) ? value : [value];
    setSelectedCompanyIds(ids);
    onChange(ids, relationType);
  };

  const renderCustomerSelect = () => {
    if (relationType === "core:company") {
      return null;
    }

    // 외부에서 전달된 companyIds를 우선적으로 사용
    const companyIds =
      externalCompanyIds && externalCompanyIds.length > 0
        ? externalCompanyIds
        : selectedCompanyIds;

    // company가 선택된 경우 해당 company의 customer만 필터링
    const filterParams =
      companyIds && companyIds.length > 0
        ? {
            companyIds: companyIds,
          }
        : {};

    // 디버깅을 위한 콘솔 출력
    console.log(
      "SelectContactsRelation - externalCompanyIds:",
      externalCompanyIds
    );
    console.log(
      "SelectContactsRelation - selectedCompanyIds:",
      selectedCompanyIds
    );
    console.log("SelectContactsRelation - companyIds:", companyIds);
    console.log("SelectContactsRelation - filterParams:", filterParams);

    return (
      <SelectCustomers
        showAvatar={false}
        label="Customer"
        name="customerIds"
        multi={true}
        onSelect={onSelect}
        filterParams={filterParams}
      />
    );
  };

  const renderCompanySelect = () => {
    if (relationType === "core:customer") {
      return null;
    }

    return (
      <SelectCompanies
        showAvatar={false}
        label="Company"
        name="companyIds"
        multi={true}
        onSelect={onCompanySelect}
      />
    );
  };

  // relationData에서 company 정보를 추출하여 상태 업데이트
  useEffect(() => {
    if (relationData && relationData.companyIds) {
      setSelectedCompanyIds(relationData.companyIds);
    }
  }, [relationData]);

  // 외부에서 전달된 companyIds가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    if (externalCompanyIds && externalCompanyIds.length > 0) {
      console.log(
        "SelectContactsRelation - updating selectedCompanyIds from external:",
        externalCompanyIds
      );
      setSelectedCompanyIds(externalCompanyIds);
    }
  }, [externalCompanyIds]);

  return (
    <>
      {renderCompanySelect()}
      {renderCustomerSelect()}
    </>
  );
};

export default SelectContacts;
