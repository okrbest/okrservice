import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Icon from '@erxes/ui/src/components/Icon';
import * as routerUtils from '@erxes/ui/src/utils/router';
import { useNavigate, useLocation } from 'react-router-dom';

const GroupHeader = styled.div`
  background: #e9ecef;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: #212529;
  user-select: none;
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    background: #f8f9fa;
  }
  &:last-child {
    border-bottom: none;
  }
`;

interface TagProps {
  $bg?: string;
  $text?: string;
}

const Tag = styled.span<TagProps>`
  background: ${(p) => p.$bg || '#e9ecef'};
  color: ${(p) => p.$text || '#333'};
  border: 1px solid ${(p) => p.$text ? `${p.$text}30` : '#dee2e6'};
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  white-space: nowrap;
`;

const LoadMoreRow = styled.div`
  padding: 6px 14px;
  font-size: 12px;
  color: #4361ee;
  cursor: pointer;
  background: #f8f9fa;
  &:hover {
    background: #e9ecef;
  }
`;

export type TicketItem = {
  _id: string;
  name: string;
  stageName?: string;
  assignedUsers?: { _id: string; details?: { fullName?: string } }[];
  modifiedAt?: string;
  requestType?: string;
  functionCategory?: string;
};

type ColorDef = { bg: string; text: string };

const REQUEST_TYPE_MAP: Record<string, { label: string } & ColorDef> = {
  inquiry:                { label: '단순문의',  bg: '#fff8e1', text: '#f57f17' },
  improvement:            { label: '개선요청',  bg: '#c8e6c9', text: '#2e7d32' },
  error:                  { label: '오류처리',  bg: '#ffcdd2', text: '#c62828' },
  config:                 { label: '설정변경',  bg: '#b3e5fc', text: '#0277bd' },
  additional_development: { label: '추가개발',  bg: '#e1bee7', text: '#6a1b9a' },
  usage_guide:            { label: '사용안내',  bg: '#e8f5e9', text: '#388e3c' },
  data_work:              { label: '데이터작업', bg: '#fff3e0', text: '#e65100' },
};

const FUNCTION_CATEGORY_MAP: Record<string, { label: string } & ColorDef> = {
  hr:           { label: '인사',     bg: '#edf7ed', text: '#2e7d32' },
  organization: { label: '조직',     bg: '#e8f4f2', text: '#0f766e' },
  attendance:   { label: '근태',     bg: '#fff7ed', text: '#b45309' },
  payroll:      { label: '급여',     bg: '#f4e8fd', text: '#6b21a8' },
  evaluation:   { label: '평가',     bg: '#eaf2ff', text: '#1d4ed8' },
  education:    { label: '교육',     bg: '#f3f4ff', text: '#4338ca' },
  recruitment:  { label: '채용',     bg: '#fde8f3', text: '#be185d' },
  benefits:     { label: '복리후생', bg: '#f7ecfb', text: '#9333ea' },
  pcoff:        { label: 'PCOFF',    bg: '#e0f2fe', text: '#0369a1' },
  approval:     { label: '전자결재', bg: '#eff4ff', text: '#1e3a8a' },
  system:       { label: '시스템',   bg: '#fff4ed', text: '#c2410c' },
  mobile:       { label: '모바일',   bg: '#ecfeff', text: '#0e7490' },
  tigris:       { label: '티그리스', bg: '#f0fdf4', text: '#15803d' },
};

export type Group = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  groups: Group[];
  fetchGroupItems: (groupKey: string, page: number) => Promise<TicketItem[]>;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onGroupSelectAll: (ids: string[]) => void;
  cacheKey?: string | number;
};

export default function ArchiveGroupList({
  groups,
  fetchGroupItems,
  selectedIds,
  onToggleSelect,
  onGroupSelectAll,
  cacheKey,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupItems, setGroupItems] = useState<Record<string, TicketItem[]>>({});
  const [pages, setPages] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded({});
    setGroupItems({});
    setPages({});
    setHasMore({});
  }, [cacheKey]);

  const ITEMS_PER_PAGE = 10;

  const toggle = async (key: string) => {
    const isOpen = expanded[key];
    if (!isOpen && !groupItems[key]) {
      const items = await fetchGroupItems(key, 0);
      setGroupItems((prev) => ({ ...prev, [key]: items }));
      setPages((prev) => ({ ...prev, [key]: ITEMS_PER_PAGE }));
      setHasMore((prev) => ({ ...prev, [key]: items.length >= ITEMS_PER_PAGE }));
    }
    setExpanded((prev) => ({ ...prev, [key]: !isOpen }));
  };

  const loadMore = async (key: string) => {
    const skip = pages[key] || ITEMS_PER_PAGE;
    const more = await fetchGroupItems(key, skip);
    setGroupItems((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ...more],
    }));
    setPages((prev) => ({ ...prev, [key]: skip + ITEMS_PER_PAGE }));
    setHasMore((prev) => ({ ...prev, [key]: more.length >= ITEMS_PER_PAGE }));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      {groups.map((group) => {
        const items = groupItems[group.key] || [];
        const isOpen = expanded[group.key];
        const allSelected =
          items.length > 0 && items.every((i) => selectedIds.includes(i._id));

        return (
          <div
            key={group.key}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: 6,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <GroupHeader onClick={() => toggle(group.key)}>
              <input
                type="checkbox"
                checked={allSelected && items.length > 0}
                onChange={(e) => {
                  e.stopPropagation();
                  onGroupSelectAll(items.map((i) => i._id));
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ flex: 1 }}>
                {group.label || '미분류'}{' '}
                <span style={{ color: '#868e96', fontWeight: 400 }}>
                  ({group.count}개)
                </span>
              </span>
              <Icon icon={isOpen ? 'angle-up' : 'angle-down'} />
            </GroupHeader>

            {isOpen && (
              <>
                {items.map((item) => (
                  <ItemRow
                    key={item._id}
                    onClick={() =>
                      routerUtils.setParams(navigate, location, { itemId: item._id, key: '' })
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => onToggleSelect(item._id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ flex: 2, color: '#212529' }}>{item.name}</span>
                    <span style={{ flex: 1, color: '#868e96' }}>
                      {item.stageName || '-'}
                    </span>
                    <span style={{ flex: 1, color: '#868e96' }}>
                      {item.assignedUsers?.[0]?.details?.fullName || '-'}
                    </span>
                    <span style={{ flex: 1, color: '#868e96' }}>
                      {item.modifiedAt ? item.modifiedAt.slice(0, 10) : '-'}
                    </span>
                    {item.requestType && (() => {
                      const rt = REQUEST_TYPE_MAP[item.requestType];
                      return (
                        <Tag $bg={rt?.bg} $text={rt?.text}>
                          {rt?.label ?? item.requestType}
                        </Tag>
                      );
                    })()}
                    {item.functionCategory && (() => {
                      const fc = FUNCTION_CATEGORY_MAP[item.functionCategory];
                      return (
                        <Tag $bg={fc?.bg} $text={fc?.text}>
                          {fc?.label ?? item.functionCategory}
                        </Tag>
                      );
                    })()}
                  </ItemRow>
                ))}
                {hasMore[group.key] && (
                  <LoadMoreRow onClick={() => loadMore(group.key)}>
                    + 더 보기
                  </LoadMoreRow>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
