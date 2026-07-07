import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid #dee2e6;
  padding: 16px 12px;
  background: #f8f9fa;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #868e96;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  margin-top: 12px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #dee2e6;
  margin: 8px 0;
`;

interface GroupItemProps {
  active?: boolean;
}

const GroupItem = styled.div<GroupItemProps>`
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: ${(p) => (p.active ? '#4361ee' : 'transparent')};
  color: ${(p) => (p.active ? '#fff' : '#495057')};
  &:hover {
    background: ${(p) => (p.active ? '#3451d1' : '#e9ecef')};
  }
`;

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: #495057;
  margin-top: 8px;
  display: block;
`;

const DateInput = styled.input`
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;
`;

const MultiSelect = styled.select`
  width: 100%;
  padding: 4px 6px;
  font-size: 11px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;
  min-height: 60px;
`;

const GROUP_OPTIONS = [
  { value: 'month', label: '📅 월별' },
  { value: 'assignee', label: '👤 담당자별' },
  { value: 'requestType', label: '🏷 고객요청구분' },
  { value: 'functionCategory', label: '📂 기능분류' },
  { value: 'company', label: '🏢 회사별' },
];

export type ArchiveFilters = {
  search: string;
  assignedUserIds: string[];
  startDate: string;
  endDate: string;
};

type Props = {
  groupBy: string;
  onGroupByChange: (v: string) => void;
  filters: ArchiveFilters;
  onFiltersChange: (f: ArchiveFilters) => void;
};

export default function ArchiveLeftPanel({
  groupBy,
  onGroupByChange,
  filters,
  onFiltersChange,
}: Props) {
  const set = <K extends keyof ArchiveFilters>(key: K, value: ArchiveFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <Panel>
      <SectionLabel>그룹 기준</SectionLabel>
      {GROUP_OPTIONS.map((opt) => (
        <GroupItem
          key={opt.value}
          active={groupBy === opt.value}
          onClick={() => onGroupByChange(opt.value)}
        >
          {opt.label}
        </GroupItem>
      ))}

      <Divider />

      <SectionLabel>필터</SectionLabel>

      <FilterLabel>시작일</FilterLabel>
      <DateInput
        type="date"
        value={filters.startDate}
        onChange={(e) => set('startDate', e.target.value)}
      />

      <FilterLabel>종료일</FilterLabel>
      <DateInput
        type="date"
        value={filters.endDate}
        onChange={(e) => set('endDate', e.target.value)}
      />

      <FilterLabel>담당자</FilterLabel>
      <input
        type="text"
        placeholder="담당자 ID (쉼표 구분)"
        onChange={(e) => {
          const ids = e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          set('assignedUserIds', ids);
        }}
        style={{
          width: '100%',
          padding: '3px 6px',
          border: '1px solid #ced4da',
          borderRadius: 4,
          fontSize: 11,
          boxSizing: 'border-box',
        }}
      />
    </Panel>
  );
}
