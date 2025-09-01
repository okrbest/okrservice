import { IOption, IQueryParams } from "@erxes/ui/src/types";
import { __ } from "coreui/utils";
import { ICompany } from "../types";
import React from "react";
import SelectWithSearch from "@erxes/ui/src/components/SelectWithSearch";
import { queries } from "../graphql";
import { gql } from "@apollo/client";
import { graphql } from "@apollo/client/react/hoc";
import * as compose from "lodash.flowright";

// get company options for react-select
export function generateCompanyOptions(array: ICompany[] = []): IOption[] {
  return array.map((item) => {
    const company = item || ({} as ICompany);

    return {
      value: company._id,
      label: company.primaryName || "",
      avatar: company.avatar,
    };
  });
}

type Props = {
  queryParams?: IQueryParams;
  label: string;
  onSelect: (value: string[] | string, name: string) => void;
  multi?: boolean;
  customOption?: IOption;
  initialValue?: string | string[];
  name: string;
  filterParams?: any;
  showAvatar?: boolean;
  perPage?: number;
  onCompanySelect?: (companyId: string, customers: any[]) => void;
  companyDetailQuery?: any;
};

const SelectCompaniesComponent = ({
  queryParams,
  onSelect,
  initialValue,
  multi = true,
  customOption,
  label,
  name,
  filterParams,
  showAvatar = true,
  perPage = 100,
  onCompanySelect,
  companyDetailQuery,
}: Props) => {
  const defaultValue = queryParams ? queryParams[name] : initialValue;

  const handleSelect = (value: string[] | string, name: string) => {
    onSelect(value, name);
    
    // 회사 선택 시 고객 목록 처리
    if (onCompanySelect && !Array.isArray(value)) {
      // 회사 상세 정보를 조회하여 고객 목록을 가져옵니다
      companyDetailQuery({
        variables: { _id: value }
      }).then(({ data }) => {
        if (data && data.companyDetail && data.companyDetail.customers) {
          onCompanySelect(value, data.companyDetail.customers);
        } else {
          onCompanySelect(value, []);
        }
      }).catch(() => {
        onCompanySelect(value, []);
      });
    }
  };

  return (
    <SelectWithSearch
      label={__(label)}
      showAvatar={showAvatar}
      queryName="companies"
      name={name}
      initialValue={defaultValue}
      generateOptions={generateCompanyOptions}
      onSelect={handleSelect}
      customQuery={queries.companies}
      customOption={customOption}
      multi={multi}
      filterParams={{ ...filterParams, perPage }}
    />
  );
};

const withQuery = compose(
  graphql(gql(queries.companyDetail), {
    name: "companyDetailQuery",
    options: () => ({
      fetchPolicy: "cache-and-network"
    })
  })
);

export default withQuery(SelectCompaniesComponent);
