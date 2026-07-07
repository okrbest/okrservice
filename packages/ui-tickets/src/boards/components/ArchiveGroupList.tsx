import React, { useState } from 'react';
import styled from 'styled-components';
import Icon from '@erxes/ui/src/components/Icon';

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
  &:last-child {
    border-bottom: none;
  }
`;

interface TagProps {
  color?: string;
}

const Tag = styled.span<TagProps>`
  background: ${(p) => p.color || '#e9ecef'};
  color: #333;
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
};

export default function ArchiveGroupList({
  groups,
  fetchGroupItems,
  selectedIds,
  onToggleSelect,
  onGroupSelectAll,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupItems, setGroupItems] = useState<Record<string, TicketItem[]>>({});
  const [pages, setPages] = useState<Record<string, number>>({});

  const toggle = async (key: string) => {
    const isOpen = expanded[key];
    if (!isOpen && !groupItems[key]) {
      const items = await fetchGroupItems(key, 0);
      setGroupItems((prev) => ({ ...prev, [key]: items }));
      setPages((prev) => ({ ...prev, [key]: 1 }));
    }
    setExpanded((prev) => ({ ...prev, [key]: !isOpen }));
  };

  const loadMore = async (key: string) => {
    const page = pages[key] || 1;
    const more = await fetchGroupItems(key, page);
    setGroupItems((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ...more],
    }));
    setPages((prev) => ({ ...prev, [key]: page + 1 }));
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
                  <ItemRow key={item._id}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => onToggleSelect(item._id)}
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
                    {item.requestType && <Tag>{item.requestType}</Tag>}
                  </ItemRow>
                ))}
                {items.length < group.count && (
                  <LoadMoreRow onClick={() => loadMore(group.key)}>
                    + {group.count - items.length}개 더 보기
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
