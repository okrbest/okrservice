import * as routerUtils from "@erxes/ui/src/utils/router";

import React, { useState } from "react";
import { colors, dimensions } from "@erxes/ui/src/styles";
import { mutations, queries } from "../../graphql";
import { __ } from "coreui/utils";
import { Alert } from "@erxes/ui/src/utils";
import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { useLocation, useNavigate } from "react-router-dom";
import { ModalFooter } from "@erxes/ui/src/styles/main";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import SegmentsForm from "../../containers/form/SegmentsForm";
import client from "@erxes/ui/src/apolloClient";
import { gql } from "@apollo/client";
import styled from "styled-components";
import { Transition } from "@headlessui/react";
import queryString from "query-string";

export const RightMenuContainer = styled.div`
  position: fixed;
  z-index: 2;
  top: 120px;
  right: 0;
  bottom: 0;
  width: 300px;
  background: ${colors.bgLight};
  white-space: normal;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 12px 24px -6px rgba(9, 30, 66, 0.25),
    0 0 0 1px rgba(9, 30, 66, 0.08);
`;

export const RightDrawerContainer = styled(RightMenuContainer)`
  background: ${colors.colorWhite};
  width: 500px;
  padding: ${dimensions.coreSpacing}px;
  z-index: 10;
`;

export const ScrolledContent = styled.div`
  flex: 1;
  overflow: auto;

  input[type="text"] {
    width: 100%;
  }
`;

type Props = {
  contentType: string;
  refetchQueries?: any;
  btnSize?: string;
  afterSave?: (response: any) => void;
  serviceConfig?: any;
  hideSaveButton?: boolean;
};

function TemporarySegment({
  contentType,
  btnSize,
  afterSave,
  serviceConfig,
  hideSaveButton,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showDrawer, setShowDrawer] = useState(false);
  const [name, setName] = useState("");

  const toggleDrawer = () => {
    setShowDrawer(!showDrawer);
  };

  const save = ({ values, closeModal }: { values: any; closeModal?: any }) => {
    client
      .mutate({
        mutation: gql(mutations.segmentsAdd),
        variables: values,
        refetchQueries: [
          {
            query: gql(queries.segments),
            variables: { contentTypes: [contentType] },
          },
        ],
      })
      .then((response) => {
        Alert.success("Successfully added a segment");
        afterSave?.(response);
        toggleDrawer();
        closeModal();
      });
  };

  const renderSaveContent = (doc: any) => {
    const saveTrigger = (
      <Button btnStyle="success" icon="check-circle">
        {"Save"}
      </Button>
    );

    const modalContent = (props) => (
      <>
        <form>
          <FormGroup>
            <ControlLabel required={true}>Name</ControlLabel>
            <FormControl
              required={true}
              autoFocus={true}
              onChange={(e) =>
                setName((e.currentTarget as HTMLInputElement).value)
              }
            />
          </FormGroup>

          <ModalFooter>
            <Button
              id="segment-form"
              btnStyle="simple"
              type="button"
              onClick={props.closeModal}
              icon="times-circle"
            >
              Cancel
            </Button>

            <Button
              btnStyle="success"
              type="button"
              onClick={() => {
                save({
                  values: { ...doc, name },
                  closeModal: props.closeModal,
                });
              }}
              icon="check-circle"
            >
              Save
            </Button>
          </ModalFooter>
        </form>
      </>
    );

    return (
      <ModalTrigger
        title="Save segment"
        trigger={saveTrigger}
        content={modalContent}
      />
    );
  };

  const filterContent = (values: any) => {
    return (
      <>
        <Button
          id="segment-filter"
          onClick={() => {
            const data = {
              ...values,
              conditions: values.conditionSegments[0].conditions,
            };

            delete data.conditionSegments;

            routerUtils.setParams(navigate, location, {
              segmentData: JSON.stringify(data),
            });
          }}
          icon="filter"
        >
          {"Filter"}
        </Button>

        {!hideSaveButton && renderSaveContent(values)}
      </>
    );
  };

  const queryParams = queryString.parse(location.search);

  const content = (
    <>
      <Transition show={showDrawer} className="slide-in-right">
        <RightDrawerContainer>
          <ScrolledContent>
            <SegmentsForm
              contentType={contentType}
              closeModal={toggleDrawer}
              hideDetailForm={true}
              filterContent={filterContent}
              serviceConfig={serviceConfig}
              segmentData={
                queryParams?.segmentData
                  ? JSON.parse(queryParams.segmentData)
                  : undefined
              }
            />
          </ScrolledContent>
        </RightDrawerContainer>
      </Transition>
    </>
  );

  return (
    <>
      <Button
        btnStyle="primary"
        size={btnSize || "small"}
        icon={showDrawer ? "times-circle" : "plus-circle"}
        onClick={toggleDrawer}
      >
        {showDrawer ? __("Close Filter") : __("Add filter")}
      </Button>

      {showDrawer && content}
    </>
  );
}

export default TemporarySegment;
