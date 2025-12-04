import dayjs from 'dayjs';
import Assignees from '../Assignees';
import Details from '../Details';
import DueDateLabel from '../DueDateLabel';
import Labels from '../label/Labels';
import EditForm from '../../containers/editForm/EditForm';
import { ItemDate } from '../../styles/common';
import {
  LastUpdate,
  Left,
  PriceContainer,
  ColumnChild,
  LabelColumn,
  StageColumn
} from '../../styles/item';
import { ColumnLastChildTd } from '../../styles/stage';
import { IOptions } from '../../types';
import { __ } from 'coreui/utils';
import React from 'react';
import PriorityIndicator from '../editForm/PriorityIndicator';
import { IDeal } from '../../../deals/types';

type Props = {
  stageId?: string;
  onClick?: () => void;
  item: IDeal;
  isFormVisible?: boolean;
  options: IOptions;
  groupType?: string;
  beforePopupClose?: (afterPopupClose?: () => void) => void;
  customFields?: any[];
  mailSentDateFieldId?: string | null;
  lastContactDateFieldId?: string | null;
};

class ListItemRow extends React.PureComponent<Props> {
  renderDate(date) {
    if (!date) {
      return null;
    }

    return <ItemDate>{dayjs(date).format('lll')}</ItemDate>;
  }

  renderForm = () => {
    const { item, isFormVisible, stageId, options, beforePopupClose } = this.props;

    if (!isFormVisible) {
      return null;
    }

    return (
      <EditForm
        itemId={item._id}
        stageId={stageId || item.stageId}
        options={options}
        hideHeader={true}
        isPopupVisible={isFormVisible}
        beforePopupClose={beforePopupClose}
      />
    );
  };

  renderStage = () => {
    const { item, groupType } = this.props;
    const { labels, stage } = item;

    if (groupType === 'stage') {
      return (
        <LabelColumn>
          {this.checkNull(labels.length > 0, <Labels labels={labels} />)}
        </LabelColumn>
      );
    }

    return (
      <StageColumn>
        <span>{stage ? stage.name : '-'}</span>
      </StageColumn>
    );
  };

  renderPriority = () => {
    const { item, groupType } = this.props;
    const { priority, labels } = item;

    if (groupType === 'priority') {
      return (
        <LabelColumn>
          <Labels labels={labels} />
        </LabelColumn>
      );
    }

    return (
      <td>
        {priority ? (
          <PriorityIndicator isFullBackground={true} value={priority} />
        ) : (
          '-'
        )}
      </td>
    );
  };

  checkNull = (statement: boolean, Component: React.ReactNode) => {
    if (statement) {
      return Component;
    }

    return '-';
  };

  getDealCustomFieldValue = (item: IDeal, fieldName: string): string => {
    if (!item.customFieldsData || !Array.isArray(item.customFieldsData)) {
      return '-';
    }

    const fieldData = item.customFieldsData.find(
      (data: any) => data.field === fieldName
    );

    if (!fieldData || !fieldData.value) {
      return '-';
    }

    // 배열인 경우 쉼표로 구분하여 표시
    if (Array.isArray(fieldData.value)) {
      return fieldData.value.join(', ');
    }

    return String(fieldData.value);
  };

  getCustomerCustomFieldValue = (customers: any[], fieldId: string | null): string => {
    if (!fieldId || !customers || !Array.isArray(customers) || customers.length === 0) {
      console.log("ListItemRow: getCustomerCustomFieldValue - no fieldId or customers", { fieldId, customersLength: customers?.length });
      return '-';
    }

    const firstCustomer = customers[0];
    if (!firstCustomer || !firstCustomer.customFieldsData || !Array.isArray(firstCustomer.customFieldsData)) {
      console.log("ListItemRow: getCustomerCustomFieldValue - no customFieldsData", { 
        hasCustomer: !!firstCustomer, 
        hasCustomFieldsData: !!firstCustomer?.customFieldsData,
        customFieldsDataLength: firstCustomer?.customFieldsData?.length 
      });
      return '-';
    }

    console.log("ListItemRow: getCustomerCustomFieldValue - searching for fieldId:", fieldId, "in customFieldsData:", firstCustomer.customFieldsData);

    // Find field by field ID
    const fieldData = firstCustomer.customFieldsData.find(
      (data: any) => data.field === fieldId
    );

    console.log("ListItemRow: getCustomerCustomFieldValue - found fieldData:", fieldData);

    if (!fieldData || !fieldData.value) {
      console.log("ListItemRow: getCustomerCustomFieldValue - no fieldData or value");
      return '-';
    }

    // If value is a date string, format it
    if (typeof fieldData.value === 'string') {
      // Try to parse as ISO date string
      const dateMatch = fieldData.value.match(/^\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        try {
          const date = new Date(fieldData.value);
          if (!isNaN(date.getTime())) {
            return dayjs(date).format('YYYY-MM-DD');
          }
        } catch (e) {
          // Not a valid date, return as string
        }
      }
    }

    // 배열인 경우 쉼표로 구분하여 표시
    if (Array.isArray(fieldData.value)) {
      return fieldData.value.join(', ');
    }

    return String(fieldData.value);
  };

  render() {
    const { item, onClick, groupType, options, mailSentDateFieldId, lastContactDateFieldId } = this.props;

    const {
      customers,
      companies,
      closeDate,
      isComplete,
      labels,
      assignedUsers,
      products
    } = item;

    return (
      <>
        <tr onClick={onClick} key={item._id} style={{ cursor: 'pointer' }}>
          {options.type === 'deal' && (
            <td style={{ fontWeight: 'normal' }}>
              {(() => {
                console.log("ListItemRow: Rendering 메일발송일 with fieldId:", mailSentDateFieldId, "customers:", customers);
                return this.getCustomerCustomFieldValue(customers, mailSentDateFieldId || null);
              })()}
            </td>
          )}
          {options.type === 'deal' && (
            <td style={{ fontWeight: 'normal' }}>
              {(() => {
                console.log("ListItemRow: Rendering 직전소통일 with fieldId:", lastContactDateFieldId, "customers:", customers);
                return this.getCustomerCustomFieldValue(customers, lastContactDateFieldId || null);
              })()}
            </td>
          )}
          <td>
            {this.checkNull(
              customers.length > 0,
              (() => {
                // Remove duplicates by _id
                const uniqueCustomers = customers.filter((customer, index, self) =>
                  index === self.findIndex((c) => c._id === customer._id)
                );
                return <Details color="#F7CE53" items={uniqueCustomers || []} />;
              })()
            )}
          </td>
          <ColumnChild>
            {this.checkNull(
              companies.length > 0,
              (() => {
                // Remove duplicates by _id
                const uniqueCompanies = companies.filter((company, index, self) =>
                  index === self.findIndex((c) => c._id === company._id)
                );
                return <Details color="#EA475D" items={uniqueCompanies || []} />;
              })()
            )}
          </ColumnChild>
          {groupType !== 'assignee' && (
            <td>
              {this.checkNull(
                assignedUsers.length > 0,
                assignedUsers.map((user: any) => user.details?.operatorPhone || '-').join(', ')
              )}
            </td>
          )}
          {groupType !== 'assignee' && (
            <td>
              {this.checkNull(
                assignedUsers.length > 0,
                assignedUsers.map((user: any) => user.email || '-').join(', ')
              )}
            </td>
          )}
          {groupType !== 'assignee' && (
            <td>
              {this.checkNull(
                assignedUsers.length > 0,
                assignedUsers.map((user: any) => user.details?.fullName || user.email || user.username || '-').join(', ')
              )}
            </td>
          )}
          {groupType !== 'stage' && (
            <StageColumn>
              <span>{item.stage ? item.stage.name : '-'}</span>
            </StageColumn>
          )}
          {options.type === 'deal' && this.props.customFields && this.props.customFields.map((field, index) => {
            const fieldData = item.customFieldsData?.find(
              (data: any) => data.field === field._id
            );
            
            let value = '-';
            if (fieldData && fieldData.value) {
              if (Array.isArray(fieldData.value)) {
                value = fieldData.value.join(', ');
              } else {
                value = String(fieldData.value);
              }
            }
            
            const isLast = index === this.props.customFields.length - 1;
            
            return isLast ? (
              <ColumnLastChildTd key={field._id}>
                {value}
              </ColumnLastChildTd>
            ) : (
              <td key={field._id} style={{ fontWeight: 'normal' }}>
                {value}
              </td>
            );
          })}
        </tr>
        {this.renderForm()}
      </>
    );
  }
}

export default ListItemRow;
