import {
  Button,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
} from '@erxes/ui/src/components';
import React, { useState } from 'react';

import { IFormProps } from '@erxes/ui/src/types';
import { ModalFooter } from '@erxes/ui/src/styles/main';
import { __ } from 'coreui/utils';

interface IProps {
  closeModal?: () => void;
  data: any;
  callData?: { customerPhone: string };
  setConfig?: any;
}

const renderInput = (
  name: string,
  label: string,
  defaultValue: string,
  formProps: any,
) => {
  return (
    <FormGroup>
      <ControlLabel>{label}</ControlLabel>
      <FormControl
        name={name}
        value={defaultValue}
        disabled={true}
        {...formProps}
      />
    </FormGroup>
  );
};

const CallIntegrationForm = (props: IProps) => {
  const { closeModal, data = {}, setConfig } = props;
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const integration = selectedIntegrationId
    ? data?.find((d) => d._id === selectedIntegrationId)
    : data?.[0];

  const saveCallConfig = () => {
    // tslint:disable-next-line:no-unused-expression
    integration &&
      localStorage.setItem(
        'config:call_integrations',
        JSON.stringify({
          inboxId: integration?.inboxId,
          phone: integration?.phone,
          wsServer: integration?.wsServer,
          token: integration?.token,
          operators: integration?.operators,
          isAvailable: true,
          queues: integration.queues || [],
        }),
      );
    // tslint:disable-next-line:no-unused-expression
    integration &&
      setConfig({
        inboxId: integration.inboxId,
        phone: integration.phone,
        wsServer: integration.wsServer,
        token: integration.token,
        operators: integration.operators,
        isAvailable: true,
        queues: integration.queues || [],
      });
    closeModal && closeModal();
  };

  const skipCallConnection = () => {
    // tslint:disable-next-line:no-unused-expression
    integration &&
      localStorage.setItem(
        'config:call_integrations',
        JSON.stringify({
          inboxId: integration?.inboxId,
          phone: integration?.phone,
          wsServer: integration?.wsServer,
          token: integration?.token,
          operators: integration?.operators,
          isAvailable: false,
          queues: integration.queues || [],
        }),
      );
    // tslint:disable-next-line:no-unused-expression
    integration &&
      setConfig({
        inboxId: integration.inboxId,
        phone: integration.phone,
        wsServer: integration.wsServer,
        token: integration.token,
        operators: integration.operators,
        isAvailable: false,
        queues: integration.queues || [],
      });
    closeModal && closeModal();
  };

  const onChange = (e) => {
    setSelectedIntegrationId(e.target.value);
  };

  const renderContent = (formProps: IFormProps) => {
    return (
      <>
        <FormGroup>
          <FormControl
            {...formProps}
            name="phone"
            componentclass="select"
            placeholder={__('Select phone')}
            defaultValue={integration?.phone}
            onChange={onChange}
            required={true}
          >
            {data?.map((int) => (
              <option key={int._id} value={int._id}>
                {int.phone}
              </option>
            ))}
          </FormControl>
        </FormGroup>
        {renderInput(
          'wsServer',
          'Web socket server',
          integration?.wsServer,
          formProps,
        )}
        {renderInput('queues', 'Queues', integration?.queues, formProps)}

        {integration?.operators.map((operator: any, index: number) => {
          return (
            <div key={index}>
              <ControlLabel>Operator {index + 1}</ControlLabel>
              {renderInput('userId', 'user id', operator.userId, formProps)}
              {renderInput(
                'gsUsername',
                'grandstream username',
                operator.gsUsername,
                formProps,
              )}
              {renderInput(
                'gsPassword',
                'grandstream password',
                operator.gsPassword,
                formProps,
              )}
            </div>
          );
        })}

        <ModalFooter>
          <Button
            btnStyle="simple"
            type="button"
            onClick={closeModal}
            icon="times-circle"
          >
            Cancel
          </Button>

          <Button
            btnStyle="primary"
            type="button"
            onClick={skipCallConnection}
            icon="times-circle"
          >
            Skip connection
          </Button>
          <Button
            type="submit"
            btnStyle="success"
            icon="check-circle"
            onClick={saveCallConfig}
          >
            {__('Save')}
          </Button>
        </ModalFooter>
      </>
    );
  };

  return <Form renderContent={renderContent} />;
};

export default CallIntegrationForm;
