import FormControl from "@erxes/ui/src/components/form/Control";
import { IObjectListConfig } from "@erxes/ui/src/types";
import React from "react";
import { __ } from "coreui/utils";

type Props = {
  objectListConfigs: IObjectListConfig[];
  object: any;
  index: number;
  onEdit: (index: number) => void;
  onChange: (index: number, key: string, value: any) => void;
};

export default function ObjectListItem(props: Props) {
  const { object, objectListConfigs, index, onEdit } = props;

  const entries = Object.entries(object);
  const onFocus = (_event) => {
    onEdit(index);
  };

  const onChange = (e) => {
    props.onChange(index, e.target.id, e.target.value);
  };

  return (
    <>
      {entries.map((e) => {
        const key = e[0];
        const value: any = e[1] || "";

        if (!objectListConfigs) {
          return null;
        }

        const config = objectListConfigs.find((c) => c.key === key);

        if (!config) {
          return null;
        }

        return (
          <>
            <p>{config.label}</p>
            <FormControl
              id={key}
              componentclass={`${config.type}`}
              value={value}
              placeholder={`${config.label}`}
              onChange={onChange}
              onFocus={onFocus}
            />
          </>
        );
      })}
    </>
  );
}
