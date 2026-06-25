import { colors, dimensions } from '@erxes/ui/src/styles';

import { ActionButtons } from '@erxes/ui-settings/src/styles';
import styled from 'styled-components';
import { rgba } from '@erxes/ui/src/styles/ecolor';

const RowArticle = styled.div`
  background-color: ${colors.colorWhite};
  margin-bottom: ${dimensions.unitSpacing}px;
  padding: 20px 20px 20px 30px;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;

  i {
    color: ${colors.colorCoreGray};
  }

  &:hover {
    ${ActionButtons} {
      width: 40px;
    }
  }
`;

const ArticleTitle = styled.h5`
  font-weight: bold;
  font-size: 14px;
  margin: 0 0 ${dimensions.unitSpacing}px;

  span {
    margin-left: ${dimensions.unitSpacing}px;
  }

  &:hover {
    cursor: pointer;
  }
`;

const ArticleMeta = styled.div`
  font-size: 11px;
  color: ${colors.colorCoreGray};
  display: flex;
  align-items: center;

  img {
    width: ${dimensions.coreSpacing}px;
    height: ${dimensions.coreSpacing}px;
    line-height: ${dimensions.coreSpacing}px;
    border-radius: ${dimensions.coreSpacing / 2}px;
  }

  i,
  img {
    margin-right: ${dimensions.unitSpacing / 2}px;
  }
`;

const AuthorName = styled.span`
  font-weight: 500;
  color: ${colors.colorCoreDarkGray};
  margin: 0 ${dimensions.coreSpacing}px 0 5px;
`;

const ReactionCounts = styled.div`
  margin: 0 ${dimensions.coreSpacing}px;
  display: flex;

  > span {
    margin-right: ${dimensions.unitSpacing}px;
    font-weight: 500;
  }
`;

const ReactionCount = styled.span`
  display: flex;
  align-items: center;

  img {
    width: 16px;
    margin-right: ${dimensions.unitSpacing / 2}px;
    box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);
    height: 16px;
    padding: 1px;
  }
`;

const ReactionItem = styled(ReactionCount)`
  margin-left: -8px;

  img {
    margin-right: ${dimensions.unitSpacing}px;
    box-shadow: none;
    padding: 0;
  }
`;

const FillContent = styled.div`
  flex: 1;
  margin-right: 5px;
`;

const Forms = styled.div`
  margin-top: ${dimensions.unitSpacing}px;
`;

const FlexRow = styled.div`
  display: flex;
  flex: 1;
  align-items: center;

  > div {
    margin: 0 20px 10px 0;
    flex: 1;
  }
`;

const PageImage = styled.img`
  width: 100px; // Set appropriate width
  height: auto; // Maintain aspect ratio
  margin-right: 10px; // Space between images
`;

const DeleteButton = styled.button`
  background-color: red; // Change to your desired color
  color: white;
  border: none;
  cursor: pointer;
  margin-left: 10px;
`;

const FeedbackCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 140px;
  flex-shrink: 0;
`;

const FeedbackCounts = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${colors.colorCoreGray};

  span {
    display: flex;
    align-items: center;
    gap: 3px;
  }
`;

const FeedbackRatioBar = styled.div<{ ratio: number }>`
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.ratio}%;
    background: ${props =>
      props.ratio >= 70 ? '#16a34a' : props.ratio >= 50 ? '#d97706' : '#dc2626'};
    border-radius: 2px;
    transition: width 0.3s ease;
  }
`;

const FeedbackRatioText = styled.span<{ ratio: number }>`
  font-size: 12px;
  font-weight: 600;
  color: ${props =>
    props.ratio >= 70 ? '#16a34a' : props.ratio >= 50 ? '#d97706' : '#dc2626'};
`;

const ImproveBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 8px;
  vertical-align: middle;
`;

const NoFeedbackText = styled.span`
  font-size: 11px;
  color: #9ca3af;
`;

const StatsBar = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 10px;
`;

const StatCard = styled.div<{ accent?: string }>`
  flex: 1;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-left: 3px solid ${props => props.accent || '#6b7280'};
  border-radius: 8px;
  padding: 12px 16px;

  .stat-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }

  .stat-sub {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 2px;
  }
`;

const SortBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  color: #6b7280;
`;

const SortButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active ? '#eff6ff' : 'transparent'};
  border: 1px solid ${props => props.active ? '#bfdbfe' : '#e5e7eb'};
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: ${props => props.active ? '600' : '400'};
  color: ${props => props.active ? '#2563eb' : '#374151'};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #2563eb;
  }
`;

export {
  RowArticle,
  ArticleTitle,
  ArticleMeta,
  AuthorName,
  ReactionCounts,
  ReactionCount,
  ReactionItem,
  FillContent,
  FlexRow,
  Forms,
  PageImage,
  DeleteButton,
  FeedbackCell,
  FeedbackCounts,
  FeedbackRatioBar,
  FeedbackRatioText,
  ImproveBadge,
  NoFeedbackText,
  StatsBar,
  StatCard,
  SortBar,
  SortButton,
};
