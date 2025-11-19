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
import { useNavigate, useLocation } from "react-router-dom";
import * as routerUtils from "@erxes/ui/src/utils/router";
import Icon from "@erxes/ui/src/components/Icon";

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
      'inquiry': { bg: '#fff8e1', text: '#f57f17' },
      'usage': { bg: '#fff8e1', text: '#f57f17' },
      'improvement': { bg: '#c8e6c9', text: '#2e7d32' },
      'request': { bg: '#c8e6c9', text: '#2e7d32' }, 
      'error': { bg: '#ffcdd2', text: '#c62828' },
      'complaint': { bg: '#ffcdd2', text: '#c62828' },
      'config': { bg: '#b3e5fc', text: '#0277bd' },
      'additional_development': { bg: '#e1bee7', text: '#6a1b9a' }
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

  const getPriorityColor = (priority: string) => {
    // 우선순위: 레벨에 따라 색상 (Critical=빨강, High=주황, Medium=파랑, Low=회색)
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      'Critical': { bg: '#ffebee', text: '#c62828' },
      'High': { bg: '#fff3e0', text: '#e65100' },
      'Medium': { bg: '#e3f2fd', text: '#1976d2' },
      'Low': { bg: '#f5f5f5', text: '#616161' }
    };

    return colorMap[priority] || { bg: '#f5f5f5', text: '#616161' };
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return __('Critical');
      case 'High':
        return __('High');
      case 'Medium':
        return __('Medium');
      case 'Low':
        return __('Low');
      default:
        return priority;
    }
  };

  const getQualityImpactColor = (qualityImpact: string) => {
    // 중요도: 레벨에 따라 색상 (critical=빨강, major=주황, minor=파랑, visual=회색)
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      'critical': { bg: '#ffebee', text: '#c62828' },
      'major': { bg: '#fff3e0', text: '#e65100' },
      'minor': { bg: '#e3f2fd', text: '#1976d2' },
      'visual': { bg: '#f5f5f5', text: '#616161' }
    };

    return colorMap[qualityImpact] || { bg: '#f5f5f5', text: '#616161' };
  };

  const getQualityImpactLabel = (qualityImpact: string) => {
    switch (qualityImpact) {
      case 'critical':
        return '치명적';
      case 'major':
        return '중대';
      case 'minor':
        return '경미';
      case 'visual':
        return '시각적';
      default:
        return qualityImpact;
    }
  };

  const getFunctionCategoryColor = (functionCategory: string) => {
    // 기능분류: 보다 연한 파스텔 계열
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      hr: { bg: '#edf7ed', text: '#2e7d32' },
      organization: { bg: '#e8f4f2', text: '#0f766e' },
      attendance: { bg: '#fff7ed', text: '#b45309' },
      payroll: { bg: '#f4e8fd', text: '#6b21a8' },
      evaluation: { bg: '#eaf2ff', text: '#1d4ed8' },
      education: { bg: '#f3f4ff', text: '#4338ca' },
      recruitment: { bg: '#fde8f3', text: '#be185d' },
      benefits: { bg: '#f7ecfb', text: '#9333ea' },
      pcoff: { bg: '#e0f2fe', text: '#0369a1' },
      approval: { bg: '#eff4ff', text: '#1e3a8a' },
      system: { bg: '#fff4ed', text: '#c2410c' },
    };

    return colorMap[functionCategory] || { bg: '#f5f5f5', text: '#616161' };
  };

  const getFunctionCategoryLabel = (functionCategory: string) => {
    switch (functionCategory) {
      case 'hr':
        return '인사';
      case 'organization':
        return '조직';
      case 'attendance':
        return '근태';
      case 'payroll':
        return '급여';
      case 'evaluation':
        return '평가';
      case 'education':
        return '교육';
      case 'recruitment':
        return '채용';
      case 'benefits':
        return '복리후생';
      case 'pcoff':
        return 'PCOFF';
      case 'approval':
        return '전자결재';
      case 'system':
        return '시스템';
      default:
        return functionCategory;
    }
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
      qualityImpact,
      functionCategory,
    } = item;

    const requestTypeColors = requestType ? getRequestTypeColor(requestType) : { bg: '#f5f5f5', text: '#616161' };

    const priorityColors = item.priority ? getPriorityColor(item.priority) : null;
    const qualityImpactColors = qualityImpact ? getQualityImpactColor(qualityImpact) : null;
    const functionCategoryColors = functionCategory ? getFunctionCategoryColor(functionCategory) : null;

    return (
      <>
        <h5>{item.name}</h5>

        <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.priority && priorityColors && (
            <span style={{ 
              fontSize: '11px', 
              color: priorityColors.text, 
              backgroundColor: priorityColors.bg, 
              border: `1px solid ${priorityColors.text}20`,
              padding: '3px 8px 3px 6px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '0.3px'
            }}>
              <Icon icon="sort-amount-up" size={12} />
              {__(item.priority)}
            </span>
          )}

          {qualityImpact && qualityImpactColors && (
            <span style={{ 
              fontSize: '11px', 
              color: qualityImpactColors.text, 
              backgroundColor: qualityImpactColors.bg, 
              border: `1px solid ${qualityImpactColors.text}20`,
              padding: '3px 8px 3px 6px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '0.3px'
            }}>
              <Icon icon="exclamation-triangle" size={12} />
              {getQualityImpactLabel(qualityImpact)}
            </span>
          )}

          {functionCategory && functionCategoryColors && (
            <span style={{ 
              fontSize: '11px', 
              color: functionCategoryColors.text, 
              backgroundColor: functionCategoryColors.bg, 
              border: `1px solid ${functionCategoryColors.text}20`,
              padding: '3px 8px 3px 6px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '0.3px'
            }}>
              <Icon icon="grid-alt" size={12} />
              {getFunctionCategoryLabel(functionCategory)}
            </span>
          )}

          {requestType && (
            <span style={{ 
              fontSize: '11px', 
              color: requestTypeColors.text, 
              backgroundColor: requestTypeColors.bg, 
              border: `1px solid ${requestTypeColors.text}20`,
              padding: '3px 8px 3px 6px', 
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              letterSpacing: '0.3px'
            }}>
              <Icon icon="tag-alt" size={12} />
              {getRequestTypeLabel(requestType)}
            </span>
          )}
        </div>

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
