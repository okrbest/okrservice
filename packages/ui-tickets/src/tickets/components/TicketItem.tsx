import { colors } from "@erxes/ui/src/styles";
import React from "react";
import { __ } from "@erxes/ui/src/utils";
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
import { useNavigate, useLocation } from "react-router-dom";
import * as routerUtils from "@erxes/ui/src/utils/router";

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

const TicketItem: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { item, isFormVisible, stageId, portable, onClick } = props;
  
  const getRequestTypeColor = (requestType: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      'inquiry': { bg: '#fff3e0', text: '#f57c00' },
      'usage': { bg: '#fff3e0', text: '#f57c00' },
      'improvement': { bg: '#e8f5e8', text: '#388e3c' },
      'request': { bg: '#e8f5e8', text: '#388e3c' }, 
      'error': { bg: '#ffebee', text: '#d32f2f' },
      'complaint': { bg: '#ffebee', text: '#d32f2f' },
      'config': { bg: '#e3f2fd', text: '#1976d2' },
      'additional_development': { bg: '#f3e5f5', text: '#7b1fa2' }
    };

    return colorMap[requestType] || { bg: '#f5f5f5', text: '#616161' };
  };

  const getRequestTypeLabel = (requestType: string) => {
    const labelMap: { [key: string]: string } = {
      'inquiry': '단순문의',
      'improvement': '개선요청',
      'error': '오류처리',
      'config': '설정변경',
      'additional_development': '추가개발'
    };

    return labelMap[requestType] || requestType;
  };

  const handleClick = () => {
    // portable 모드일 때 티켓 페이지로 이동
    if (portable && item.pipeline && item.pipeline.boardId) {
      const boardId = item.pipeline.boardId;
      const pipelineId = item.pipeline._id;
      routerUtils.setParams(navigate, location, {
        id: boardId,
        pipelineId: pipelineId,
        itemId: item._id
      });
    } else if (onClick) {
      // 기존 onClick 동작
      onClick();
    }
  };

  const renderForm = () => {
    if (!isFormVisible) {
      return null;
    }

    return (
      <EditForm
        options={props.options}
        stageId={stageId || item.stageId}
        itemId={item._id}
        hideHeader={true}
        isPopupVisible={isFormVisible}
        beforePopupClose={props.beforePopupClose}
        onAdd={props.onAdd}
        onRemove={props.onRemove}
        onUpdate={props.onUpdate}
      />
    );
  };

  const renderContent = () => {
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

    const requestTypeColors = requestType ? getRequestTypeColor(requestType) : { bg: '#f5f5f5', text: '#616161' };

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
              {getRequestTypeLabel(requestType)}
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
  };

  if (portable) {
    return (
      <>
        <ItemContainer onClick={handleClick}>
          <ItemArchivedStatus
            status={item.status || "active"}
            skipContainer={false}
          />
          <Content>{renderContent()}</Content>
        </ItemContainer>
        {renderForm()}
      </>
    );
  }

  return (
    <>
      <Labels labels={item.labels} indicator={true} />
      <Content onClick={onClick}>{renderContent()}</Content>
      {renderForm()}
    </>
  );
};

export default TicketItem;
