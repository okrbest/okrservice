import ActionButtons from "@erxes/ui/src/components/ActionButtons";
import Label from "@erxes/ui/src/components/Label";
import moment from "moment";
import React, { useState, useRef } from "react";
import { __ } from "coreui/utils";
import { colors, IDayPlan, IPlanValue } from "../types";
import { FormControl } from "@erxes/ui/src/components";
import { ITimeframe } from "../../settings/types";

type Props = {
  dayPlan: IDayPlan;
  isChecked: boolean;
  timeFrames: ITimeframe[];
  toggleBulk: (dayPlan: IDayPlan, isChecked?: boolean) => void;
  edit: (doc: IDayPlan) => void;
};

const DayPlanRow = (props: Props) => {
  const { timeFrames, dayPlan, toggleBulk, isChecked, edit } = props;
  const { _id, date, branch, department, product, uom, planCount, status } =
    dayPlan;

  const timerRef = useRef<number | null>(null);

  const [values, setValues] = useState<IPlanValue[]>(
    (dayPlan.values?.length && dayPlan.values) ||
      timeFrames.map((tf) => ({
        _id: Math.random().toString(),
        timeId: tf._id || "",
        count: 0,
      }))
  );

  const onClick = (e) => {
    e.stopPropagation();
  };

  const onChange = (e) => {
    if (toggleBulk) {
      toggleBulk(dayPlan, e.target.checked);
    }
  };

  const onChangeValue = (e) => {
    const count = e.target.value;
    const timeId = e.target.name;

    const newValues = [...values];
    const ind = newValues.findIndex((v) => v.timeId === timeId);

    newValues[ind].count = count;
    setValues(newValues);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      edit({ _id: dayPlan._id, values: newValues });
    }, 1000);
  };

  const sumValue = values.length
    ? values.reduce((sum, i) => Number(sum) + Number(i.count), 0)
    : 0;
  const diff = sumValue - (planCount || 0);
  const valueById = {};
  for (const val of values) {
    valueById[val.timeId] = val;
  }

  return (
    <tr key={_id} id={_id}>
      <td onClick={onClick}>
        <FormControl
          checked={isChecked}
          componentclass="checkbox"
          onChange={onChange}
        />
      </td>
      <td>{moment(date).format("YYYY/MM/DD")}</td>
      <td>{branch ? `${branch.code} - ${branch.title}` : ""}</td>
      <td>{department ? `${department.code} - ${department.title}` : ""}</td>
      <td>{product ? `${product.code} - ${product.name}` : ""}</td>
      <td>{uom || ""}</td>
      <td>{(planCount || 0).toLocaleString()}</td>
      {(timeFrames || []).map((tf) => (
        <td key={tf._id}>
          <FormControl
            type="number"
            name={tf._id}
            defaultValue={(valueById[tf._id || ""] || {}).count || 0}
            onChange={onChangeValue}
          />
        </td>
      ))}
      <td>{(sumValue || 0).toLocaleString()}</td>
      <td>{(diff || 0).toLocaleString()}</td>
      <td>
        <ActionButtons>
          <Label
            lblColor={colors[status || ""] || "#0078bf"}
            children={status}
          />
        </ActionButtons>
      </td>
      {(
        values.filter(
          (v) => !timeFrames.map((t) => t._id).includes(v.timeId)
        ) || []
      ).map((val) =>
        (valueById[val.timeId || ""] || {}).count ? (
          <td key={val._id}>
            <FormControl
              type="number"
              name={val.timeId}
              defaultValue={(valueById[val.timeId || ""] || {}).count}
              onChange={onChangeValue}
            />
          </td>
        ) : (
          ""
        )
      )}
    </tr>
  );
};

export default DayPlanRow;
