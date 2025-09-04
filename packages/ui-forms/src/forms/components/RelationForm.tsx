import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IField } from "@erxes/ui/src/types";
import Info from "@erxes/ui/src/components/Info";
import React from "react";
import { __ } from "@erxes/ui/src/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils/core";

import SelectContactsRelation from "@erxes/ui-contacts/src/components/relation/SelectRelation";

type Props = {
  contentType?: string;
  fields: IField[];
  onChange: (ids: string[], relationType: string) => void;
  relationData?: any;
  selectedCompanyIds?: string[];
};

const RelationForm = (props: Props) => {
  const fields = props.fields;

  // 디버깅을 위한 콘솔 출력
  console.log("RelationForm - selectedCompanyIds:", props.selectedCompanyIds);

  return (
    <>
      {fields.map((field) => (
        <FormGroup key={field._id}>
          <ControlLabel>{`Select ${field.text}`}</ControlLabel>

          <SelectContactsRelation 
            field={field} 
            onChange={props.onChange}
            relationData={props.relationData}
            selectedCompanyIds={props.selectedCompanyIds}
          />

          {loadDynamicComponent(
            "selectRelation",
            {
              ...props,
              field,
            },
            true
          )}
        </FormGroup>
      ))}

      <Info>
        <a
          target="_blank"
          href={`/settings/properties?type=${props.contentType}`}
          rel="noopener noreferrer"
        >
          {__(
            "You can configure basic property and relations in properties settings"
          )}
        </a>
      </Info>
    </>
  );
};

export default RelationForm;
