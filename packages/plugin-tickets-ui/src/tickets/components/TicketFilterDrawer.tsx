import React, { useState } from "react";
import { __ } from "coreui/utils";
import Button from "@erxes/ui/src/components/Button";
import SelectCompanies from "@erxes/ui-contacts/src/companies/containers/SelectCompanies";
import SelectCustomers from "@erxes/ui-contacts/src/customers/containers/SelectCustomers";
import Select, { OnChangeValue } from "react-select";
import { IOption } from "@erxes/ui/src/types";
import { Transition } from "@headlessui/react";
import styled from "styled-components";
import { colors, dimensions } from "@erxes/ui/src/styles";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import { router as routerUtils } from "@erxes/ui/src/utils";
import { useLocation, useNavigate } from "react-router-dom";

const RightDrawerContainer = styled.div`
  position: fixed;
  z-index: 10;
  top: 120px;
  right: 0;
  bottom: 0;
  width: 400px;
  background: ${colors.colorWhite};
  box-shadow:
    0 12px 24px -6px rgba(9, 30, 66, 0.25),
    0 0 0 1px rgba(9, 30, 66, 0.08);
  display: flex;
  flex-direction: column;
`;

const ScrolledContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: ${dimensions.coreSpacing}px;
`;

const FilterHeader = styled.div`
  padding: ${dimensions.coreSpacing}px;
  border-bottom: 1px solid ${colors.borderPrimary};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
`;

const FilterFooter = styled.div`
  padding: ${dimensions.coreSpacing}px;
  border-top: 1px solid ${colors.borderPrimary};
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

type Props = {
  queryParams: any;
  onSelect: (values: string[] | string, name: string) => void;
  btnSize?: string;
};

const TicketFilterDrawer = ({ queryParams, onSelect, btnSize }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    queryParams?.companyIds ? (typeof queryParams.companyIds === 'string' ? queryParams.companyIds.split(",") : queryParams.companyIds) : []
  );
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    queryParams?.customerIds ? (typeof queryParams.customerIds === 'string' ? queryParams.customerIds.split(",") : queryParams.customerIds) : []
  );
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>(
    queryParams?.requestType ? (Array.isArray(queryParams.requestType) ? queryParams.requestType : [queryParams.requestType]) : []
  );

  const toggleDrawer = () => {
    setShowDrawer(!showDrawer);
  };

  const requestTypeValues = [
    { label: __("단순문의"), value: "inquiry" },
    { label: __("개선요청"), value: "improvement" },
    { label: __("오류처리"), value: "error" },
    { label: __("설정변경"), value: "config" }
  ];

  const onRequestTypeSelect = (ops: OnChangeValue<IOption, true>) => {
    const values = ops ? ops.map((option) => option.value) : [];
    setSelectedRequestTypes(values);
  };

  const onCompanySelect = (values: string[] | string, name: string) => {
    const companyIds = Array.isArray(values) ? values : values ? [values] : [];
    setSelectedCompanies(companyIds);
    
    // 회사가 변경되면 기존에 선택된 고객을 초기화
    if (selectedCustomers.length > 0) {
      setSelectedCustomers([]);
    }
  };

  const onCustomerSelect = (values: string[] | string, name: string) => {
    const customerIds = Array.isArray(values) ? values : values ? [values] : [];
    setSelectedCustomers(customerIds);
  };

  const applyFilter = () => {
    // 먼저 제거할 파라미터들을 제거
    const paramsToRemove: string[] = [];

    if (selectedCompanies.length === 0 && queryParams.companyIds) {
      paramsToRemove.push("companyIds");
    }
    if (selectedCustomers.length === 0 && queryParams.customerIds) {
      paramsToRemove.push("customerIds");
    }
    if (selectedRequestTypes.length === 0 && queryParams.requestType) {
      paramsToRemove.push("requestType");
    }

    if (paramsToRemove.length > 0) {
      routerUtils.removeParams(navigate, location, ...paramsToRemove);
    }

    // 그 다음 설정할 파라미터들을 설정
    const paramsToSet: any = {};

    if (selectedCompanies.length > 0) {
      paramsToSet.companyIds = selectedCompanies;
    }
    if (selectedCustomers.length > 0) {
      paramsToSet.customerIds = selectedCustomers;
    }
    if (selectedRequestTypes.length > 0) {
      paramsToSet.requestType = selectedRequestTypes;
    }

    if (Object.keys(paramsToSet).length > 0) {
      routerUtils.setParams(navigate, location, paramsToSet);
    }

    toggleDrawer();
  };

  const clearFilter = () => {
    setSelectedCompanies([]);
    setSelectedCustomers([]);
    setSelectedRequestTypes([]);
    routerUtils.removeParams(navigate, location, "companyIds", "customerIds", "requestType");
    toggleDrawer();
  };

  const content = (
    <Transition show={showDrawer} className="slide-in-right">
      <RightDrawerContainer>
        <FilterHeader>
          <h4>{__("티켓 필터")}</h4>
          <Button
            btnStyle="simple"
            icon="times"
            onClick={toggleDrawer}
            size="small"
          />
        </FilterHeader>

        <ScrolledContent>
          <FormGroup>
            <ControlLabel>{__("회사 선택")}</ControlLabel>
            <SelectCompanies
              label={__("회사를 선택하세요")}
              name="companyIds"
              queryParams={queryParams}
              onSelect={onCompanySelect}
              perPage={100}
              multi={true}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__("선택한 회사에서 발급한 티켓만 표시됩니다")}
            </p>
          </FormGroup>

          <FormGroup>
            <ControlLabel>{__("고객 선택")}</ControlLabel>
            <SelectCustomers
              label={__("고객을 선택하세요")}
              name="customerIds"
              queryParams={queryParams}
              onSelect={onCustomerSelect}
              multi={true}
              filterParams={
                selectedCompanies.length > 0
                  ? { companyIds: selectedCompanies }
                  : undefined
              }
            />
            {selectedCompanies.length > 0 && (
              <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
                {__("선택한 회사와 연관된 고객만 표시됩니다")}
              </p>
            )}
          </FormGroup>

          <FormGroup>
            <ControlLabel>{__("고객요청구분")}</ControlLabel>
            <Select
              placeholder={__("고객요청구분을 선택하세요")}
              value={requestTypeValues.filter((rt) =>
                selectedRequestTypes.includes(rt.value)
              )}
              options={requestTypeValues}
              name="requestType"
              onChange={onRequestTypeSelect}
              isMulti={true}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__("단순문의, 개선요청, 오류처리, 설정변경")}
            </p>
          </FormGroup>
        </ScrolledContent>

        <FilterFooter>
          <Button btnStyle="simple" onClick={clearFilter}>
            {__("초기화")}
          </Button>
          <Button btnStyle="success" onClick={applyFilter} icon="check-circle">
            {__("필터 적용")}
          </Button>
        </FilterFooter>
      </RightDrawerContainer>
    </Transition>
  );

  return (
    <>
      <Button
        btnStyle="primary"
        size={btnSize || "small"}
        icon={showDrawer ? "times-circle" : "plus-circle"}
        onClick={toggleDrawer}
      >
        {showDrawer ? __("필터 닫기") : __("필터 추가")}
      </Button>

      {showDrawer && content}
    </>
  );
};

export default TicketFilterDrawer;

