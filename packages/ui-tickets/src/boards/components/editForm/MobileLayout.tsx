import React from 'react';
import styled from 'styled-components';
import { colors, dimensions } from '@erxes/ui/src/styles';
import { __ } from '@erxes/ui/src/utils';
import StartDate from './StartDate';
import CloseDate from './CloseDate';

// 모바일용 레이아웃 컨테이너
const MobileLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

// 데스크톱용 레이아웃 컨테이너
const DesktopLayout = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  
  @media (max-width: 768px) {
    display: none;
  }
`;

// 모바일용 사이드바 컨테이너 (고객 댓글 아래에 배치)
const MobileSidebarContainer = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: ${colors.colorWhite};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  @media (min-width: 769px) {
    display: none;
  }
`;


// 모바일용 폼 그룹
const MobileFormGroup = styled.div`
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// 모바일용 라벨
const MobileLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: ${colors.colorCoreDarkGray};
  margin-bottom: 8px;
`;

// 모바일용 구분선
const MobileDivider = styled.hr`
  border: none;
  height: 1px;
  background: ${colors.borderPrimary};
  margin: 20px 0;
`;

// 모바일용 카드 스타일
const MobileCard = styled.div`
  background: ${colors.colorWhite};
  border: 1px solid ${colors.borderPrimary};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

// 모바일용 섹션 제목
const MobileSectionTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${colors.colorCoreDarkGray};
  display: flex;
  align-items: center;
  
  i {
    margin-right: 8px;
    color: ${colors.colorPrimary};
  }
`;

type Props = {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  isMobile?: boolean;
  item?: any;
  onCloseDateFieldsChange?: (key: string, value: any) => void;
};

const MobileLayoutComponent: React.FC<Props> = ({ 
  children, 
  sidebarContent, 
  isMobile = false,
  item,
  onCloseDateFieldsChange
}) => {
  if (isMobile) {
    return (
      <MobileLayout>
        {/* 시작일/마감일 섹션 - 스테이지 단계 바로 아래에 위치 */}
        {item && onCloseDateFieldsChange && (
          <>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px 0' }}>
              <StartDate
                onChangeField={onCloseDateFieldsChange}
                startDate={item.startDate}
                reminderMinute={item.reminderMinute}
              />
              <CloseDate
                onChangeField={onCloseDateFieldsChange}
                closeDate={item.closeDate}
                startDate={item.startDate}
                isCheckDate={item.pipeline?.isCheckDate}
                createdDate={item.createdAt}
                reminderMinute={item.reminderMinute}
                isComplete={item.isComplete}
                stage={item.stage}
              />
            </div>
            <MobileDivider />
          </>
        )}
        
        {children}
        
        {sidebarContent && (
          <>
            <MobileDivider />
            <MobileSidebarContainer>
              {sidebarContent}
            </MobileSidebarContainer>
          </>
        )}
      </MobileLayout>
    );
  }

  return (
    <DesktopLayout>
      {children}
    </DesktopLayout>
  );
};

export {
  MobileLayout,
  DesktopLayout,
  MobileSidebarContainer,
  MobileFormGroup,
  MobileLabel,
  MobileDivider,
  MobileCard,
  MobileSectionTitle,
  MobileLayoutComponent
};
