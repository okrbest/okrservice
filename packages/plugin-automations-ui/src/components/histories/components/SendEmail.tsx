import React from 'react';
import EmailTemplate from '@erxes/ui-emailtemplates/src/components/EmailTemplate';
import { ControlLabel, FormGroup, Label, Tip } from '@erxes/ui/src';
import { __ } from 'coreui/utils';
import { LabelContainer } from '../styles';

type Props = {
  result: any;
  action: any;
  hideTemplate?: boolean;
  history?: any;
};

class SendEmail extends React.Component<Props> {
  constructor(props) {
    super(props);
  }

  renderTemplate(action, result) {
    const { actionConfig } = action;

    return (
      <FormGroup>
        <ControlLabel>{__('Email Template')}</ControlLabel>
        <EmailTemplate
          templateId={actionConfig?.templateId}
          template={{ content: result.customHtml }}
          onlyPreview
        />
      </FormGroup>
    );
  }

  renderEmails({ fromEmail, title, responses }) {
    const getLabelColor = response => {
      if (response?.messageId) {
        return 'success';
      }
      if (response?.error) {
        return 'danger';
      }
      return 'default';
    };

    const getLabelText = response => {
      if (response.error) {
        return typeof response?.error === 'object'
          ? JSON.stringify(response.error || {})
          : `${response?.error}`;
      }

      if (response.messageId) {
        return 'Sent';
      }

      return '';
    };

    // responses가 배열이 아닐 경우 처리
    const responsesArray = Array.isArray(responses) ? responses : [];

    return (
      <ul>
        <li>
          <strong>From: </strong>
          {`${fromEmail || ''}`}
        </li>
        <li>
          <strong>Subject: </strong>
          {`${title || ''}`}
        </li>
        <li>
          <LabelContainer>
            <strong>To: </strong>
            {responsesArray.map((response, i) => {
              const email = response?.toEmail || '';
              const customerInfo = response?.customerInfo;
              
              if (customerInfo) {
                const customerName = customerInfo.customerName || '';
                const companyName = customerInfo.companyName || '';
                
                const parts = [];
                if (customerName) {
                  parts.push(`이름: ${customerName}`);
                }
                if (companyName) {
                  parts.push(`회사: ${companyName}`);
                }
                parts.push(`이메일: ${email}`);
                
                const displayText = parts.join(' ');
                
                return (
                  <Tip key={i} text={getLabelText(response)}>
                    <Label lblStyle={getLabelColor(response)}>
                      {displayText}
                    </Label>
                  </Tip>
                );
              }
              
              return (
                <Tip key={i} text={getLabelText(response)}>
                  <Label lblStyle={getLabelColor(response)}>
                    {email}
                  </Label>
                </Tip>
              );
            })}
          </LabelContainer>
        </li>
      </ul>
    );
  }

  render() {
    const { action, result, hideTemplate, history } = this.props;
    
    // 디버깅: result 구조 확인
    console.log('SendEmail result:', result);
    console.log('SendEmail responses:', result?.responses);
    
    // companyIds 로그 출력
    const targetCompanyIds = history?.target?.companyIds || [];
    const targetCustomerIds = history?.target?.customerIds || [];
    console.log('📧 [SendEmail] History target companyIds:', targetCompanyIds);
    console.log('📧 [SendEmail] History target customerIds:', targetCustomerIds);
    console.log('📧 [SendEmail] History target:', history?.target);
    
    if (result?.responses) {
      result.responses.forEach((r, i) => {
        console.log(`Response ${i}:`, r);
        console.log(`Response ${i} customerInfo:`, r?.customerInfo);
        console.log(`Response ${i} customerInfo companyName:`, r?.customerInfo?.companyName);
      });
    }
    
    return (
      <div>
        {!hideTemplate && this.renderTemplate(action, result)}
        <div>{this.renderEmails(result)}</div>
      </div>
    );
  }
}

export default SendEmail;
