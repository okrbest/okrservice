import React from 'react';
import styled from 'styled-components';
import { colors, dimensions } from '@erxes/ui/src/styles';
import { __ } from '@erxes/ui/src/utils';

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

// 모바일용 사이드바 제목
const MobileSidebarTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${colors.colorCoreDarkGray};
  border-bottom: 2px solid ${colors.borderPrimary};
  padding-bottom: 8px;
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
};

const MobileLayoutComponent: React.FC<Props> = ({ 
  children, 
  sidebarContent, 
  isMobile = false 
}) => {
  // 디버깅을 위한 로그
  console.log('MobileLayoutComponent - isMobile:', isMobile);
  console.log('MobileLayoutComponent - sidebarContent:', !!sidebarContent);
  
  if (isMobile) {
    console.log('Rendering mobile layout');
    return (
      <MobileLayout>
        {children}
        {sidebarContent && (
          <>
            <MobileDivider />
            <MobileSidebarContainer>
              <MobileSidebarTitle>
                <i className="icon-settings" />
                {__('Additional Information')}
              </MobileSidebarTitle>
              {sidebarContent}
            </MobileSidebarContainer>
          </>
        )}
      </MobileLayout>
    );
  }

  console.log('Rendering desktop layout');
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
  MobileSidebarTitle,
  MobileFormGroup,
  MobileLabel,
  MobileDivider,
  MobileCard,
  MobileSectionTitle,
  MobileLayoutComponent
};
