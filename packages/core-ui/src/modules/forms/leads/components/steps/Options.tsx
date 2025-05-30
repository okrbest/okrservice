import React, { useCallback } from 'react';
import Select from 'react-select';

import { __ } from 'coreui/utils';
import { IFormData } from '@erxes/ui-forms/src/forms/types';
import SelectBrand from '@erxes/ui-inbox/src/settings/integrations/containers/SelectBrand';
import SelectChannels from '@erxes/ui-inbox/src/settings/integrations/containers/SelectChannels';
import SelectDepartments from '@erxes/ui-settings/src/departments/containers/SelectDepartments';
import { LANGUAGES } from '@erxes/ui-settings/src/general/constants';
import { Description } from '@erxes/ui-settings/src/styles';
import { IBrand } from '@erxes/ui/src/brands/types';

import { FlexItem } from '@erxes/ui/src/components/step/style';
import { LeftItem } from '@erxes/ui/src/components/step/styles';

import Toggle from '@erxes/ui/src/components/Toggle';
import { IField } from '@erxes/ui/src/types';
import { isEnabled, loadDynamicComponent } from '@erxes/ui/src/utils/core';
import FormGroup from '../../../../common/components/form/Group';
import ControlLabel from '../../../../common/components/form/Label';
import FormControl from '../../../../common/components/form/Control';

type Props = {
  onChange: (
    name:
      | 'brand'
      | 'language'
      | 'isRequireOnce'
      | 'channelIds'
      | 'theme'
      | 'saveAsCustomer'
      | 'clearCacheAfterSave'
      | 'visibility'
      | 'departmentIds',
    value: any
  ) => void;
  type: string;
  formData: IFormData;
  color: string;
  theme: string;
  title?: string;
  language?: string;
  isRequireOnce?: boolean;
  saveAsCustomer?: boolean;
  clearCacheAfterSave?: boolean;
  fields?: IField[];
  brand?: IBrand;
  channelIds?: string[];
  visibility?: string;
  departmentIds?: string[];
  integrationId?: string;
  isIntegrationSubmitted?: boolean;
  onFieldEdit?: () => void;
};

const OptionStep = (props: Props) => {
  const [renderPayments, setRenderPayments] = React.useState(false);
  const onChangeFunction = useCallback((key, val) => {
    props.onChange(key, val);
  }, []);

  const onSelectChange = useCallback((e, key) => {
    let value = '';

    if (e) {
      value = e.value;
    }

    props.onChange(key, value);
  }, []);

  const onChangeTitle = useCallback((e) => {
    onChangeFunction('title', (e.currentTarget as HTMLInputElement).value);
  }, []);

  const renderDepartments = () => {
    const { visibility, departmentIds } = props;

    if (visibility === 'public') {
      return;
    }

    const departmentOnChange = (values: string[]) => {
      onChangeFunction('departmentIds', values);
    };

    return (
      <FormGroup>
        <SelectDepartments
          defaultValue={departmentIds}
          isRequired={false}
          onChange={departmentOnChange}
        />
      </FormGroup>
    );
  };

  const {
    language,
    brand,
    isRequireOnce,
    saveAsCustomer,
    clearCacheAfterSave,
  } = props;

  const onChange = (e) => {
    onChangeFunction('brand', (e.currentTarget as HTMLInputElement).value);
  };

  const channelOnChange = (values: string[]) => {
    onChangeFunction('channelIds', values);
  };

  const onChangeLanguage = (e) => onSelectChange(e, 'language');

  const onSwitchHandler = (e) => {
    onChangeFunction(e.target.id, e.target.checked);
  };

  const onChangeVisibility = (e: React.FormEvent<HTMLElement>) => {
    const visibility = (e.currentTarget as HTMLInputElement).value;
    onChangeFunction('visibility', visibility);
  };

  React.useEffect(() => {
    const { fields } = props.formData;
    if (fields && fields.length > 0) {
      if (
        fields.findIndex(
          (f) => f.type === 'productCategory' && f.isRequired
        ) !== -1
      ) {
        setRenderPayments(true);
      } else {
        setRenderPayments(false);
      }
    }

    if (!isEnabled('payment')) {
      setRenderPayments(false);
    }
  }, [props.formData.fields]);

  const renderPaymentsComponent = () => {
    if (!isEnabled('payment')) {
      return null;
    }

    if (!renderPayments) {
      return null;
    }

    return (
      <>
        {loadDynamicComponent('paymentConfig', {
          contentType: 'inbox:integrations',
          contentTypeId: props.integrationId,
          isSubmitted: props.isIntegrationSubmitted,
          description: __(
            "Choose payment methods you'd like to enable on this form"
          ),
        })}
      </>
    );
  };

  return (
    <FlexItem>
      <LeftItem>
        <FormGroup>
          <ControlLabel required={true}>{__('Form Name')}</ControlLabel>
          <p>
            {__('Name this form to differentiate from the rest internally')}
          </p>

          <FormControl
            id={'popupName'}
            required={true}
            onChange={onChangeTitle}
            value={props.title}
            autoFocus={true}
          />
        </FormGroup>
        <FormGroup>
          <SelectBrand
            isRequired={true}
            onChange={onChange}
            defaultValue={brand ? brand._id : ' '}
          />
        </FormGroup>

        {isEnabled('inbox') && (
          <SelectChannels
            defaultValue={props.channelIds}
            isRequired={false}
            description='Choose a channel, if you wish to see every new form in your Team Inbox.'
            onChange={channelOnChange}
          />
        )}

        <FormGroup>
          <ControlLabel required={true}>{__('Visibility')}</ControlLabel>
          <FormControl
            name='visibility'
            componentclass='select'
            value={props.visibility}
            onChange={onChangeVisibility}
          >
            <option value='public'>{__('Public')}</option>
            <option value='private'>{__('Private')}</option>
          </FormControl>
        </FormGroup>

        {renderDepartments()}

        <FormGroup>
          <ControlLabel>{__('Language')}</ControlLabel>
          <Select
            id='language'
            value={LANGUAGES.find((o) => o.value === language)}
            options={LANGUAGES}
            onChange={onChangeLanguage}
            isClearable={false}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>{__('Limit to 1 response')}</ControlLabel>
          <Description>
            {__(
              'Turn on to receive a submission from the visitor only once. Once a submission is received, the form will not display again.'
            )}
          </Description>
          <div>
            <Toggle
              id='isRequireOnce'
              checked={isRequireOnce || false}
              onChange={onSwitchHandler}
              icons={{
                checked: <span>Yes</span>,
                unchecked: <span>No</span>,
              }}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel>{__('Save as customer')}</ControlLabel>
          <Description>{__('Forcibly turn lead to customer.')}</Description>
          <div>
            <Toggle
              id='saveAsCustomer'
              checked={saveAsCustomer || false}
              onChange={onSwitchHandler}
              icons={{
                checked: <span>Yes</span>,
                unchecked: <span>No</span>,
              }}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <ControlLabel>{__('Clear cache after submission')}</ControlLabel>
          <Description>
            {__('Prevents customer ID from being stored in browser cache')}
          </Description>
          <div>
            <Toggle
              id='clearCacheAfterSave'
              checked={clearCacheAfterSave || false}
              onChange={onSwitchHandler}
              icons={{
                checked: <span>Yes</span>,
                unchecked: <span>No</span>,
              }}
            />
          </div>
        </FormGroup>

        {renderPaymentsComponent()}
      </LeftItem>
    </FlexItem>
  );
};

export default OptionStep;
