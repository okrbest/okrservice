import React, { useEffect, useState } from "react";
import { __ } from "coreui/utils";
import { router } from "@erxes/ui/src/utils";

import Box from "@erxes/ui/src/components/Box";
import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import DataWithLoader from "@erxes/ui/src/components/DataWithLoader";
import DateControl from "@erxes/ui/src/components/form/DateControl";
import Icon from "@erxes/ui/src/components/Icon";
import dayjs from "dayjs";
import queryString from "query-string";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CustomRangeContainer,
  EndDateContainer,
  FilterContainer,
} from "../../styles";

interface IProps {
  counts: { [key: string]: number };
  fields: any[];
  loading: boolean;
  emptyText?: string;
}

function DateFilters(props: IProps) {
  const { fields, loading, emptyText } = props;
  const navigate = useNavigate();
  const location = useLocation();

  const { dateFilters = "{}" } = queryString.parse(location.search);

  const [filterParams, setFilterParams] = useState(JSON.parse(dateFilters));

  useEffect(() => {
    setFilterParams(JSON.parse(dateFilters));
  }, [dateFilters]);

  const onRemove = () => {
    router.removeParams(navigate, location, "dateFilters");
  };

  const extraButtons = (
    <>
      {router.getParam(location, "dateFilters") && (
        <a href="#" tabIndex={0} onClick={onRemove}>
          <Icon icon="times-circle" />
        </a>
      )}
    </>
  );

  const onChangeRangeFilter = (key: string, op: "gte" | "lte", date) => {
    const formattedDate = date ? dayjs(date).format("YYYY-MM-DD") : "";

    const value: any = (filterParams[key] && filterParams[key]) || {
      gte: "",
      lte: "",
    };

    value[op] = formattedDate;

    filterParams[key] = { ...value };

    setFilterParams({ ...filterParams });
  };

  const onChangeFilters = () => {
    router.removeParams(navigate, location, "page");

    router.setParams(navigate, location, {
      dateFilters: JSON.stringify(filterParams),
    });
  };

  const data = (
    <FilterContainer>
      {fields.map((field) => {
        return (
          <React.Fragment key={field._id}>
            <ControlLabel>{field.label} range:</ControlLabel>

            <CustomRangeContainer id="CustomRangeContainer">
              <DateControl
                value={
                  (filterParams[`${field.name}`] &&
                    filterParams[`${field.name}`]["gte"]) ||
                  ""
                }
                required={false}
                name="startDate"
                onChange={(date) =>
                  onChangeRangeFilter(`${field.name}`, "gte", date)
                }
                placeholder={"Start date"}
                dateFormat={"YYYY-MM-DD"}
              />

              <EndDateContainer>
                <DateControl
                  value={
                    (filterParams[`${field.name}`] &&
                      filterParams[`${field.name}`]["lte"]) ||
                    ""
                  }
                  required={false}
                  name="endDate"
                  placeholder={"End date"}
                  onChange={(date) =>
                    onChangeRangeFilter(`${field.name}`, "lte", date)
                  }
                  dateFormat={"YYYY-MM-DD"}
                />
              </EndDateContainer>
            </CustomRangeContainer>
          </React.Fragment>
        );
      })}
      <Button
        block={true}
        btnStyle="success"
        uppercase={false}
        onClick={onChangeFilters}
        icon="filter"
      >
        {__("Filter")}
      </Button>
    </FilterContainer>
  );

  return (
    <Box
      title={__("Filter by date")}
      collapsible={fields.length > 5}
      extraButtons={extraButtons}
      name="showFilterByBrand"
    >
      <DataWithLoader
        data={data}
        loading={loading}
        count={fields.length}
        emptyText={emptyText || "Empty"}
        emptyIcon="leaf"
        size="small"
        objective={true}
      />
    </Box>
  );
}

export default DateFilters;
