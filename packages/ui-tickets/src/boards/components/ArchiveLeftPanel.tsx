import React from 'react';
import styled from 'styled-components';
import SelectTeamMembers from '@erxes/ui/src/team/containers/SelectTeamMembers';

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
  font-size: 11px;
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
  font-size: 13px;
  cursor: pointer;
  background: ${(p) => (p.active ? '#4361ee' : 'transparent')};
  color: ${(p) => (p.active ? '#fff' : '#495057')};
  &:hover {
    background: ${(p) => (p.active ? '#3451d1' : '#e9ecef')};
  }
`;

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-top: 8px;
  display: block;
`;

const DateInput = styled.input`
  width: 100%;
  padding: 5px 7px;
  font-size: 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 5px 7px;
  font-size: 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;
`;

const GROUP_OPTIONS = [
  { value: 'month', label: '📅 월별' },
  { value: 'assignee', label: '👤 담당자별' },
  { value: 'requestType', label: '🏷 고객요청구분' },
  { value: 'functionCategory', label: '📂 기능분류' },
  { value: 'company', label: '🏢 회사별' },
];

const REQUEST_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'inquiry', label: '단순문의' },
  { value: 'improvement', label: '개선요청' },
  { value: 'error', label: '오류처리' },
  { value: 'config', label: '설정변경' },
  { value: 'additional_development', label: '추가개발' },
  { value: 'usage_guide', label: '사용안내' },
  { value: 'data_work', label: '데이터작업' },
];

const FUNCTION_CATEGORY_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'hr', label: '인사' },
  { value: 'organization', label: '조직' },
  { value: 'attendance', label: '근태' },
  { value: 'payroll', label: '급여' },
  { value: 'evaluation', label: '평가' },
  { value: 'education', label: '교육' },
  { value: 'recruitment', label: '채용' },
  { value: 'benefits', label: '복리후생' },
  { value: 'pcoff', label: 'PCOFF' },
  { value: 'approval', label: '전자결재' },
  { value: 'system', label: '시스템' },
  { value: 'mobile', label: '모바일' },
  { value: 'tigris', label: '티그리스' },
];

export type ArchiveFilters = {
  search: string;
  assignedUserIds: string[];
  requestType: string;
  functionCategory: string;
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

      <SelectTeamMembers
        label="담당자 선택"
        name="assignedUserIds"
        onSelect={(v) => {
          if (typeof v === 'string') {
            set('assignedUserIds', v ? [v] : []);
          } else {
            set('assignedUserIds', v || []);
          }
        }}
      />

      <FilterLabel>고객요청구분</FilterLabel>
      <SelectInput
        value={filters.requestType}
        onChange={(e) => set('requestType', e.target.value)}
      >
        {REQUEST_TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </SelectInput>

      <FilterLabel>기능분류</FilterLabel>
      <SelectInput
        value={filters.functionCategory}
        onChange={(e) => set('functionCategory', e.target.value)}
      >
        {FUNCTION_CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </SelectInput>
    </Panel>
  );
}
