import { gql, useQuery } from "@apollo/client";
import { queries as formQueries } from "@erxes/ui-forms/src/forms/graphql";
import { ControlLabel, FormGroup, Spinner } from "@erxes/ui/src/components";
import { __ } from "coreui/utils";
import React from "react";
import Select from "react-select";

function SegmentFields({
  assignmentCampaign,
  segmentIds,
  onChange
}: {
  assignmentCampaign: any;
  segmentIds: string[];
  onChange: (value, name) => void;
}) {
  if (!segmentIds?.length) {
    return null;
  }

  const { data, loading } = useQuery(
    gql(formQueries.fieldsCombinedByContentType),
    {
      variables: {
        contentType: "core:customer",
        segmentId: segmentIds[0]
      }
    }
  );

  if (loading) {
    return <Spinner objective />;
  }

  const { fieldsCombinedByContentType } = data;

  const options = fieldsCombinedByContentType
    .filter(field => field?.type === "input" && field?.validation === "number")
    .map(field => {
      let value = field._id;

      if (field.name.includes("customFieldsData")) {
        value = field.name.replace("customFieldsData.", "");
      }

      return { value, label: field.label };
    });

  return (
    <FormGroup>
      <ControlLabel>{__("Counter Field of Segment (Optional)")}</ControlLabel>
      <Select
        options={options}
        value={options.find(o => o.value === assignmentCampaign.fieldId)}
        name="fieldId"
        // loadingPlaceholder={__('Loading...')}
        isClearable={true}
        onChange={({ value }) => onChange(value, "fieldId")}
      />
    </FormGroup>
  );
}

export default SegmentFields;
