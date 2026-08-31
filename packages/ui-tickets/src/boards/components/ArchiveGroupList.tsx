import React, { useState, useEffect } from 'react';
import styled, { css } from 'styled-components';
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
  $muted?: boolean;
}

const Tag = styled.span<TagProps>`
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 11px;
  white-space: nowrap;

  ${(p) =>
    p.$muted
      ? css`
          /* 값이 실제로 비어 있음을 나타내는 중립 뱃지.
             점선 테두리로 "데이터 누락"이 아니라 "미분류"임을 구분한다. */
          background: transparent;
          color: #adb5bd;
          border: 1px dashed #dee2e6;
        `
      : css`
          background: ${p.$bg || '#e9ecef'};
          color: ${p.$text || '#333'};
          border: 1px solid ${p.$text ? `${p.$text}30` : '#dee2e6'};
        `}
`;

const GroupLabel = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// 라벨 길이에 따라 숫자가 밀리지 않도록 고정 폭 + 우측 정렬 + 자릿수 고정.
const GroupCount = styled.span`
  flex: 0 0 60px;
  text-align: right;
  font-weight: 400;
  color: #868e96;
  font-variant-numeric: tabular-nums;
`;

const NameCell = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  color: #212529;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MetaCell = styled.span<{ $w: number; $num?: boolean }>`
  flex: 0 0 ${(p) => p.$w}px;
  color: #868e96;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${(p) =>
    p.$num &&
    css`
      text-align: right;
      font-variant-numeric: tabular-nums;
    `}
`;

// 뱃지가 없는 행에서도 열 폭을 유지해 오른쪽 끝선을 맞춘다.
const TagCell = styled.span<{ $w: number }>`
  flex: 0 0 ${(p) => p.$w}px;
  display: flex;
`;

// 체크박스는 브라우저마다 폭이 달라 헤더와 본문이 어긋난다. 폭을 고정한다.
const CheckCell = styled.span`
  flex: 0 0 14px;
  display: flex;
  align-items: center;

  input {
    margin: 0;
    cursor: pointer;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: #fbfcfd;
  border-bottom: 1px solid #e9ecef;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;

  /* 본문 행과 같은 셀 컴포넌트를 재사용해 열 폭을 강제로 일치시키고,
     색만 헤더 톤으로 덮어쓴다(&&로 특이도를 올려 셀의 기본 색을 이긴다). */
  && > * {
    color: #868e96;
  }
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
  createdAt?: string;
  modifiedAt?: string;
  requestType?: string;
  functionCategory?: string;
};

type ColorDef = { bg: string; text: string };

const REQUEST_TYPE_MAP: Record<string, { label: string } & ColorDef> = {
  inquiry: { label: '단순문의', bg: '#fff8e1', text: '#f57f17' },
  improvement: { label: '개선요청', bg: '#c8e6c9', text: '#2e7d32' },
  error: { label: '오류처리', bg: '#ffcdd2', text: '#c62828' },
  config: { label: '설정변경', bg: '#b3e5fc', text: '#0277bd' },
  additional_development: { label: '추가개발', bg: '#e1bee7', text: '#6a1b9a' },
  usage_guide: { label: '사용안내', bg: '#e8f5e9', text: '#388e3c' },
  data_work: { label: '데이터작업', bg: '#fff3e0', text: '#e65100' },
};

const FUNCTION_CATEGORY_MAP: Record<string, { label: string } & ColorDef> = {
  hr: { label: '인사', bg: '#edf7ed', text: '#2e7d32' },
  organization: { label: '조직', bg: '#e8f4f2', text: '#0f766e' },
  attendance: { label: '근태', bg: '#fff7ed', text: '#b45309' },
  payroll: { label: '급여', bg: '#f4e8fd', text: '#6b21a8' },
  evaluation: { label: '평가', bg: '#eaf2ff', text: '#1d4ed8' },
  education: { label: '교육', bg: '#f3f4ff', text: '#4338ca' },
  recruitment: { label: '채용', bg: '#fde8f3', text: '#be185d' },
  benefits: { label: '복리후생', bg: '#f7ecfb', text: '#9333ea' },
  pcoff: { label: 'PCOFF', bg: '#e0f2fe', text: '#0369a1' },
  approval: { label: '전자결재', bg: '#eff4ff', text: '#1e3a8a' },
  system: { label: '시스템', bg: '#fff4ed', text: '#c2410c' },
  mobile: { label: '모바일', bg: '#ecfeff', text: '#0e7490' },
  tigris: { label: '티그리스', bg: '#f0fdf4', text: '#15803d' },
};

// 값이 없을 때도 뱃지 자리를 채운다. 빈칸으로 두면 "값이 없음"인지
// "데이터가 누락됨"인지 구분되지 않고 행마다 오른쪽 끝선이 어긋난다.
const renderTag = (
  map: Record<string, { label: string } & ColorDef>,
  value?: string,
) => {
  if (!value) {
    return <Tag $muted={true}>미분류</Tag>;
  }

  const def = map[value];

  return (
    <Tag $bg={def?.bg} $text={def?.text}>
      {def?.label ?? value}
    </Tag>
  );
};

// 목록 페이지 크기. 조회 쿼리의 perPage(컨테이너)와 skip 오프셋 계산(이 파일)이
// 같은 값을 써야 하므로 여기서만 정의하고 컨테이너가 가져다 쓴다.
export const ITEMS_PER_PAGE = 20;

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
  const [groupItems, setGroupItems] = useState<Record<string, TicketItem[]>>(
    {},
  );
  const [pages, setPages] = useState<Record<string, number>>({});
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded({});
    setGroupItems({});
    setPages({});
    setHasMore({});
  }, [cacheKey]);

  // 그룹이 하나뿐이면(전체 목록 보기, 또는 필터 결과가 한 그룹에만 걸린 경우)
  // 헤더를 한 번 더 누르게 하지 않고 바로 펼친다.
  // 사용자가 직접 접은 경우에는 groupItems에 캐시가 남아 다시 열지 않는다.
  useEffect(() => {
    if (groups.length !== 1) {
      return;
    }

    const { key } = groups[0];

    if (expanded[key] || groupItems[key]) {
      return;
    }

    let cancelled = false;

    (async () => {
      const items = await fetchGroupItems(key, 0);

      if (cancelled) {
        return;
      }

      setGroupItems((prev) => ({ ...prev, [key]: items }));
      setPages((prev) => ({ ...prev, [key]: ITEMS_PER_PAGE }));
      setHasMore((prev) => ({
        ...prev,
        [key]: items.length >= ITEMS_PER_PAGE,
      }));
      setExpanded((prev) => ({ ...prev, [key]: true }));
    })();

    return () => {
      cancelled = true;
    };
  }, [groups, expanded, groupItems, fetchGroupItems]);

  const toggle = async (key: string) => {
    const isOpen = expanded[key];
    if (!isOpen && !groupItems[key]) {
      const items = await fetchGroupItems(key, 0);
      setGroupItems((prev) => ({ ...prev, [key]: items }));
      setPages((prev) => ({ ...prev, [key]: ITEMS_PER_PAGE }));
      setHasMore((prev) => ({
        ...prev,
        [key]: items.length >= ITEMS_PER_PAGE,
      }));
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
              <GroupLabel>{group.label || '미분류'}</GroupLabel>
              <GroupCount>{group.count.toLocaleString()}개</GroupCount>
              <Icon icon={isOpen ? 'angle-up' : 'angle-down'} />
            </GroupHeader>

            {isOpen && (
              <>
                {items.length > 0 && (
                  <HeaderRow>
                    <CheckCell />
                    <NameCell>제목</NameCell>
                    <MetaCell $w={110}>단계</MetaCell>
                    <MetaCell $w={96}>담당자</MetaCell>
                    <MetaCell $w={88} $num={true}>
                      등록일
                    </MetaCell>
                    <TagCell $w={84}>고객요청구분</TagCell>
                    <TagCell $w={84}>기능분류</TagCell>
                  </HeaderRow>
                )}
                {items.map((item) => (
                  <ItemRow
                    key={item._id}
                    onClick={() =>
                      routerUtils.setParams(navigate, location, {
                        itemId: item._id,
                        key: '',
                      })
                    }
                  >
                    <CheckCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item._id)}
                        onChange={() => onToggleSelect(item._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </CheckCell>
                    <NameCell>{item.name}</NameCell>
                    <MetaCell $w={110}>{item.stageName || '-'}</MetaCell>
                    <MetaCell $w={96}>
                      {item.assignedUsers?.[0]?.details?.fullName || '-'}
                    </MetaCell>
                    <MetaCell $w={88} $num={true}>
                      {item.createdAt ? item.createdAt.slice(0, 10) : '-'}
                    </MetaCell>
                    <TagCell $w={84}>
                      {renderTag(REQUEST_TYPE_MAP, item.requestType)}
                    </TagCell>
                    <TagCell $w={84}>
                      {renderTag(FUNCTION_CATEGORY_MAP, item.functionCategory)}
                    </TagCell>
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
