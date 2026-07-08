import React from 'react';
import styled from 'styled-components';
import Button from '@erxes/ui/src/components/Button';
import ArchiveLeftPanel, { ArchiveFilters } from './ArchiveLeftPanel';
import ArchiveGroupList from './ArchiveGroupList';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  display: flex;
  align-items: stretch;
`;

const ModalContainer = styled.div`
  background: #fff;
  width: 100%;
  max-width: 1100px;
  margin: 24px auto;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopBar = styled.div`
  background: #fff;
  border-bottom: 1px solid #dee2e6;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 220px;
  outline: none;
  &:focus {
    border-color: #4361ee;
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #868e96;
  font-size: 14px;
`;

const SkeletonList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string }>`
  background: linear-gradient(90deg, #e9ecef 25%, #dee2e6 50%, #e9ecef 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: 4px;
  width: ${(p) => p.$width || '100%'};
  height: ${(p) => p.$height || '16px'};
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

const SkeletonGroup = styled.div`
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SelectedCount = styled.span`
  font-weight: 700;
  color: #495057;
`;

type Group = { key: string; label: string; count: number };

type Props = {
  groups: Group[];
  groupBy: string;
  filters: ArchiveFilters;
  selectedIds: string[];
  onGroupByChange: (v: string) => void;
  onFiltersChange: (f: ArchiveFilters) => void;
  onSearchChange: (v: string) => void;
  onToggleSelect: (id: string) => void;
  onGroupSelectAll: (ids: string[]) => void;
  onBulkUnarchive: () => void;
  onBulkDelete: () => void;
  onClose: () => void;
  fetchGroupItems: (groupKey: string, page: number) => Promise<any[]>;
  loading?: boolean;
  refetching?: boolean;
  cacheKey?: string | number;
};

export default function ArchiveModal({
  groups,
  groupBy,
  filters,
  selectedIds,
  onGroupByChange,
  onFiltersChange,
  onSearchChange,
  onToggleSelect,
  onGroupSelectAll,
  onBulkUnarchive,
  onBulkDelete,
  onClose,
  fetchGroupItems,
  loading,
  refetching,
  cacheKey,
}: Props) {
  const renderBody = () => {
    if (loading) {
      return (
        <SkeletonList>
          {[80, 60, 90, 50, 70].map((w, i) => (
            <SkeletonGroup key={i}>
              <SkeletonBlock $width='16px' $height='16px' />
              <SkeletonBlock $width={`${w}%`} $height='14px' />
              <SkeletonBlock $width='40px' $height='14px' />
            </SkeletonGroup>
          ))}
        </SkeletonList>
      );
    }
    if (groups.length === 0) {
      return <EmptyState>아카이브된 티켓이 없습니다.</EmptyState>;
    }
    return (
      <ArchiveGroupList
        groups={groups}
        fetchGroupItems={fetchGroupItems}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onGroupSelectAll={onGroupSelectAll}
        cacheKey={cacheKey}
      />
    );
  };

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <TopBar>
          <SearchInput
            type="text"
            placeholder="제목, 내용, 고객명, 회사명으로 검색"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {refetching && (
            <span style={{ fontSize: 11, color: '#868e96' }}>갱신 중...</span>
          )}
          {selectedIds.length > 0 && (
            <>
              <SelectedCount>{selectedIds.length}개 선택됨</SelectedCount>
              <Button
                btnStyle="success"
                size="small"
                icon="redo"
                onClick={onBulkUnarchive}
              >
                아카이브 해제
              </Button>
              <Button
                btnStyle="danger"
                size="small"
                icon="trash"
                onClick={onBulkDelete}
              >
                삭제
              </Button>
            </>
          )}
          <Spacer />
          <Button btnStyle="simple" size="small" onClick={onClose}>
            ✕ 닫기
          </Button>
        </TopBar>
        <Body>
          <ArchiveLeftPanel
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          {renderBody()}
        </Body>
      </ModalContainer>
    </Overlay>
  );
}
