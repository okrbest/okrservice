import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { router } from "@erxes/ui/src/utils";
import { __ } from "coreui/utils";
import Button from "@erxes/ui/src/components/Button";
import Icon from "@erxes/ui/src/components/Icon";
import styled from "styled-components";
import { colors } from "@erxes/ui/src/styles";
import Select from "react-select";
import DateControl from "@erxes/ui/src/components/form/DateControl";
import dayjs from "dayjs";
import SelectCompanies from "@erxes/ui-contacts/src/companies/containers/SelectCompanies";
import SelectCustomers from "@erxes/ui-contacts/src/customers/containers/SelectCustomers";
import SelectTeamMembers from "@erxes/ui/src/team/containers/SelectTeamMembers";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";

const FilterBarContainer = styled.div`
  background: ${colors.colorWhite};
  border-bottom: 1px solid ${colors.borderPrimary};
  padding: 15px 20px;
  margin-bottom: 20px;
  border-radius: 4px;
  position: relative;
  z-index: 1000;
  overflow: visible;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 15px;
  align-items: flex-start;
  flex-wrap: wrap;
  overflow: visible;
  background: ${colors.colorWhite};
  position: relative;
  z-index: 50;
`;

const FilterItem = styled.div`
  min-width: 200px;
  flex: 1;
  max-width: 300px;
  overflow: visible;
  position: relative;
  z-index: 100;
  background: ${colors.colorWhite};
`;

const FilterActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
`;

const CollapsibleFilters = styled.div<{ isExpanded: boolean }>`
  max-height: ${props => props.isExpanded ? '500px' : '0'};
  overflow: ${props => props.isExpanded ? 'visible' : 'hidden'};
  transition: max-height 0.3s ease-in-out;
  background: ${colors.colorWhite};
  position: relative;
  z-index: 100;
`;

type Props = {
  queryParams: any;
};

const DashboardFilterBar = (props: Props) => {
  const { queryParams } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const DATE_RANGE_OPTIONS = [
    { label: __('All time'), value: 'all' },
    { label: __('Today'), value: 'today' },
    { label: __('Yesterday'), value: 'yesterday' },
    { label: __('This week'), value: 'thisWeek' },
    { label: __('Last week'), value: 'lastWeek' },
    { label: __('This month'), value: 'thisMonth' },
    { label: __('Last month'), value: 'lastMonth' },
    { label: __('This year'), value: 'thisYear' },
    { label: __('Last year'), value: 'lastYear' },
    { label: __('Custom date'), value: 'customDate' },
  ];
  
  // Custom styles for react-select to ensure dropdown appears above other elements
  const selectStyles = {
    menuPortal: (base: any) => ({ 
      ...base, 
      zIndex: 99999 
    }),
    menu: (base: any) => ({ 
      ...base, 
      zIndex: 99999,
      position: 'absolute',
      backgroundColor: colors.colorWhite,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: `1px solid ${colors.borderPrimary}`
    }),
    menuList: (base: any) => ({
      ...base,
      backgroundColor: colors.colorWhite,
      maxHeight: '300px'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? colors.bgLight : colors.colorWhite,
      color: colors.textPrimary,
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: colors.bgActive
      }
    })
  };
  
  // Track selected companies to filter customers
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    queryParams?.companyIds ? queryParams.companyIds.split(',').filter(Boolean) : []
  );

  // Sync selectedCompanies with queryParams changes
  useEffect(() => {
    const companyIds = queryParams?.companyIds ? queryParams.companyIds.split(',').filter(Boolean) : [];
    setSelectedCompanies(companyIds);
  }, [queryParams.companyIds]);

  const updateFilter = (key: string, value: any) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      router.removeParams(navigate, location, key);
    } else {
      if (Array.isArray(value)) {
        router.setParams(navigate, location, { [key]: value.join(',') });
      } else {
        router.setParams(navigate, location, { [key]: value });
      }
    }
  };

  const clearAllFilters = () => {
    const filterKeys = [
      'companyIds',
      'customerIds',
      'assignedUserIds',
      'dateRange',
      'startDate',
      'endDate'
    ];
    router.removeParams(navigate, location, ...filterKeys);
  };

  const hasActiveFilters = () => {
    return !!(
      queryParams.companyIds ||
      queryParams.customerIds ||
      queryParams.assignedUserIds ||
      queryParams.dateRange ||
      queryParams.startDate ||
      queryParams.endDate
    );
  };

  const onSelect = (value: string[] | string, name: string) => {
    // Track company selection for customer filtering
    if (name === 'companyIds') {
      const companyIds = Array.isArray(value) ? value : value ? [value] : [];
      setSelectedCompanies(companyIds);
    }
    
    updateFilter(name, value);
  };

  const getSelectedDateRange = () => {
    const value = queryParams.dateRange || 'all';
    return DATE_RANGE_OPTIONS.find(opt => opt.value === value) || DATE_RANGE_OPTIONS[0];
  };

  return (
    <FilterBarContainer>
      <FilterRow style={{ zIndex: 200, position: 'relative' }}>
        <FilterItem>
          <FormGroup>
            <ControlLabel>{__('Companies')}</ControlLabel>
            <SelectCompanies
              label={__('Select companies (leave empty for all)')}
              name="companyIds"
              initialValue={
                queryParams.companyIds 
                  ? (typeof queryParams.companyIds === 'string' 
                      ? queryParams.companyIds.split(',').filter(Boolean)
                      : queryParams.companyIds)
                  : undefined
              }
              onSelect={onSelect}
              multi={true}
              perPage={100}
              menuPortalTarget={document.body}
              customStyles={selectStyles}
            />
            <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
              {__('Leave empty to include all companies')}
            </p>
          </FormGroup>
        </FilterItem>

        <FilterItem>
          <FormGroup>
            <ControlLabel>{__('Date Range')}</ControlLabel>
            <Select
              placeholder={__('Select date range')}
              value={getSelectedDateRange()}
              onChange={(selected: any) => {
                updateFilter('dateRange', selected?.value);
              }}
              options={DATE_RANGE_OPTIONS}
              isClearable={false}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          </FormGroup>
        </FilterItem>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <Button
            btnStyle="primary"
            size="small"
            icon={isExpanded ? "angle-up" : "angle-down"}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? __('Less Filters') : __('More Filters')}
          </Button>
          
          {hasActiveFilters() && (
            <Button
              btnStyle="warning"
              size="small"
              icon="times-circle"
              onClick={clearAllFilters}
            >
              {__('Clear All')}
            </Button>
          )}
        </div>
      </FilterRow>

      <CollapsibleFilters isExpanded={isExpanded}>
        <FilterRow style={{ marginTop: '15px' }}>
          <FilterItem>
            <FormGroup>
              <ControlLabel>{__('Customers')}</ControlLabel>
              <SelectCustomers
                label={__('Select customers (leave empty for all)')}
                name="customerIds"
                initialValue={
                  queryParams.customerIds 
                    ? (typeof queryParams.customerIds === 'string' 
                        ? queryParams.customerIds.split(',').filter(Boolean)
                        : queryParams.customerIds)
                    : undefined
                }
                onSelect={onSelect}
                multi={true}
                filterParams={
                  selectedCompanies.length > 0
                    ? { companyIds: selectedCompanies }
                    : undefined
                }
                menuPortalTarget={document.body}
                customStyles={selectStyles}
              />
              {selectedCompanies.length > 0 && (
                <p style={{ fontSize: "12px", color: colors.colorCoreGray, marginTop: "5px" }}>
                  {__('Showing customers from selected companies only')}
                </p>
              )}
            </FormGroup>
          </FilterItem>

          <FilterItem>
            <FormGroup>
              <ControlLabel>{__('Assigned Users')}</ControlLabel>
              <SelectTeamMembers
                label={__('Select users (leave empty for all)')}
                name="assignedUserIds"
                initialValue={
                  queryParams.assignedUserIds 
                    ? (typeof queryParams.assignedUserIds === 'string' 
                        ? queryParams.assignedUserIds.split(',').filter(Boolean)
                        : queryParams.assignedUserIds)
                    : undefined
                }
                onSelect={onSelect}
                multi={true}
                menuPortalTarget={document.body}
                customStyles={selectStyles}
              />
            </FormGroup>
          </FilterItem>
        </FilterRow>


        {queryParams.dateRange === 'customDate' && (
          <FilterRow style={{ marginTop: '15px' }}>
            <FilterItem>
              <FormGroup>
                <ControlLabel>{__('Start Date')}</ControlLabel>
                <DateControl
                  value={queryParams.startDate ? new Date(queryParams.startDate) : undefined}
                  onChange={(date) => {
                    updateFilter('startDate', date ? dayjs(date).format('YYYY-MM-DD') : null);
                  }}
                  placeholder={__('Select start date')}
                />
              </FormGroup>
            </FilterItem>

            <FilterItem>
              <FormGroup>
                <ControlLabel>{__('End Date')}</ControlLabel>
                <DateControl
                  value={queryParams.endDate ? new Date(queryParams.endDate) : undefined}
                  onChange={(date) => {
                    updateFilter('endDate', date ? dayjs(date).format('YYYY-MM-DD') : null);
                  }}
                  placeholder={__('Select end date')}
                />
              </FormGroup>
            </FilterItem>
          </FilterRow>
        )}
      </CollapsibleFilters>

      {hasActiveFilters() && (
        <FilterActions>
          <span style={{ fontSize: '12px', color: colors.colorCoreGray }}>
            <Icon icon="filter" /> {__('Active filters applied to all charts')}
          </span>
        </FilterActions>
      )}
    </FilterBarContainer>
  );
};

export default DashboardFilterBar;





