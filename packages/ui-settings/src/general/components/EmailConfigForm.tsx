import { gql, useQuery } from "@apollo/client";

import ControlLabel from "@erxes/ui/src/components/form/Label";
import { FlexRow } from "../../styles";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import Info from "@erxes/ui/src/components/Info";
import React from "react";
import { RichTextEditor } from "@erxes/ui/src/components/richTextEditor/TEditor";
import { __ } from "coreui/utils";
import { queries } from "../graphql";
import styled from "styled-components";
import { IEmailConfig } from "../types";

type Props = {
  emailConfig: IEmailConfig;
  setEmailConfig: (emailConfig: any) => void;
  emailText: string;
  templateName?: string;
  isSaved?: boolean;
};

const ContentWrapper = styled.div`
  margin-top: 20px;
  > div {
    border: 0.0625rem solid #eee;
  }
`;

const EmailConfigForm = (props: Props) => {
  const { data } = useQuery(gql(queries.configsGetEmailTemplate), {
    variables: {
      name: props.templateName,
    },
  });

  const defaultTemplate = data ? data.configsGetEmailTemplate : {};

  const { emailText, emailConfig, setEmailConfig } = props;

  const email = emailConfig.email || "";
  const type = emailConfig.type || "simple";
  const template = emailConfig.template || defaultTemplate;

  const onChangeEmail = (e: any) => {
    setEmailConfig({
      type,
      template,
      email: e.target.value,
    });
  };

  const onChangeType = (e: any) => {
    setEmailConfig({
      email,
      template,
      type: e.target.value,
    });
  };

  const onEditorChange = (content: string) => {
    setEmailConfig({
      type,
      email,
      template: content,
    });
  };

  const renderTemplate = () => {
    if (type === "custom") {
      return (
        <ContentWrapper>
          <RichTextEditor
            content={template}
            onChange={onEditorChange}
            autoGrow={true}
            name="email_config"
            isSubmitted={props.isSaved}
          />
        </ContentWrapper>
      );
    }

    return (
      <ContentWrapper>
        <Info>
          {__("Your email will be sent with Erxes email template.")}
        </Info>
      </ContentWrapper>
    );
  };

  return (
    <>
      <FlexRow $alignItems="flex-start" $justifyContent="space-between">
        <FormGroup>
          <ControlLabel>Email</ControlLabel>
          <p>{__(emailText)}</p>

          <FormControl
            type="email"
            rows={5}
            value={email}
            onChange={onChangeEmail}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Type</ControlLabel>
          <p>{__("Choose \"custom\" to change the template of transactional emails.")}</p>

          <FormControl
            componentclass="select"
            value={type}
            onChange={onChangeType}
          >
            <option key="simple" value="simple">
              {__("Simple")}
            </option>
            <option key="custom" value="custom">
              {__("Custom")}
            </option>
          </FormControl>
        </FormGroup>
      </FlexRow>

      <FormGroup>
        <ControlLabel>Template</ControlLabel>

        {renderTemplate()}
      </FormGroup>
    </>
  );
};

export default EmailConfigForm;
