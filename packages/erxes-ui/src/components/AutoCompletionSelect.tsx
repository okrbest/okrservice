import { __ } from "coreui/utils";
import { Alert } from "../utils";
import React, { useCallback, useEffect, useState } from "react";

import Icon from "./Icon";
import client from "../apolloClient";
import debounce from "lodash/debounce";
import { gql } from "@apollo/client";
import CreatableSelect from "react-select/creatable";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  input {
    display: block;
    width: 100%;
    border: none;
  }
`;

const OptionWrapper = styled(Wrapper)`
  padding: 8px 16px;
  font-weight: 500;
  border-bottom: 1px solid #eee;
  &:last-child {
    border: none;
  }
  &:hover {
    background: #fafafa;
    cursor: default;
  }
  i {
    color: #ea475d;
    &:hover {
      cursor: pointer;
    }
  }
`;

const FillContent = styled.div`
  flex: 1;
  margin-right: 5px;
`;

function Option(props: {
  option: { label: string; value: string; onRemove: (value: string) => void };
  onSelect: (option: Option, e: any) => void;
}) {
  const { option, onSelect } = props;
  const { onRemove } = option;

  const onClick = (e) => {
    onSelect(option, e);
  };

  const onRemoveClick = (e) => {
    e.stopPropagation();

    onRemove(option.value);
  };

  if (!onRemove) {
    return (
      <OptionWrapper>
        <FillContent>{option.label}</FillContent>
        <small>({__("Already exist")})</small>
      </OptionWrapper>
    );
  }

  return (
    <OptionWrapper onClick={onClick}>
      <FillContent>{option.label}</FillContent>
      <Icon
        style={{ float: "right" }}
        icon="times-circle"
        onClick={onRemoveClick}
      />
    </OptionWrapper>
  );
}

type Option = {
  label: string;
  value?: string;
  onRemove?: (value: string) => void;
};

type Props = {
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  defaultOptions: string[];
  autoCompletionType: string;
  queryName: string;
  query: string;
  checkFormat?: (value) => boolean;
  onChange: (params: { options: string[]; selectedOption: any }) => void;
};

type Field = {
  search: { label: string; options: Option[] };
  added: { label: string; options: Option[] };
};

function AutoCompletionSelect({
  placeholder,
  queryName,
  query,
  defaultOptions,
  autoCompletionType,
  defaultValue,
  required,
  checkFormat,
  onChange,
}: Props) {
  const selectRef = React.useRef<{ handleInputBlur: () => void }>(null);

  const handleRemove = (value: string) => {
    const currentFields = { ...fields };
    const addedOptions = currentFields.added.options;

    const filteredOptions = addedOptions.filter(
      (option) => option.value !== value
    );

    currentFields.added.options = filteredOptions;

    setSearchValue("");
    setSelectedValue(null);
    setFields(currentFields);

    onChange({
      options: currentFields.added.options.map((item) => item.label),
      selectedOption: null,
    });
  };

  const [fields, setFields] = useState<Field>({
    added: {
      label: __(`Possible ${autoCompletionType}`),
      options: defaultOptions.map((item) => ({
        label: item,
        value: item,
        onRemove: handleRemove,
      })),
    },
    search: {
      label: __("Search result"),
      options: [],
    },
  });

  useEffect(() => {
    setFields({
      added: {
        label: __(`Possible ${autoCompletionType}`),
        options: defaultOptions.map((item) => ({
          label: item,
          value: item,
          onRemove: handleRemove,
        })),
      },
      search: {
        label: __("Search result"),
        options: [],
      },
    });
  }, [defaultOptions]);

  const [selectedValue, setSelectedValue] = useState<Option | null>(
    defaultValue ? { label: defaultValue, value: defaultValue } : null
  );
  const [searchValue, setSearchValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const generateOptions = useCallback(
    (list) => {
      if (list.length === 0) {
        return [];
      }

      const options: string[] = [];

      list.map((item) => options.push(...item[autoCompletionType]));

      return options.map((item) => ({
        label: item,
        value: item,
      }));
    },
    [autoCompletionType]
  );

  const setFetchResult = useCallback(
    (list) => {
      const options = generateOptions(list).filter(
        (item) => item.label !== defaultValue
      );

      const currentFields = { ...fields };

      currentFields.search.options = options;

      setLoading(false);
      setFields(currentFields);
    },
    [defaultValue, fields, generateOptions]
  );

  const fetch = useCallback(() => {
    setLoading(true);

    return client
      .query({
        query: gql(query),
        variables: {
          searchValue,
          autoCompletionType,
          autoCompletion: true,
        },
      })
      .then(({ data }) => {
        setFetchResult(data[queryName]);
      });
  }, [searchValue, autoCompletionType, query, queryName, setFetchResult]);

  useEffect(() => {
    if (searchValue.length === 0) {
      return;
    }

    debounce(() => fetch(), 400)();
  }, [searchValue, fetch]);

  const handleChange = (option) => {
    setSearchValue("");
    setSelectedValue(option);

    if (option) {
      const values = fields.added.options.map((item) => item.label);

      onChange({
        options: values,
        selectedOption: option.value,
      });
    }
  };

  const handleInput = (input: string) => {
    setSearchValue(input);
  };

  const handleSave = () => {
    setSearchValue("");

    const newItem = {
      label: searchValue,
      value: searchValue,
      onRemove: handleRemove,
    };

    const currentFields = { ...fields };
    const addedOptions = currentFields.added.options;

    addedOptions.push(newItem);

    setSelectedValue(newItem);
    setFields(currentFields);

    if (selectRef && selectRef.current) {
      selectRef.current.handleInputBlur();
    }

    onChange({
      options: addedOptions.map((item) => item.label),
      selectedOption: searchValue,
    });
  };

  const handleAdd = () => {
    const { added, search } = fields;

    const hasSearchResult = search.options.length > 0;
    const currentPossibleValues = added.options.map((item) => item.label);

    const isDuplicated = currentPossibleValues.includes(searchValue);

    if (hasSearchResult || isDuplicated) {
      return;
    }

    if (checkFormat) {
      if (checkFormat(searchValue)) {
        return handleSave();
      }

      return Alert.error("Invalid format");
    }

    return handleSave();
  };

  const handleOnBlur = () => {
    const currentFields = { ...fields };

    currentFields.search.options = [];

    setFields(currentFields);
  };

  const handleKeyDown = (event) => {
    // enter key
    if (event.keyCode === 13 && searchValue.length !== 0) {
      event.preventDefault();

      handleAdd();
    }
  };

  return (
    <Wrapper>
      <FillContent>
        <CreatableSelect
          // ref={selectRef}
          // isLoading={loading}
          isClearable={true}
          required={required}
          placeholder={__(placeholder)}
          value={selectedValue}
          options={[fields.added, fields.search]}
          onBlur={handleOnBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInputChange={handleInput}
        />
      </FillContent>
    </Wrapper>
  );
}

export default AutoCompletionSelect;
