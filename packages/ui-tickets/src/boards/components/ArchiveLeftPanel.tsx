import React from 'react';
import styled, { css } from 'styled-components';
import Icon from '@erxes/ui/src/components/Icon';
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: ${(p) => (p.active ? '#4361ee' : 'transparent')};
  color: ${(p) => (p.active ? '#fff' : '#495057')};
  &:hover {
    background: ${(p) => (p.active ? '#3451d1' : '#e9ecef')};
  }

  /* 아이콘 열을 고정해 라벨 시작 x좌표를 모든 항목에서 일치시킨다 */
  i {
    width: 14px;
    flex-shrink: 0;
    text-align: center;
    font-size: 14px;
    opacity: ${(p) => (p.active ? 1 : 0.65)};
  }
`;

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-top: 8px;
  display: block;
`;

// date와 select는 브라우저 기본 렌더링이 서로 달라 같은 CSS를 줘도 높이·글꼴이 어긋난다.
// 필터 그룹 안에서 톤을 맞추기 위해 두 입력의 뼈대를 공유한다.
const fieldBase = css`
  width: 100%;
  height: 30px;
  padding: 0 8px;
  font-family: inherit;
  font-size: 12px;
  color: #495057;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4361ee;
    box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.15);
  }
`;

const DateInput = styled.input`
  ${fieldBase}
  font-variant-numeric: tabular-nums;

  /* 네이티브 달력 버튼을 셀렉트 화살표와 같은 무게로 낮춘다 */
  &::-webkit-calendar-picker-indicator {
    opacity: 0.45;
    cursor: pointer;
  }
  &::-webkit-calendar-picker-indicator:hover {
    opacity: 0.85;
  }
`;

const SelectInput = styled.select`
  ${fieldBase}
  padding-right: 26px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%23868e96' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 11px;
`;

// 아이콘은 전부 erxes-icon(라인) 세트에서만 고른다. 이모지를 아이콘으로 쓰면
// 픽토그램 스타일이 OS/폰트마다 제각각이 된다.
const GROUP_OPTIONS = [
  { value: 'none', icon: 'list-ul', label: '전체 목록' },
  { value: 'year', icon: 'history', label: '연도별' },
  { value: 'quarter', icon: 'chart-pie', label: '분기별' },
  { value: 'month', icon: 'calendar-alt', label: '월별' },
  { value: 'assignee', icon: 'user', label: '담당자별' },
  { value: 'requestType', icon: 'tag-alt', label: '고객요청구분' },
  { value: 'functionCategory', icon: 'folder', label: '기능분류' },
  { value: 'company', icon: 'building', label: '회사별' },
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
  const set = <K extends keyof ArchiveFilters>(
    key: K,
    value: ArchiveFilters[K],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <Panel>
      <SectionLabel>그룹 기준</SectionLabel>
      {GROUP_OPTIONS.map((opt) => (
        <GroupItem
          key={opt.value}
          active={groupBy === opt.value}
          onClick={() => onGroupByChange(opt.value)}
        >
          <Icon icon={opt.icon} />
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

      {/*
        그룹 기준과 같은 축의 필터는 감춘다. 그룹이 이미 그 축으로 나누고 있어
        필터를 걸면 그룹이 1개로 축소될 뿐이다.
        시작일/종료일은 업무 startDate/closeDate 기준이라 생성일(createdAt) 기반
        기간 그룹과는 다른 축이므로 항상 노출한다.
      */}
      {groupBy !== 'assignee' && (
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
      )}

      {groupBy !== 'requestType' && (
        <>
          <FilterLabel>고객요청구분</FilterLabel>
          <SelectInput
            value={filters.requestType}
            onChange={(e) => set('requestType', e.target.value)}
          >
            {REQUEST_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </>
      )}

      {groupBy !== 'functionCategory' && (
        <>
          <FilterLabel>기능분류</FilterLabel>
          <SelectInput
            value={filters.functionCategory}
            onChange={(e) => set('functionCategory', e.target.value)}
          >
            {FUNCTION_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </>
      )}
    </Panel>
  );
}
