import { Recipient, Recipients } from '@erxes/ui-engage/src/styles';
import { ContentBox, FlexRow } from '@erxes/ui-settings/src/styles';
import { IButtonMutateProps, IFormProps } from '@erxes/ui/src/types';
import Alert from '@erxes/ui/src/utils/Alert';
import { __ } from 'coreui/utils';

import { Verify } from '@erxes/ui-settings/src/general/components/styles';
import { IConfigsMap } from '@erxes/ui-settings/src/general/types';
import Button from '@erxes/ui/src/components/Button';
import CollapseContent from '@erxes/ui/src/components/CollapseContent';
import Icon from '@erxes/ui/src/components/Icon';
import Info from '@erxes/ui/src/components/Info';
import { FormControl } from '@erxes/ui/src/components/form';
import Form from '@erxes/ui/src/components/form/Form';
import FormGroup from '@erxes/ui/src/components/form/Group';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import { ModalFooter } from '@erxes/ui/src/styles/main';
import React from 'react';
import { IUserDoc } from '@erxes/ui/src/auth/types';

type Props = {
  configsMap: IConfigsMap;
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  verifyEmail: (email: string) => void;
  removeVerifiedEmail: (email: string) => void;
  sendTestEmail: (from: string, to: string, content: string) => void;
  verifiedEmails: string[];
  verifiedUsers: IUserDoc[];
};

type State = {
  secretAccessKey?: string;
  accessKeyId?: string;
  region?: string;
  emailToVerify?: string;
  testFrom?: string;
  testTo?: string;
  testContent?: string;
  configSet?: string;
  emailVerificationType?: string;

  telnyxApiKey?: string;
  telnyxPhone?: string;
  telnyxProfileId?: string;
};

type CommonFields =
  | 'emailToVerify'
  | 'testFrom'
  | 'testTo'
  | 'testContent'
  | 'telnyxApiKey'
  | 'telnyxPhone'
  | 'telnyxProfileId';

class EngageSettingsContent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { configsMap } = props;

    this.state = {
      secretAccessKey: configsMap.secretAccessKey || '',
      accessKeyId: configsMap.accessKeyId || '',
      region: configsMap.region || '',
      configSet: configsMap.configSet || '',
      emailVerificationType: configsMap.emailVerificationType || '',
      telnyxApiKey: configsMap.telnyxApiKey || '',
      telnyxPhone: configsMap.telnyxPhone || '',
      telnyxProfileId: configsMap.telnyxProfileId || '',
    };
  }

  generateDoc = (values) => {
    return { configsMap: values };
  };

  onChangeCommon = (name: CommonFields, e) => {
    this.setState({ [name]: e.currentTarget.value });
  };

  onVerifyEmail = () => {
    const { emailToVerify } = this.state;

    if (emailToVerify) {
      return this.props.verifyEmail(emailToVerify);
    }

    return Alert.error('Write your email to verify!');
  };

  onSendTestEmail = () => {
    const { testFrom, testTo, testContent } = this.state;

    this.props.sendTestEmail(testFrom || '', testTo || '', testContent || '');
  };

  onRemoveVerifiedEmail = (email: string) => {
    this.props.removeVerifiedEmail(email);
  };

  renderVerifiedEmails = () => {
    const { verifiedEmails } = this.props;

    if (verifiedEmails.length === 0) {
      return;
    }

    return (
      <>
        <h4>{__('Verified emails')}:</h4>

        <Recipients>
          {verifiedEmails.map((email, index) => (
            <Recipient key={index}>
              {email}
              <span onClick={this.onRemoveVerifiedEmail.bind(this, email)}>
                <Icon icon='times' />
              </span>
            </Recipient>
          ))}
        </Recipients>
      </>
    );
  };

  renderContent = (formProps: IFormProps) => {
    const { configsMap, renderButton } = this.props;
    const { values, isSubmitted } = formProps;

    return (
      <>
        <Info>
          <p>
            {__(
              'Amazon Simple Email Service enables you to send and receive email using a reliable and scalable email platform. Set up your custom amazon simple email service account'
            ) + '.'}
          </p>
          <a
            target='_blank'
            href='https://docs.erxes.io/conversations'
            rel='noopener noreferrer'
          >
            {__('Learn more about Amazon SES configuration')}
          </a>
        </Info>
        <FlexRow $alignItems='flex-start' $justifyContent='space-between'>
          <FormGroup>
            <ControlLabel>AWS SES Access key ID</ControlLabel>
            <FormControl
              {...formProps}
              max={140}
              name='accessKeyId'
              defaultValue={configsMap.accessKeyId}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>AWS SES Secret access key</ControlLabel>
            <FormControl
              {...formProps}
              max={140}
              name='secretAccessKey'
              defaultValue={configsMap.secretAccessKey}
            />
          </FormGroup>
        </FlexRow>
        <FlexRow $alignItems='flex-start' $justifyContent='space-between'>
          <FormGroup>
            <ControlLabel>AWS SES Region</ControlLabel>
            <FormControl
              {...formProps}
              max={140}
              name='region'
              defaultValue={configsMap.region}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>AWS SES Config set</ControlLabel>
            <FormControl
              {...formProps}
              max={140}
              name='configSet'
              defaultValue={configsMap.configSet}
            />
          </FormGroup>
        </FlexRow>

        <FormGroup>
          <ControlLabel>Unverified emails limit</ControlLabel>
          <FormControl
            {...formProps}
            max={140}
            name='unverifiedEmailsLimit'
            defaultValue={configsMap.unverifiedEmailsLimit || 100}
          />
        </FormGroup>
        <FlexRow $alignItems='flex-start' $justifyContent='space-between'>
          <FormGroup>
            <ControlLabel>Allowed email skip limit</ControlLabel>
            <p>
              The number of times that each customer can skip to open or click
              campaign emails. If this limit is exceeded, then the customer will
              automatically set to
              <strong> unsubscribed </strong>mode.
            </p>
            <FormControl
              {...formProps}
              name='allowedEmailSkipLimit'
              defaultValue={configsMap.allowedEmailSkipLimit || 10}
            />
          </FormGroup>
          <FormGroup>
            <ControlLabel>Customer limit per auto SMS campaign</ControlLabel>
            <p>
              The maximum number of customers that can receive auto SMS campaign
              per each runtime.
            </p>
            <FormControl
              {...formProps}
              name='smsLimit'
              defaultValue={configsMap.smsLimit || 0}
              min={50}
              max={100}
            />
          </FormGroup>
        </FlexRow>
        <ModalFooter>
          {renderButton({
            name: 'configsMap',
            values: this.generateDoc(values),
            isSubmitted,
            object: this.props.configsMap,
          })}
        </ModalFooter>
      </>
    );
  };

  render() {
    return (
      <ContentBox id={'EngageSettingsMenu'}>
        <CollapseContent
          beforeTitle={<Icon icon='settings' />}
          transparent={true}
          title={__('General settings')}
        >
          <Form renderContent={this.renderContent} />
        </CollapseContent>

        <CollapseContent
          beforeTitle={<Icon icon='shield-check' />}
          transparent={true}
          title={__('Verify the email addresses that you send email from')}
        >
          {this.renderVerifiedEmails()}

          <Verify>
            <ControlLabel required={true}>Email</ControlLabel>
            <FormControl
              type='email'
              onChange={this.onChangeCommon.bind(this, 'emailToVerify')}
            />

            <Button
              onClick={this.onVerifyEmail}
              btnStyle='success'
              icon='check-circle'
            >
              Verify
            </Button>
          </Verify>
        </CollapseContent>
        <CollapseContent
          beforeTitle={<Icon icon='envelope-upload' />}
          transparent={true}
          title={__('Send your first testing email')}
        >
          <FlexRow $alignItems='flex-start' $justifyContent='space-between'>
            <FormGroup>
              <ControlLabel>From</ControlLabel>
              <FormControl
                placeholder='from@email.com'
                componentclass='select'
                value={this.state.testFrom}
                options={[
                  { value: '', label: '' },
                  ...this.props.verifiedEmails.map((email) => ({
                    value: email,
                    label: email,
                  })),
                ]}
                onChange={(e: any) =>
                  this.setState({ testFrom: e.currentTarget.value })
                }
              />
            </FormGroup>

            <FormGroup>
              <ControlLabel>To</ControlLabel>
              <FormControl
                placeholder='to@email.com'
                componentclass='select'
                value={this.state.testTo}
                options={[
                  { value: '', label: '' },
                  ...this.props.verifiedUsers.map((user) => ({
                    value: user.email,
                    label: user.email,
                  })),
                ]}
                onChange={(e: any) =>
                  this.setState({ testTo: e.currentTarget.value })
                }
              />
            </FormGroup>
          </FlexRow>
          <FormGroup>
            <ControlLabel>Content</ControlLabel>
            <FormControl
              placeholder={__('Write your content') + '...'}
              componentclass='textarea'
              onChange={this.onChangeCommon.bind(this, 'testContent')}
            />
          </FormGroup>

          <ModalFooter>
            <Button
              btnStyle='success'
              icon='message'
              onClick={this.onSendTestEmail}
            >
              Send test email
            </Button>
          </ModalFooter>
        </CollapseContent>
      </ContentBox>
    );
  }
}

export default EngageSettingsContent;
