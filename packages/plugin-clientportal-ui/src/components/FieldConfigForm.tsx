import CollapseContent from '@erxes/ui/src/components/CollapseContent';
import FormGroup from '@erxes/ui/src/components/form/Group';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import { IField } from '@erxes/ui/src/types';
import { __ } from 'coreui/utils';
import React from 'react';
import Select from 'react-select';
import { FieldConfig } from '../containers/FieldConfigForm';
import { ClientPortalConfig } from '../types';

type Props = {
  field: IField;
  fieldConfig?: FieldConfig;
  clientPortals: ClientPortalConfig[];
  isSubmitted: boolean;
  onChange: (value: any) => void;
};

function FieldConfigForm(props: Props) {
  const { field, fieldConfig } = props;

  const [allowedClientPortalIds, setAllowedClientPortalIds] = React.useState(
    fieldConfig ? fieldConfig.allowedClientPortalIds : []
  );

  const [requiredOn, setrequiredOn] = React.useState(
    fieldConfig ? fieldConfig.requiredOn : []
  );

  const [allowedClientPortals, setAllowedClientPortals] = React.useState<
    ClientPortalConfig[]
  >(
    props.clientPortals.filter(cp => {
      return allowedClientPortalIds.includes(cp._id || '');
    })
  );

  React.useEffect(() => {
    if (props.isSubmitted) {
      props.onChange({
        fieldId: field._id,
        allowedClientPortalIds,
        requiredOn
      });
    }
  }, [props.isSubmitted]);

  const onChange = (value: any) => {
    setAllowedClientPortalIds(value.map(v => v.value));
    const filtered = props.clientPortals.filter(cp => {
      return value.map(v => v.value).includes(cp._id || '');
    });

    setAllowedClientPortals(filtered);
  };

  const options = array => {
    return array.map(clientPortal => {
      return {
        value: clientPortal._id,
        label: clientPortal.name
      };
    });
  };

  return (
    <>
      <CollapseContent title={__('Business portal config')} compact={true}>
        <FormGroup>
          <ControlLabel>{__('Allowed Business Portals')}</ControlLabel>
          <p>{__('Please select client portals that can use this field.')}</p>
          <Select
            options={options(props.clientPortals)}
            value={options(props.clientPortals).filter((o) => allowedClientPortalIds.includes(o.value))}
            onChange={onChange}
            isMulti={true}
          />
        </FormGroup>

        {allowedClientPortals.length > 0 && (
          <FormGroup>
            <ControlLabel>{__('Required')}</ControlLabel>
            <p>{__('Please select client portals that field is required')}</p>
            <Select
              options={options(allowedClientPortals)}
              value={options(allowedClientPortals).filter((o) => requiredOn.includes(o.value))}
              onChange={value => {
                setrequiredOn(value.map(v => v.value));
              }}
              isMulti={true}
            />
          </FormGroup>
        )}
      </CollapseContent>
    </>
  );
}

export default FieldConfigForm;
