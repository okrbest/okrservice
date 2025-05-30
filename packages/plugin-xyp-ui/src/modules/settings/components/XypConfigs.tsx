import { IConfigsMap } from '@erxes/ui-settings/src/general/types';
import CollapseContent from '@erxes/ui/src/components/CollapseContent';
import FormControl from '@erxes/ui/src/components/form/Control';
import FormGroup from '@erxes/ui/src/components/form/Group';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import { __ } from 'coreui/utils';
import React from 'react';
import SelectServices from '../containers/SelectServices';
import Icon from '@erxes/ui/src/components/Icon';

type Props = {
  onChangeConfig: (code: string, value: any) => void;
  configsMap: IConfigsMap;
};

const labels = {
  url: 'Url',
  token: 'Token',
};

const XypConfigs = (props: Props) => {
  const configs = props.configsMap.XYP_CONFIGS || {
    url: '',
    token: '',
    servicelist: [],
  };

  React.useEffect(() => {
    props.onChangeConfig('XYP_CONFIGS', props.configsMap.XYP_CONFIGS);
  }, [props.configsMap]);

  const onChange = e => {
    const { name, value } = e.target;

    props.onChangeConfig('XYP_CONFIGS', {
      ...configs,
      [name]: value,
    });
  };
  const onChangeService = value => {
    props.onChangeConfig('XYP_CONFIGS', {
      ...configs,
      servicelist: value,
    });
  };

  const renderItem = (
    key: string,
    description?: string,
    componentClass?: string,
    type?: string
  ) => {
    return (
      <FormGroup>
        <ControlLabel>{labels[key]}</ControlLabel>
        {description && <p>{__(description)}</p>}
        <FormControl
          id={key}
          name={key}
          componentclass={componentClass}
          defaultValue={configs[key]}
          onChange={onChange}
          type={type}
        />
      </FormGroup>
    );
  };

  return (
    <>
      <CollapseContent
        transparent={true}
        title={__('Xypdan')}
        beforeTitle={<Icon icon='favorite' />}
      >
        {renderItem('url')}
        {renderItem('token')}
        <FormGroup>
          <ControlLabel>Operation</ControlLabel>
          <SelectServices
            url={configs.url}
            token={configs.token}
            value={configs.servicelist}
            onChange={value => {
              const list = value.map(d => d.value);
              onChangeService(list);
            }}
          />
        </FormGroup>
      </CollapseContent>
    </>
  );
};

export default XypConfigs;
