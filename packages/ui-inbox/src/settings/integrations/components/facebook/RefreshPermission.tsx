import { __ } from 'coreui/utils';
import { getEnv } from '@erxes/ui/src/utils';

import Button from '@erxes/ui/src/components/Button';
import Info from '@erxes/ui/src/components/Info';
import { IntegrationMutationVariables } from '@erxes/ui-inbox/src/settings/integrations/types';
import { ModalFooter } from '@erxes/ui/src/styles/main';
import React from 'react';
import { RefreshPermission } from '../../styles';

type CommonTypes = {
  name: string;
  brandId: string;
  channelIds: string[];
  webhookData: any;
};

type Props = {
  integrationId: string;
  integrationKind: string;
  name: string;
  brandId: string;
  channelIds: string[];
  webhookData: any;
  onSubmit: (
    id: string,
    { name, brandId, channelIds }: IntegrationMutationVariables,
  ) => void;
  closeModal: () => void;
};

class RefreshPermissionForm extends React.PureComponent<Props, CommonTypes> {
  constructor(props: Props) {
    super(props);

    this.state = {
      name: props.name || '',
      brandId: props.brandId || '',
      channelIds: props.channelIds || [],
      webhookData: props.webhookData || {},
    };
  }

  popupWindow(url, title, win, w, h) {
    const y = win.top.outerHeight / 2 + win.top.screenY - h / 2;
    const x = win.top.outerWidth / 2 + win.top.screenX - w / 2;

    return win.open(
      url,
      title,
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`,
    );
  }

  renderFacebookContent = () => {
    const onClick = () => {
      const { REACT_APP_API_URL } = getEnv();
      const url = `${REACT_APP_API_URL}/pl:facebook/fblogin?kind=facebook`;

      this.popupWindow(url, 'Integration', window, 660, 750);
    };

    return (
      <>
        <Info>
          {__(
            'Page permissions can be dropped by Messenger platform if the admin of the page changes their account password or due to some other unexpected reason. In case of any trouble with message sending, or in using some other service, please refresh your permissions using the below button.',
          )}
          <RefreshPermission onClick={onClick}>
            Refresh permissions
          </RefreshPermission>
        </Info>
      </>
    );
  };

  renderInstagramContent = () => {
    const onClick = () => {
      const { REACT_APP_API_URL } = getEnv();
      const url = `${REACT_APP_API_URL}/pl:instagram/iglogin?kind=instagram`;

      this.popupWindow(url, 'Integration', window, 660, 750);
    };

    return (
      <>
        <Info>
          {__(
            'Instagram Page permissions can be dropped by Messenger platform if the admin of the page changes their account password or due to some other unexpected reason. In case of any trouble with message sending, or in using some other service, please refresh your permissions using the below button.',
          )}
          <RefreshPermission onClick={onClick}>
            Refresh permissions
          </RefreshPermission>
        </Info>
      </>
    );
  };

  render() {
    const { closeModal } = this.props;
    return (
      <>
        {this.props.integrationKind === 'instagram-messenger' ||
        this.props.integrationKind === 'instagram'
          ? this.renderInstagramContent()
          : this.renderFacebookContent()}

        <ModalFooter>
          <Button
            btnStyle="simple"
            type="button"
            onClick={closeModal}
            icon="times-circle"
          >
            Cancel
          </Button>
        </ModalFooter>
      </>
    );
  }
}

export default RefreshPermissionForm;
