import React, { useState, useEffect, useRef } from "react";
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
  const scrolledContentRef = useRef<HTMLDivElement>(null);
  const requestTypeSectionRef = useRef<HTMLDivElement>(null);
  
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    queryParams?.companyIds ? (typeof queryParams.companyIds === 'string' ? queryParams.companyIds.split(",") : queryParams.companyIds) : []
  );
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    queryParams?.customerIds ? (typeof queryParams.customerIds === 'string' ? queryParams.customerIds.split(",") : queryParams.customerIds) : []
  );
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>(
    queryParams?.priority
      ? Array.isArray(queryParams.priority)
        ? queryParams.priority
        : [queryParams.priority]
      : []
  );
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>(
    queryParams?.requestType ? (Array.isArray(queryParams.requestType) ? queryParams.requestType : [queryParams.requestType]) : []
  );
  const [selectedQualityImpacts, setSelectedQualityImpacts] = useState<string[]>(
    queryParams?.qualityImpact ? (Array.isArray(queryParams.qualityImpact) ? queryParams.qualityImpact : [queryParams.qualityImpact]) : []
  );
  const [selectedFunctionCategories, setSelectedFunctionCategories] = useState<string[]>(
    queryParams?.functionCategory ? (Array.isArray(queryParams.functionCategory) ? queryParams.functionCategory : [queryParams.functionCategory]) : []
  );

  const toggleDrawer = () => {
    setShowDrawer(!showDrawer);
  };

  const scrollToRequestTypeSection = () => {
    if (scrolledContentRef.current && requestTypeSectionRef.current) {
      const container = scrolledContentRef.current;
      const targetEl = requestTypeSectionRef.current;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const delta = targetRect.top - containerRect.top;
      const newScrollTop = container.scrollTop + delta - 16;

      container.scrollTo({
        top: Math.max(newScrollTop, 0),
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (showDrawer) {
      scheduleScroll(false, 0);
    }
  }, [showDrawer]);

  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleScroll = (scrollToBottom = false, delay = 0) => {
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }

    scrollingTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        scrollToRequestTypeSection(scrollToBottom);
      });
    }, delay);
  };

  useEffect(() => {
    if (!showDrawer && scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
  }, [showDrawer]);

  const handleRequestTypeMenuOpen = () => {
    scheduleScroll(false, 0);
  };

  const priorityValues = [
    { label: __("Critical"), value: "Critical" },
    { label: __("High"), value: "High" },
    { label: __("Medium"), value: "Medium" },
    { label: __("Low"), value: "Low" }
  ];

  const onPrioritySelect = (ops: OnChangeValue<IOption, true>) => {
    const values = ops ? ops.map((option) => option.value) : [];
    setSelectedPriorities(values);
  };

  const requestTypeValues = [
    { label: __("단순문의"), value: "inquiry" },
    { label: __("개선요청"), value: "improvement" },
    { label: __("오류처리"), value: "error" },
    { label: __("설정변경"), value: "config" },
    { label: __("추가개발"), value: "additional_development" },
    { label: __("사용안내"), value: "usage_guide" }
  ];

  const onRequestTypeSelect = (ops: OnChangeValue<IOption, true>) => {
    const values = ops ? ops.map((option) => option.value) : [];
    setSelectedRequestTypes(values);
  };

  const qualityImpactValues = [
    { label: __("치명적"), value: "critical" },
    { label: __("중대"), value: "major" },
    { label: __("경미"), value: "minor" },
    { label: __("시각적"), value: "visual" }
  ];

  const onQualityImpactSelect = (ops: OnChangeValue<IOption, true>) => {
    const values = ops ? ops.map((option) => option.value) : [];
    setSelectedQualityImpacts(values);
  };

  const functionCategoryValues = [
    { label: __("인사"), value: "hr" },
    { label: __("조직"), value: "organization" },
    { label: __("근태"), value: "attendance" },
    { label: __("급여"), value: "payroll" },
    { label: __("평가"), value: "evaluation" },
    { label: __("교육"), value: "education" },
    { label: __("채용"), value: "recruitment" },
    { label: __("복리후생"), value: "benefits" },
    { label: __("PCOFF"), value: "pcoff" },
    { label: __("전자결재"), value: "approval" },
    { label: __("시스템"), value: "system" }
  ];

  const onFunctionCategorySelect = (ops: OnChangeValue<IOption, true>) => {
    const values = ops ? ops.map((option) => option.value) : [];
    setSelectedFunctionCategories(values);
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
    if (selectedPriorities.length === 0 && queryParams.priority) {
      paramsToRemove.push("priority");
    }
    if (selectedRequestTypes.length === 0 && queryParams.requestType) {
      paramsToRemove.push("requestType");
    }
    if (selectedQualityImpacts.length === 0 && queryParams.qualityImpact) {
      paramsToRemove.push("qualityImpact");
    }
    if (selectedFunctionCategories.length === 0 && queryParams.functionCategory) {
      paramsToRemove.push("functionCategory");
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
    if (selectedPriorities.length > 0) {
      paramsToSet.priority = selectedPriorities;
    }
    if (selectedRequestTypes.length > 0) {
      paramsToSet.requestType = selectedRequestTypes;
    }
    if (selectedQualityImpacts.length > 0) {
      paramsToSet.qualityImpact = selectedQualityImpacts;
    }
    if (selectedFunctionCategories.length > 0) {
      paramsToSet.functionCategory = selectedFunctionCategories;
    }

    if (Object.keys(paramsToSet).length > 0) {
      routerUtils.setParams(navigate, location, paramsToSet);
    }

    toggleDrawer();
  };

  const clearFilter = () => {
    setSelectedCompanies([]);
    setSelectedCustomers([]);
    setSelectedPriorities([]);
    setSelectedRequestTypes([]);
    setSelectedQualityImpacts([]);
    setSelectedFunctionCategories([]);
    routerUtils.removeParams(
      navigate,
      location,
      "companyIds",
      "customerIds",
      "priority",
      "requestType",
      "qualityImpact",
      "functionCategory"
    );
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

        <ScrolledContent ref={scrolledContentRef}>
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
            <ControlLabel>{__("우선순위")}</ControlLabel>
            <Select
              placeholder={__("우선순위를 선택하세요")}
              value={priorityValues.filter((p) =>
                selectedPriorities.includes(p.value)
              )}
              options={priorityValues}
              name="priority"
              onChange={onPrioritySelect}
              isMulti={true}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {`${__("Critical")}, ${__("High")}, ${__("Medium")}, ${__("Low")}`}
            </p>
          </FormGroup>

          <FormGroup>
            <ControlLabel>{__("중요도(품질영향)")}</ControlLabel>
            <Select
              placeholder={__("중요도를 선택하세요")}
              value={qualityImpactValues.filter((qi) =>
                selectedQualityImpacts.includes(qi.value)
              )}
              options={qualityImpactValues}
              name="qualityImpact"
              onChange={onQualityImpactSelect}
              isMulti={true}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__("치명적, 중대, 경미, 시각적")}
            </p>
          </FormGroup>

          <FormGroup>
            <ControlLabel>{__("기능분류")}</ControlLabel>
            <Select
              placeholder={__("기능분류를 선택하세요")}
              value={functionCategoryValues.filter((fc) =>
                selectedFunctionCategories.includes(fc.value)
              )}
              options={functionCategoryValues}
              name="functionCategory"
              onChange={onFunctionCategorySelect}
              isMulti={true}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__("인사, 조직, 근태, 급여, 평가, 교육, 채용, 복리후생, PCOFF, 전자결재, 시스템")}
            </p>
          </FormGroup>

          <FormGroup ref={requestTypeSectionRef}>
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
              onMenuOpen={handleRequestTypeMenuOpen}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__("단순문의, 개선요청, 오류처리, 설정변경, 추가개발")}
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

