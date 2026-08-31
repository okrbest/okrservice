import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import { Alert, confirm } from '@erxes/ui/src/utils';
import ArchiveModalComponent from '../components/ArchiveModal';
import { ArchiveFilters } from '../components/ArchiveLeftPanel';
import { ITEMS_PER_PAGE } from '../components/ArchiveGroupList';
import {
  queries as ticketQueries,
  mutations as ticketMutations,
} from '../../tickets/graphql';

type Props = {
  pipelineId: string;
  onClose: () => void;
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  inquiry: '단순문의',
  improvement: '개선요청',
  error: '오류처리',
  config: '설정변경',
  additional_development: '추가개발',
  usage_guide: '사용안내',
  data_work: '데이터작업',
};

const FUNCTION_CATEGORY_LABELS: Record<string, string> = {
  hr: '인사',
  organization: '조직',
  attendance: '근태',
  payroll: '급여',
  evaluation: '평가',
  education: '교육',
  recruitment: '채용',
  benefits: '복리후생',
  pcoff: 'PCOFF',
  approval: '전자결재',
  system: '시스템',
  mobile: '모바일',
  tigris: '티그리스',
};

// 기간 그룹의 key('2026' / '2026-Q3')는 날짜 범위로 되파싱해야 하므로 원본을 유지하고 표시용 라벨만 만든다.
const formatPeriodLabel = (groupBy: string, key: string): string | null => {
  if (!key || key === 'none') {
    return null;
  }

  if (groupBy === 'year') {
    return `${key}년`;
  }

  const [year, quarter] = key.split('-Q');

  return year && quarter ? `${year}년 ${quarter}분기` : null;
};

// 그룹 기준과 같은 축의 필터는 패널에서 숨기므로, 이전에 걸어둔 값이 보이지 않는 채로
// 계속 적용되지 않도록 그룹 전환 시점에 비운다.
const clearDuplicatedAxisFilter = (
  filters: ArchiveFilters,
  groupBy: string,
): ArchiveFilters => {
  switch (groupBy) {
    case 'assignee':
      return { ...filters, assignedUserIds: [] };
    case 'requestType':
      return { ...filters, requestType: '' };
    case 'functionCategory':
      return { ...filters, functionCategory: '' };
    default:
      return filters;
  }
};

export default function ArchiveModal({ pipelineId, onClose }: Props) {
  const client = useApolloClient();
  const [groupBy, setGroupBy] = useState('month');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArchiveFilters>({
    search: '',
    assignedUserIds: [],
    requestType: '',
    functionCategory: '',
    startDate: '',
    endDate: '',
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 벌크 작업용 수동 무효화. 그룹/필터 변경은 아래 cacheKey가 조합으로 처리한다.
  const [cacheVersion, setCacheVersion] = useState(0);

  // ArchiveGroupList는 펼친 그룹의 항목을 groupKey로 캐싱한다. 그룹 기준이나 필터가
  // 바뀌면 같은 groupKey라도 내용이 달라지므로 캐시를 반드시 버려야 한다.
  const cacheKey = useMemo(
    () =>
      [
        cacheVersion,
        groupBy,
        debouncedSearch,
        filters.assignedUserIds.join(','),
        filters.requestType,
        filters.functionCategory,
        filters.startDate,
        filters.endDate,
      ].join('|'),
    [
      cacheVersion,
      groupBy,
      debouncedSearch,
      filters.assignedUserIds,
      filters.requestType,
      filters.functionCategory,
      filters.startDate,
      filters.endDate,
    ],
  );

  const { data, loading, previousData, refetch } = useQuery(
    gql(ticketQueries.archivedTicketsGroups),
    {
      variables: {
        pipelineId,
        groupBy,
        search: debouncedSearch || undefined,
        assignedUserIds: filters.assignedUserIds.length
          ? filters.assignedUserIds
          : undefined,
        requestType: filters.requestType || undefined,
        functionCategory: filters.functionCategory || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      },
      fetchPolicy: 'cache-and-network',
    },
  );

  const displayData = data ?? previousData;
  const isInitialLoading = loading && !displayData;

  const [bulkUnarchiveMutation] = useMutation(
    gql(ticketMutations.ticketsBulkEdit),
  );
  const [bulkDeleteMutation] = useMutation(
    gql(ticketMutations.ticketsBulkRemove),
  );

  const fetchGroupItems = useCallback(
    async (groupKey: string, page: number): Promise<any[]> => {
      const groupFilter: {
        assignedUserIds?: string[];
        companyIds?: string[];
        createdAtStart?: string;
        createdAtEnd?: string;
        noAssignee?: boolean;
        noCompany?: boolean;
        requestType?: string;
        functionCategory?: string;
        noRequestType?: boolean;
        noFunctionCategory?: boolean;
      } = {};

      switch (groupBy) {
        case 'year': {
          if (groupKey && groupKey !== 'none') {
            const y = parseInt(groupKey, 10);
            if (!isNaN(y)) {
              groupFilter.createdAtStart = `${groupKey}-01-01`;
              groupFilter.createdAtEnd = `${groupKey}-12-31`;
            }
          }
          break;
        }
        case 'quarter': {
          if (groupKey && groupKey !== 'none') {
            const [year, quarter] = groupKey.split('-Q');
            const y = parseInt(year, 10);
            const q = parseInt(quarter, 10);
            if (!isNaN(y) && q >= 1 && q <= 4) {
              const startMonth = (q - 1) * 3 + 1;
              const endMonth = q * 3;
              const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
              groupFilter.createdAtStart = `${year}-${String(startMonth).padStart(2, '0')}-01`;
              groupFilter.createdAtEnd = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            }
          }
          break;
        }
        case 'month': {
          if (groupKey && groupKey !== 'none') {
            const [year, month] = groupKey.split('-');
            if (year && month) {
              const y = parseInt(year, 10);
              const m = parseInt(month, 10);
              const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
              groupFilter.createdAtStart = `${year}-${month}-01`;
              groupFilter.createdAtEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
            }
          }
          break;
        }
        case 'assignee':
          if (groupKey === 'none') {
            groupFilter.noAssignee = true;
          } else {
            groupFilter.assignedUserIds = [groupKey];
          }
          break;
        case 'company':
          if (groupKey === 'none') {
            groupFilter.noCompany = true;
          } else {
            groupFilter.companyIds = [groupKey];
          }
          break;
        case 'requestType':
          if (groupKey === 'none') {
            groupFilter.noRequestType = true;
          } else {
            groupFilter.requestType = groupKey;
          }
          break;
        case 'functionCategory':
          if (groupKey === 'none') {
            groupFilter.noFunctionCategory = true;
          } else {
            groupFilter.functionCategory = groupKey;
          }
          break;
        default:
          break;
      }

      const isLightweight = groupBy !== 'company';
      const queryDoc = isLightweight
        ? gql(ticketQueries.archivedTicketItems)
        : gql(ticketQueries.archivedTickets);
      const resultKey = isLightweight
        ? 'archivedTicketItems'
        : 'archivedTickets';

      try {
        const result = await client.query({
          query: queryDoc,
          variables: {
            pipelineId,
            search: filters.search || undefined,
            assignedUserIds:
              groupBy !== 'assignee' && filters.assignedUserIds.length > 0
                ? filters.assignedUserIds
                : undefined,
            requestType:
              groupBy !== 'requestType' && filters.requestType
                ? filters.requestType
                : undefined,
            functionCategory:
              groupBy !== 'functionCategory' && filters.functionCategory
                ? filters.functionCategory
                : undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            page,
            perPage: ITEMS_PER_PAGE,
            ...groupFilter,
          },
          fetchPolicy: 'network-only',
        });
        return result.data?.[resultKey] || [];
      } catch (e: any) {
        Alert.error(e.message);
        return [];
      }
    },
    [
      client,
      pipelineId,
      groupBy,
      filters.search,
      filters.assignedUserIds,
      filters.requestType,
      filters.functionCategory,
      filters.startDate,
      filters.endDate,
    ],
  );

  const handleSearchChange = (v: string) => {
    setFilters((prev) => ({ ...prev, search: v }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(v), 300);
  };

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const toggleItemSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const groupSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allIn = ids.every((id) => prev.includes(id));
      if (allIn) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const handleBulkUnarchive = async () => {
    try {
      await bulkUnarchiveMutation({
        variables: { ids: selectedIds, status: 'active' },
      });
      Alert.success(`${selectedIds.length}개 티켓이 복구되었습니다.`);
      setSelectedIds([]);
      setCacheVersion((v) => v + 1);
      refetch();
    } catch (e: any) {
      Alert.error(e.message);
    }
  };

  const handleBulkDelete = () => {
    confirm(
      `${selectedIds.length}개 티켓을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    ).then(async () => {
      try {
        await bulkDeleteMutation({ variables: { ids: selectedIds } });
        Alert.success(`${selectedIds.length}개 티켓이 삭제되었습니다.`);
        setSelectedIds([]);
        setCacheVersion((v) => v + 1);
        refetch();
      } catch (e: any) {
        Alert.error(e.message);
      }
    });
  };

  const rawGroups = displayData?.archivedTicketsGroups || [];

  const groups = useMemo(() => {
    if (groupBy === 'year' || groupBy === 'quarter') {
      return rawGroups.map(
        (g: { key: string; label: string; count: number }) => ({
          ...g,
          label: formatPeriodLabel(groupBy, g.key) ?? g.label,
        }),
      );
    }

    const labelMap =
      groupBy === 'requestType'
        ? REQUEST_TYPE_LABELS
        : groupBy === 'functionCategory'
          ? FUNCTION_CATEGORY_LABELS
          : null;

    if (!labelMap) return rawGroups;

    return rawGroups.map(
      (g: { key: string; label: string; count: number }) => ({
        ...g,
        label: labelMap[g.key] ?? g.label,
      }),
    );
  }, [rawGroups, groupBy]);

  return (
    <ArchiveModalComponent
      groups={groups}
      groupBy={groupBy}
      filters={filters}
      selectedIds={selectedIds}
      onGroupByChange={(v) => {
        setGroupBy(v);
        setSelectedIds([]);
        setFilters((prev) => clearDuplicatedAxisFilter(prev, v));
      }}
      onFiltersChange={setFilters}
      onSearchChange={handleSearchChange}
      onToggleSelect={toggleItemSelect}
      onGroupSelectAll={groupSelectAll}
      onBulkUnarchive={handleBulkUnarchive}
      onBulkDelete={handleBulkDelete}
      onClose={onClose}
      fetchGroupItems={fetchGroupItems}
      loading={isInitialLoading}
      refetching={loading && !!displayData}
      cacheKey={cacheKey}
    />
  );
}
