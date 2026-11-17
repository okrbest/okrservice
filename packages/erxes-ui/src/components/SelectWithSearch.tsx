import * as compose from 'lodash.flowright';

import Select, {
  MultiValueProps,
  OnChangeValue,
  components,
} from 'react-select';
import { __ } from 'coreui/utils';
import { confirm, readFile, withProps } from '../utils';

import { IOption } from '../types';
import {
  mergeLoadedOptions,
  nextSearchValue,
  pickSelectedOptions,
  sameValues,
} from './selectWithSearchOptions';
import Icon from './Icon';
import React from 'react';
import colors from '../styles/colors';
import { gql } from '@apollo/client';
import { graphql } from '@apollo/client/react/hoc';
import styled from 'styled-components';

export const SelectValue = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: -2px;
  padding-left: 18px;

  img {
    position: absolute;
    left: 0;
  }
`;

const SelectOption = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Avatar = styled.img`
  width: 20px !important;
  height: 20px !important;
  border-radius: 10px;
  background: ${colors.bgActive};
  object-fit: cover;
  float: left;
  margin-right: 5px;
`;

const SelectWrapper = styled.div`
  position: relative;

  .Select-clear-zone {
    visibility: hidden;
  }
`;

const ClearButton = styled.div`
  position: absolute;
  right: 18px;
  font-size: 16px;
  top: 50%;
  width: 18px;
  z-index: 2;
  color: #999;
  line-height: 24px;
  margin-top: -14px;

  &:hover {
    color: #ea475d;
    cursor: pointer;
  }
`;

type Props = {
  initialValuesProvided: boolean;
  initialValues: string[];
  searchValue: string;
  search: (search: string, loadMore?: boolean) => void;
  abortController;
} & WrapperProps;

const content = (option: IOption): React.ReactNode => (
  <>
    <Avatar
      src={
        option.avatar
          ? readFile(option.avatar, 40, true)
          : '/images/avatar-colored.svg'
      }
    />
    {option.label}
  </>
);

export const selectItemRenderer = (
  option: IOption,
  showAvatar: boolean,
  OptionWrapper,
): React.ReactNode => {
  if (!showAvatar) {
    return option.label;
  }

  return <OptionWrapper>{content(option)}</OptionWrapper>;
};

class SelectWithSearch extends React.Component<
  Props,
  {
    totalOptions?: IOption[];
    selectedOptions?: IOption[];
    selectedValues: string[];
    searchValue: string;
  }
> {
  private timer: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      selectedValues: props.initialValues,
      searchValue: '',
      selectedOptions: undefined,
      totalOptions: undefined,
    };

    this.timer = 0;
  }

  componentWillReceiveProps(nextProps: Props) {
    const { queryName, customQuery, initialValues, generateOptions } =
      nextProps;

    const { initialValuesProvided } = this.props;
    const { selectedValues, selectedOptions, totalOptions } = this.state;

    // 저장된 값(initialValues)이 실제로 바뀌었을 때만 선택 상태를 맞춘다.
    // 화면이 다시 그려질 때마다 덮어쓰면, 방금 고른 항목이 저장 반영 전 값으로 지워진다.
    let nextSelectedValues = selectedValues;

    if (!sameValues(initialValues, this.props.initialValues)) {
      if (initialValues?.length) {
        nextSelectedValues = initialValues;
      } else if (initialValuesProvided && selectedValues.length) {
        // trigger clearing values by initialValues prop
        nextSelectedValues = [];
      }
    }

    if (nextSelectedValues !== selectedValues) {
      this.setState({ selectedValues: nextSelectedValues });
    }

    if (customQuery.loading !== this.props.customQuery.loading) {
      const datas = customQuery[queryName] || [];

      // 선택된 항목 + 이번에 받은 항목 전체 — 이미 보였던 항목을 빼면 다시 받은 목록이 비어 보인다
      const updatedTotalOptions = mergeLoadedOptions({
        selectedOptions,
        loadedOptions: generateOptions(datas),
        exactFilter: this.props.exactFilter,
      });

      // 선택 칩은 알고 있는 항목 전체에서 찾는다 — 목록 조회는 선택된 항목을 빼고 오므로
      const upSelectedOptions = this.props.exactFilter
        ? pickSelectedOptions(nextSelectedValues, updatedTotalOptions)
        : pickSelectedOptions(
            nextSelectedValues,
            updatedTotalOptions,
            selectedOptions,
            totalOptions,
          );

      if (
        this.props.exactFilter &&
        nextSelectedValues?.length &&
        !upSelectedOptions.length
      ) {
        this.setState({
          selectedValues: [],
        });
        this.props.onSelect([], this.props.name);
      }

      this.setState({
        totalOptions: updatedTotalOptions,
        selectedOptions: upSelectedOptions,
      });
    }
  }

  renderClearButton = () => {
    if (!this.props.multi) {
      return null;
    }

    const { selectedValues = [] } = this.state;

    if (selectedValues.length > 0) {
      return (
        <ClearButton onClick={this.onClear}>
          <Icon icon="times" />
        </ClearButton>
      );
    }

    return null;
  };

  onClear = (e) => {
    confirm().then(() => {
      this.props.onSelect([], this.props.name);
      this.setState({ selectedValues: [], selectedOptions: [] });
    });
  };

  render() {
    const {
      customQuery,
      label,
      onSelect,
      name,
      search,
      multi,
      customOption,
      showAvatar = true,
      menuPortalTarget,
      customStyles,
    } = this.props;

    const { totalOptions, selectedOptions } = this.state;

    const selectMultiple = (ops: OnChangeValue<IOption, true>) => {
      const selectedOptionsValues = ops.map((option) => option.value);

      onSelect(selectedOptionsValues, name);

      this.setState({
        selectedValues: selectedOptionsValues,
        selectedOptions: [...ops],
      });
    };

    const selectSingle = (option: OnChangeValue<IOption, false>) => {
      const selectedOptionValue = option ? option.value : '';
      const selectedOption = option ? option : { value: '', label: '' };

      onSelect(selectedOptionValue, name, option?.extraValue, option?.obj);

      this.setState({
        selectedValues: [selectedOptionValue],
        selectedOptions: [{ ...selectedOption }],
      });
    };

    const onChange = multi ? selectMultiple : selectSingle;

    const onSearch = (
      searchValue: string,
      actionMeta?: { action?: string },
    ) => {
      // 항목 선택·메뉴 닫기로 입력칸이 비는 것은 검색이 아니다(열린 목록 조회가 취소되지 않게)
      const nextSearch = nextSearchValue(searchValue, actionMeta?.action);

      if (nextSearch === null) {
        return;
      }

      this.setState({ searchValue });

      clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        search(nextSearch);
      }, 1200);
    };

    const onOpen = () => search('reload');

    const selectOptions = [...(totalOptions || [])];

    if (customOption) {
      selectOptions.unshift(customOption);
    }

    const Option = (props) => {
      return (
        <components.Option {...props}>
          {selectItemRenderer(props.data, showAvatar, SelectOption)}
        </components.Option>
      );
    };

    const MultiValue = ({
      children,
      ...props
    }: MultiValueProps<any, boolean, any>) => (
      <components.MultiValue {...props}>
        {selectItemRenderer(props.data, showAvatar, SelectValue)}
      </components.MultiValue>
    );

    const filterOption = (_option, _inputValue): boolean => true;

    return (
      <Select
        isClearable={true}
        placeholder={__(label)}
        value={multi ? selectedOptions : selectedOptions && selectedOptions[0]}
        loadingMessage={({ inputValue }) => __('Loading...')}
        filterOption={filterOption}
        isLoading={customQuery.loading}
        onMenuOpen={onOpen}
        components={{ Option, MultiValue }}
        onChange={(options: any) => onChange(options)}
        openMenuOnClick={true}
        onInputChange={onSearch}
        options={selectOptions}
        isMulti={multi}
        styles={customStyles}
        menuPortalTarget={menuPortalTarget}
      />
    );
  }
}

const withQuery = ({ customQuery }) =>
  withProps<Props>(
    compose(
      graphql<
        Props,
        {},
        { searchValue?: string; ids?: string[]; filterParams?: any }
      >(gql(customQuery), {
        name: 'customQuery',
        options: ({
          searchValue,
          filterParams,
          initialValues,
          abortController,
        }) => {
          const context = { fetchOptions: { signal: abortController.signal } };

          if (searchValue === 'reload') {
            return {
              context,
              variables: {
                ids: initialValues,
                excludeIds: true,
                ...filterParams,
              },
              fetchPolicy: 'network-only',
              notifyOnNetworkStatusChange: true,
            };
          }

          if (searchValue) {
            return { context, variables: { searchValue, ...filterParams } };
          }

          return {
            context,
            fetchPolicy: 'network-only',
            variables: {
              ids: initialValues,
              ...filterParams,
            },
          };
        },
      }),
    )(SelectWithSearch),
  );

type IInitialValue = string | string[] | undefined;

type WrapperProps = {
  initialValue: IInitialValue;
  queryName: string;
  name: string;
  label: string;
  onSelect: (
    values: string[] | string,
    name: string,
    extraValue?: string,
    obj?: any,
  ) => void;
  generateOptions: (datas: any[]) => IOption[];
  customQuery?: any;
  multi?: boolean;
  menuPortalTarget?: any;
  customStyles?: any;
  filterParams?: any;
  showAvatar?: boolean;
  customOption?: {
    value: string;
    label: string;
    avatar?: string;
  };
  exactFilter?: boolean;
};

class Wrapper extends React.Component<
  WrapperProps,
  { searchValue: string; abortController },
  { WithQuery: React.ReactNode }
> {
  private withQuery;

  constructor(props) {
    super(props);

    this.withQuery = withQuery({ customQuery: this.props.customQuery });

    this.state = { searchValue: '', abortController: new AbortController() };
  }

  search = (searchValue: string) => {
    const { abortController } = this.state;

    if (abortController) {
      abortController.abort();
    }

    this.setState({ searchValue, abortController: new AbortController() });
  };

  render() {
    const { searchValue, abortController } = this.state;
    const { initialValue } = this.props;

    const Component = this.withQuery;

    let initialValues: string[] = [];

    if (initialValue) {
      initialValues =
        typeof initialValue === 'string' ? [initialValue] : initialValue;
    }

    return (
      <Component
        {...this.props}
        initialValuesProvided={initialValues.length ? true : false}
        initialValues={initialValues}
        abortController={abortController}
        search={this.search}
        searchValue={searchValue}
      />
    );
  }
}

export default Wrapper;
