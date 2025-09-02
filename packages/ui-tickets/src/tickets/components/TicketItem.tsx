import { colors } from "@erxes/ui/src/styles";
import React from "react";
import { __ } from "coreui/utils";
import Assignees from "../../boards/components/Assignees";
import Details from "../../boards/components/Details";
import DueDateLabel from "../../boards/components/DueDateLabel";
import Labels from "../../boards/components/label/Labels";
import ItemFooter from "../../boards/components/portable/ItemFooter";
import EditForm from "../../boards/containers/editForm/EditForm";
import { ItemContainer } from "../../boards/styles/common";
import { PriceContainer, Right } from "../../boards/styles/item";
import { Content } from "../../boards/styles/stage";
import { IOptions } from "../../boards/types";
import { renderPriority } from "../../boards/utils";
import { ITicket } from "../types";
import ItemArchivedStatus from "../../boards/components/portable/ItemArchivedStatus";

type Props = {
  stageId?: string;
  item: ITicket;
  onClick?: () => void;
  isFormVisible?: boolean;
  beforePopupClose?: () => void;
  options?: IOptions;
  portable?: boolean;
  onAdd?: (stageId: string, item: ITicket) => void;
  onRemove?: (dealId: string, stageId: string) => void;
  onUpdate?: (item: ITicket) => void;
};

class TicketItem extends React.PureComponent<Props> {
  getRequestTypeColor = (requestType: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      'inquiry': { bg: '#fff3e0', text: '#f57c00' },
      'usage': { bg: '#fff3e0', text: '#f57c00' },
      'improvement': { bg: '#e8f5e8', text: '#388e3c' },
      'request': { bg: '#e8f5e8', text: '#388e3c' }, 
      'error': { bg: '#ffebee', text: '#d32f2f' },
      'complaint': { bg: '#ffebee', text: '#d32f2f' },
      'config': { bg: '#e3f2fd', text: '#1976d2' }
    };

    return colorMap[requestType] || { bg: '#f5f5f5', text: '#616161' };
  };

  renderForm = () => {
    const { item, isFormVisible, stageId } = this.props;

    if (!isFormVisible) {
      return null;
    }

    return (
      <EditForm
        {...this.props}
        stageId={stageId || item.stageId}
        itemId={item._id}
        hideHeader={true}
        isPopupVisible={isFormVisible}
      />
    );
  };

  renderContent() {
    const { item } = this.props;
    const {
      customers,
      companies,
      closeDate,
      startDate,
      isComplete,
      customProperties,
      tags,
      requestType,
    } = item;

    const requestTypeColors = requestType ? this.getRequestTypeColor(requestType) : { bg: '#f5f5f5', text: '#616161' };

    return (
      <>
        <h5>
          {renderPriority(item.priority)}
          {item.name}
        </h5>

        {requestType && (
          <div style={{ marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '12px', 
              color: requestTypeColors.text, 
              backgroundColor: requestTypeColors.bg, 
              padding: '2px 8px', 
              borderRadius: '12px',
              display: 'inline-block',
              fontWeight: '500'
            }}>
              {__(requestType)}
            </span>
          </div>
        )}

        <Details color="#F7CE53" items={customers || []} />
        <Details color="#EA475D" items={companies || []} />
        <Details color="#FF6600" items={tags || []} />
        <Details
          color={colors.colorCoreOrange}
          items={customProperties || []}
        />

        <PriceContainer>
          <Right>
            <Assignees users={item.assignedUsers} />
          </Right>
        </PriceContainer>

        <DueDateLabel
          startDate={startDate}
          closeDate={closeDate}
          isComplete={isComplete}
        />

        <ItemFooter item={item} />
      </>
    );
  }

  render() {
    const { item, portable, onClick } = this.props;

    if (portable) {
      return (
        <>
          <ItemContainer onClick={onClick}>
            <ItemArchivedStatus
              status={item.status || "active"}
              skipContainer={false}
            />
            <Content>{this.renderContent()}</Content>
          </ItemContainer>
          {this.renderForm()}
        </>
      );
    }

    return (
      <>
        <Labels labels={item.labels} indicator={true} />
        <Content onClick={onClick}>{this.renderContent()}</Content>
        {this.renderForm()}
      </>
    );
  }
}

export default TicketItem;
