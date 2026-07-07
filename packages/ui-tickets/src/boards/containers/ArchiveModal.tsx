import React, { useState, useCallback } from 'react';
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
        modifiedAtStart?: string;
        modifiedAtEnd?: string;
      } = {};

      switch (groupBy) {
        case 'month': {
          if (groupKey && groupKey !== 'none') {
            const [year, month] = groupKey.split('-');
            if (year && month) {
              const y = parseInt(year, 10);
              const m = parseInt(month, 10);
              const start = new Date(y, m - 1, 1);
              const end = new Date(y, m, 0);
              groupFilter.modifiedAtStart = start.toISOString().split('T')[0];
              groupFilter.modifiedAtEnd = end.toISOString().split('T')[0];
            }
          }
          break;
        }
        case 'assignee':
          if (groupKey !== 'none') {
            groupFilter.assignedUserIds = [groupKey];
          }
          break;
        case 'company':
          if (groupKey !== 'none') {
            groupFilter.companyIds = [groupKey];
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
    [client, pipelineId, groupBy, filters.search]
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

  const groups = data?.archivedTicketsGroups || [];

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
