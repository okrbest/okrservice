import * as routerUtils from "@erxes/ui/src/utils/router";

import { BarItems, HeaderContent } from "@erxes/ui/src/layout/styles";
import React, { useState } from "react";

import { CustomRangeContainer } from "@erxes/ui-forms/src/forms/styles";
import DataWithLoader from "@erxes/ui/src/components/DataWithLoader";
import DateControl from "@erxes/ui/src/components/form/DateControl";
import EmptyContent from "@erxes/ui/src/components/empty/EmptyContent";
import FormControl from "@erxes/ui/src/components/form/Control";
import { IKhanbankStatement } from "../types";
import Pagination from "@erxes/ui/src/components/pagination/Pagination";
import Row from "./Row";
import Table from "@erxes/ui/src/components/table";
import { __ } from "coreui/utils";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
  statement: IKhanbankStatement;
  queryParams: any;
  loading: boolean;
  showLatest?: boolean;
  // onChangeDate: (date: string, type: 'startDate' | 'endDate') => void;
  refetch?: () => void;
};

const List = (props: Props) => {
  const { queryParams, loading, statement } = props;
  const location = useLocation();
  const navigate = useNavigate();

  const [type, setType] = useState(queryParams.type || "all");
  const [transactions, setTransactions] = useState(
    (statement && statement.transactions) || []
  );

  const totalCount =
    (statement && statement.total && statement.total.count) || 0;

  React.useEffect(() => {
    switch (type) {
      case "income":
        const incomes =
          (statement && statement.transactions.filter((t) => t.amount > 0)) ||
          [];

        setTransactions(incomes);
        break;
      case "outcome":
        const outcomes =
          (statement && statement.transactions.filter((t) => t.amount < 0)) ||
          [];

        setTransactions(outcomes);
        break;
      default:
        setTransactions((statement && statement.transactions) || []);
        break;
    }
  }, [type]);

  const headingText =
    totalCount > 0
      ? `${statement.endBalance.toLocaleString()} ${statement.currency}`
      : __("No transactions");

  const renderRow = () => {
    return transactions.map((transaction) => (
      <Row key={transaction.record} transaction={transaction} />
    ));
  };

  queryParams.loadingMainQuery = loading;

  const content = (
    <Table $whiteSpace="nowrap" $hover={true}>
      <thead>
        <tr>
          <th>{__("Date")}</th>
          <th>{__("Description")}</th>
          <th>{__("Begin balance")}</th>
          <th>{__("End balance")}</th>
          <th>{__("Amount")}</th>
          <th>{__("Related account")}</th>
        </tr>
      </thead>
      <tbody>{renderRow()}</tbody>
    </Table>
  );

  const rightActionBar = (
    <>
      <BarItems>
        <CustomRangeContainer>
          <FormControl
            id="type"
            name="type"
            componentclass="select"
            required={true}
            defaultValue={type}
            onChange={(e: any) => {
              setType(e.currentTarget.value);
              routerUtils.setParams(navigate, location, {
                type: e.currentTarget.value,
              });
            }}
          >
            {["all", "income", "outcome"].map((t) => (
              <option key={t} value={t}>
                {__(t)}
              </option>
            ))}
          </FormControl>

          <DateControl
            value={queryParams.startDate}
            required={false}
            name="startDate"
            onChange={(date: any) => {
              routerUtils.setParams(navigate, location, {
                startDate: dayjs(date).format("YYYY-MM-DD"),
              });
            }}
            placeholder={__("Start date")}
            dateFormat={"YYYY-MM-DD"}
          />

          <DateControl
            value={queryParams.endDate}
            required={false}
            name="endDate"
            placeholder={__("End date")}
            onChange={(date: any) => {
              routerUtils.setParams(navigate, location, {
                endDate: dayjs(date).format("YYYY-MM-DD"),
              });
            }}
            dateFormat={"YYYY-MM-DD"}
          />
        </CustomRangeContainer>
      </BarItems>
    </>
  );

  return (
    <>
      {!props.showLatest && (
        <HeaderContent>
          <h3>{headingText}</h3>

          {rightActionBar}
        </HeaderContent>
      )}

      <DataWithLoader
        data={content}
        loading={loading}
        count={totalCount}
        emptyContent={
          <EmptyContent
            content={{
              title: __("No data found"),
              description: __("No transactions found for this period"),
              steps: [],
            }}
            maxItemWidth="360px"
          />
        }
      />

      {!props.showLatest && <Pagination count={totalCount} />}
    </>
  );
};

export default List;
