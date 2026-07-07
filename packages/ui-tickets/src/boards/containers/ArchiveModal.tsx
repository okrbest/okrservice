import React, { useState, useCallback, useMemo } from 'react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import { Alert, confirm } from '@erxes/ui/src/utils';
import ArchiveModalComponent from '../components/ArchiveModal';
import { ArchiveFilters } from '../components/ArchiveLeftPanel';
import { queries as ticketQueries, mutations as ticketMutations } from '../../tickets/graphql';

type Props = {
  pipelineId: string;
  onClose: () => void;
};

const ITEMS_PER_PAGE = 10;

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

export default function ArchiveModal({ pipelineId, onClose }: Props) {
  const client = useApolloClient();
  const [groupBy, setGroupBy] = useState('month');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArchiveFilters>({
    search: '',
    assignedUserIds: [],
    startDate: '',
    endDate: '',
  });

  const [cacheKey, setCacheKey] = useState(0);

  const { data, loading, refetch } = useQuery(
    gql(ticketQueries.archivedTicketsGroups),
    {
      variables: {
        pipelineId,
        groupBy,
        search: filters.search || undefined,
        assignedUserIds:
          filters.assignedUserIds.length ? filters.assignedUserIds : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      },
      fetchPolicy: 'network-only',
    }
  );

  const [bulkUnarchiveMutation] = useMutation(
    gql(ticketMutations.ticketsBulkEdit)
  );
  const [bulkDeleteMutation] = useMutation(
    gql(ticketMutations.ticketsBulkRemove)
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

      try {
        const result = await client.query({
          query: gql(ticketQueries.archivedTickets),
          variables: {
            pipelineId,
            search: filters.search || undefined,
            assignedUserIds:
              groupBy !== 'assignee' && filters.assignedUserIds.length > 0
                ? filters.assignedUserIds
                : undefined,
            page,
            perPage: ITEMS_PER_PAGE,
            ...groupFilter,
          },
          fetchPolicy: 'network-only',
        });
        return result.data?.archivedTickets || [];
      } catch (e: any) {
        Alert.error(e.message);
        return [];
      }
    },
    [client, pipelineId, groupBy, filters.search, filters.assignedUserIds]
  );

  const handleSearchChange = (v: string) => {
    setFilters(prev => ({ ...prev, search: v }));
  };

  const toggleItemSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const groupSelectAll = (ids: string[]) => {
    setSelectedIds(prev => {
      const allIn = ids.every(id => prev.includes(id));
      if (allIn) return prev.filter(id => !ids.includes(id));
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
      setCacheKey((k) => k + 1);
      refetch();
    } catch (e: any) {
      Alert.error(e.message);
    }
  };

  const handleBulkDelete = () => {
    confirm(
      `${selectedIds.length}개 티켓을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    ).then(async () => {
      try {
        await bulkDeleteMutation({ variables: { ids: selectedIds } });
        Alert.success(`${selectedIds.length}개 티켓이 삭제되었습니다.`);
        setSelectedIds([]);
        setCacheKey((k) => k + 1);
        refetch();
      } catch (e: any) {
        Alert.error(e.message);
      }
    });
  };

  const rawGroups = data?.archivedTicketsGroups || [];

  const groups = useMemo(() => {
    const labelMap =
      groupBy === 'requestType' ? REQUEST_TYPE_LABELS :
      groupBy === 'functionCategory' ? FUNCTION_CATEGORY_LABELS :
      null;

    if (!labelMap) return rawGroups;

    return rawGroups.map((g: { key: string; label: string; count: number }) => ({
      ...g,
      label: labelMap[g.key] ?? g.label,
    }));
  }, [rawGroups, groupBy]);

  return (
    <ArchiveModalComponent
      groups={groups}
      groupBy={groupBy}
      filters={filters}
      selectedIds={selectedIds}
      onGroupByChange={(v) => { setGroupBy(v); setSelectedIds([]); }}
      onFiltersChange={setFilters}
      onSearchChange={handleSearchChange}
      onToggleSelect={toggleItemSelect}
      onGroupSelectAll={groupSelectAll}
      onBulkUnarchive={handleBulkUnarchive}
      onBulkDelete={handleBulkDelete}
      onClose={onClose}
      fetchGroupItems={fetchGroupItems}
      loading={loading}
      cacheKey={cacheKey}
    />
  );
}
