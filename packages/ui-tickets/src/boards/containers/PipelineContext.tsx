import * as compose from 'lodash.flowright';

import { Alert, router as routerUtils, withProps } from '@erxes/ui/src/utils';
import {
  IDragResult,
  IDragStart,
  IFilterParams,
  IItem,
  IItemMap,
  INonFilterParams,
  IOptions,
  IPipeline,
  PipelineDetailQueryResponse,
} from '../types';
import {
  invalidateCache,
  isRefresh,
  reorder,
  reorderItemMap,
  updateItemInfo,
} from '../utils';
import { mutations, queries, subscriptions } from '../graphql';
import {
  StageBuffer,
  WINDOW_SIZE,
  appendItems,
  createBuffer,
  fillWindow,
  getWindow,
  hasBelow,
  removeOutsideWindow,
  replaceOutsideWindow,
  slideDown,
  slideUp,
  syncWindow,
} from '../utils/stageWindow';
import { applyItemAdds, PendingItemAdd } from '../utils/itemAdds';
import { queries as queriesLogs } from '@erxes/ui-log/src/activityLogs/graphql';

import InvisibleItemInUrl from './InvisibleItemInUrl';
import React from 'react';
import { UserDetailQueryResponse } from '@erxes/ui/src/auth/types';
import client from '@erxes/ui/src/apolloClient';
import { ApolloClient, gql } from '@apollo/client';
import { graphql, withApollo } from '@apollo/client/react/hoc';
import { requestIdleCallback } from 'request-idle-callback';
import { setTimeout } from 'timers';

type WrapperProps = {
  pipeline: IPipeline;
  initialItemMap?: IItemMap;
  options: IOptions;
  children: any;
  navigate: any;
  location: any;
  queryParams: IFilterParams & INonFilterParams;
  queryParamsChanged: (
    queryParams: IFilterParams,
    nextQueryParams: IFilterParams,
  ) => boolean;
};

type Props = WrapperProps & {
  currentUserQuery: UserDetailQueryResponse;
  pipelineDetailQuery: PipelineDetailQueryResponse;
  client: ApolloClient<any>;
};

type StageLoadMap = {
  [key: string]: 'readyToLoad' | 'loaded';
};

type State = {
  itemIds: string[];
  itemMap: IItemMap;
  stageLoadMap: StageLoadMap;
  stageIds: string[];
  isShowLabel: boolean;
  isDragEnabled?: boolean;
  /** 스테이지별 슬라이딩 윈도우: 앞쪽으로 건너뛴 개수 (다음 fetch의 skip = stageSkipOffset[stageId] + items.length) */
  stageSkipOffset: { [stageId: string]: number };
  isSelectMode: boolean;
  selectedIds: string[];
  bulkDateThreshold: string;
};

interface IStore {
  options: IOptions;
  itemMap: IItemMap;
  stageLoadMap: StageLoadMap;
  stageIds: string[];
  onLoadStage: (stageId: string, items: IItem[]) => void;
  /** 스크롤 창 이동. fetched가 있으면 보관 목록에 붙인 뒤 이동. 이동했으면 true */
  onSlideStage: (
    stageId: string,
    direction: SlideDirection,
    fetched?: IItem[],
  ) => boolean;
  /** 아래로 이동 시 서버 요청이 필요한지, 요청 중 창이 바뀌었는지 판단용 */
  getStageBufferInfo: (stageId: string) => {
    loadedCount: number;
    hasBelow: boolean;
    start: number;
  };
  scheduleStage: (stageId: string) => void;
  refetchStage: (stageId: string) => void;
  onDragEnd: (result: IDragResult) => void;
  onDragStart: (start: IDragStart) => void;
  onAddItem: (stageId: string, item: IItem, aboveItemId?: string) => void;
  onRemoveItem: (itemId: string, stageId: string) => void;
  onUpdateItem: (item: IItem, prevStageId?: string) => void;
  synchSingleCard: (itemId: string) => void;
  isShowLabel: boolean;
  toggleLabels: () => void;
  maxItemsPerStage: number;
  /** 스테이지별 슬라이딩 윈도우 오프셋 (다음 loadMore 시 skip = stageSkipOffset + items.length) */
  stageSkipOffset: { [stageId: string]: number };
  isSelectMode: boolean;
  selectedIds: string[];
  bulkDateThreshold: string;
  toggleSelectMode: () => void;
  toggleItemSelect: (itemId: string) => void;
  selectAllInStage: (stageItemIds: string[]) => void;
  clearSelection: () => void;
  setBulkDateThreshold: (v: string) => void;
}

/** down/up: 사용자 스크롤, fill: 덜 찬 창 채우기, stay: 보관 목록에 붙이기만 */
export type SlideDirection = 'down' | 'up' | 'fill' | 'stay';

const SLIDE: Record<
  SlideDirection,
  (buffer: StageBuffer<IItem>) => StageBuffer<IItem>
> = {
  down: slideDown,
  up: slideUp,
  fill: fillWindow,
  stay: (buffer) => buffer,
};

const PipelineContext = React.createContext({} as IStore);

export const PipelineConsumer = PipelineContext.Consumer;

type Ticket = {
  handler: (stageId: string) => void;
  stageId: string;
  isComplete: boolean;
};

const STAGE_REFETCH_THROTTLE_MS = 2500;
/** itemUpdate 구독 시 setState 쓰로틀: 이벤트가 잦아도 리렌더 최소화 */
const ITEM_UPDATE_THROTTLE_MS = 600;
/** 모달이 열려 있을 때는 보드 업데이트를 더 완화해 상세 입력 버벅임 방지 */
/** 모달이 열려 있을 때는 보드 itemMap 갱신을 더 완화 → 상세에서 description 입력 시 버벅임 완화 */
const ITEM_UPDATE_THROTTLE_WHEN_MODAL_MS = 10000;
/** 스테이지당 메모리 상한: 담당 티켓 많을 때 itemMap/리렌더 비용 완화 */
const MAX_ITEMS_PER_STAGE = WINDOW_SIZE;

class PipelineProviderInner extends React.Component<Props, State> {
  static tickets: Ticket[] = [];
  static currentTicket: Ticket | null;

  private pendingStageRefetchIds = new Set<string>();
  /** 단계별로 서버에서 받은 카드 전체 (화면에는 창 구간만). state 밖이라 리렌더 없음 */
  private stageBuffers = new Map<string, StageBuffer<IItem>>();
  /** 창을 옮겼지만 아직 state(itemMap)에 반영되지 않은 단계 */
  private pendingWindowStages = new Set<string>();
  private pendingStageRefetchTimeout: ReturnType<typeof setTimeout> | null =
    null;
  private pendingItemUpdatesRef = new Map<string, IItem>();
  private itemUpdateFlushTimeout: ReturnType<typeof setTimeout> | null = null;
  /** 실시간으로 들어온 새 카드 — 모아서 한 번에 넣는다 */
  private pendingItemAdds: PendingItemAdd<IItem>[] = [];
  private itemAddFlushTimeout: ReturnType<typeof setTimeout> | null = null;
  private pipelineSubscription: { unsubscribe: () => void } | null = null;

  constructor(props: Props) {
    super(props);

    const { pipeline, initialItemMap } = props;

    const stageIds = Object.keys(initialItemMap || {});

    this.state = {
      itemIds: [],
      itemMap: initialItemMap || {},
      stageLoadMap: {},
      stageIds,
      isShowLabel: false || localStorage.getItem(pipeline._id) === 'true',
      stageSkipOffset: {},
      isSelectMode: false,
      selectedIds: [] as string[],
      bulkDateThreshold: '',
    };

    PipelineProviderInner.tickets = [];
    PipelineProviderInner.currentTicket = null;

    // 공용 캐시에 쓰지 않는다(no-cache) — 쓰면 알림이 올 때마다 화면에 떠 있는 모든 조회가 다시 확인되어
    // 보드와 열린 상세 창이 통째로 다시 그려진다 (subscribeToMore는 이 설정을 받지 못한다)
    this.pipelineSubscription = props.client
      .subscribe({
        query: gql(subscriptions.pipelinesChanged),
        variables: { _id: pipeline._id },
        fetchPolicy: 'no-cache',
      })
      .subscribe({
        error: (error) =>
          console.error('ticketsPipelinesChanged 구독 오류:', error),
        next: ({ data }) => {
          const ticketsPipelinesChanged = data?.ticketsPipelinesChanged;
          if (!ticketsPipelinesChanged || !ticketsPipelinesChanged.data) {
            return;
          }

          const {
            data: { item, aboveItemId, destinationStageId, oldStageId },
            action,
            proccessId,
          } = ticketsPipelinesChanged;

          if (proccessId !== localStorage.getItem('proccessId')) {
            if (
              action === 'orderUpdated' &&
              !this.movePendingItemAdd(item, destinationStageId, aboveItemId)
            ) {
              if (destinationStageId !== oldStageId) {
                this.removeBufferedItem(oldStageId, item._id);
              }

              let destIndex = aboveItemId
                ? this.findItemIndex(destinationStageId, aboveItemId)
                : 0;

              const srcIndex = this.findItemIndex(oldStageId, item._id);

              if (
                destIndex !== undefined &&
                aboveItemId &&
                ((destinationStageId === oldStageId && destIndex < srcIndex) ||
                  destinationStageId !== oldStageId)
              ) {
                destIndex = destIndex + 1;
              }

              this.onDragEnd(
                {
                  destination: {
                    droppableId: destinationStageId,
                    index: destIndex,
                  },
                  draggableId: item._id,
                  combine: null,
                  mode: 'FLUID',
                  reason: 'DROP',
                  source: {
                    item,
                    droppableId: oldStageId,
                    index: srcIndex,
                  },
                  type: 'DEFAULT',
                },
                false,
              );
            }

            if (action === 'itemAdd') {
              this.queueItemAdd(destinationStageId, item, aboveItemId);
            }

            if (action === 'itemRemove') {
              this.pendingItemUpdatesRef.delete(item._id);
              this.pendingItemAdds = this.pendingItemAdds.filter(
                (add) => add.item._id !== item._id,
              );
              this.removeBufferedItem(oldStageId, item._id);
              this.onRemoveItem(item._id, oldStageId);
            }

            if (action === 'itemsRemove') {
              const { itemMap } = this.state;

              this.pendingItemAdds = this.pendingItemAdds.filter(
                (add) => add.stageId !== destinationStageId,
              );

              this.setBuffer(destinationStageId, createBuffer<IItem>([]));

              this.setState({
                itemMap: {
                  ...itemMap,
                  [destinationStageId]: [],
                },
              });
            }

            if (action === 'itemUpdate') {
              const { itemMap } = this.state;
              const stageItems = itemMap[item.stageId] || [];
              const isInCurrentMap = stageItems.some(
                (i: IItem) => i._id === item._id,
              );
              // 아직 화면에 넣기 전인 새 카드면 최신 내용으로 바꿔 둔다
              this.pendingItemAdds = this.pendingItemAdds.map((add) =>
                add.item._id === item._id
                  ? { ...add, item, stageId: item.stageId || add.stageId }
                  : add,
              );
              if (!isInCurrentMap) {
                this.updateBufferedItem(item);
                return;
              }
              this.pendingItemUpdatesRef.set(item._id, item);
              if (this.itemUpdateFlushTimeout === null) {
                this.itemUpdateFlushTimeout = setTimeout(
                  () => this.flushPendingItemUpdates(),
                  this.getRealtimeThrottleMs(),
                );
              }
            }

            if (action === 'itemOfConformitiesUpdate' && item._id) {
              setTimeout(() => {
                client
                  .query({
                    query: gql(this.props.options.queries.detailQuery),
                    fetchPolicy: 'network-only',
                    variables: {
                      _id: item._id,
                    },
                  })
                  .then(({ data }) => {
                    const refetchedItem =
                      data[this.props.options.queriesName.detailQuery];
                    this.setState({
                      itemMap: updateItemInfo(this.state, refetchedItem),
                    });
                  });
              }, 5000);
            }

            if (action === 'reOrdered') {
              this.refetchStage(destinationStageId);
            } else {
              // refetch stages info (쓰로틀: 이벤트가 잦을 때 stageDetail 연속 호출 방지)
              const changedStageIds: string[] = item.stageId
                ? [item.stageId]
                : [];

              if (
                destinationStageId &&
                !changedStageIds.includes(destinationStageId)
              ) {
                changedStageIds.push(destinationStageId);
              }

              if (oldStageId && !changedStageIds.includes(oldStageId)) {
                changedStageIds.push(oldStageId);
              }

              changedStageIds.forEach((id) =>
                this.pendingStageRefetchIds.add(id),
              );
              this.scheduleThrottledStageRefetch();
            }
          }
        },
      });
  }

  /** 화면 밖에 보관된 카드에 실시간 수정 반영 — 다른 단계로 옮겨졌으면 원래 단계 보관분에서 뺀다 */
  updateBufferedItem = (item: IItem) => {
    this.stageBuffers.forEach((buffer, stageId) => {
      this.setBuffer(
        stageId,
        stageId === item.stageId
          ? replaceOutsideWindow(buffer, item)
          : removeOutsideWindow(buffer, item._id),
      );
    });
  };

  removeBufferedItem = (stageId: string, itemId: string) => {
    const buffer = this.stageBuffers.get(stageId);

    if (buffer) {
      this.setBuffer(stageId, removeOutsideWindow(buffer, itemId));
    }
  };

  /** 창 앞 카드가 빠져 시작 위치가 바뀌면 화면의 창 위치(stageSkipOffset)도 맞춘다 */
  setBuffer = (stageId: string, buffer: StageBuffer<IItem>) => {
    const prev = this.stageBuffers.get(stageId);

    this.stageBuffers.set(stageId, buffer);

    if (prev && prev.start !== buffer.start) {
      this.setState((state) => ({
        stageSkipOffset: { ...state.stageSkipOffset, [stageId]: buffer.start },
      }));
    }
  };

  flushPendingStageRefetch = () => {
    this.pendingStageRefetchTimeout = null;
    const ids = Array.from(this.pendingStageRefetchIds);
    this.pendingStageRefetchIds.clear();
    ids.forEach((id) => {
      client.query({
        query: gql(queries.stageDetail),
        fetchPolicy: 'network-only',
        variables: { _id: id },
      });
    });
  };

  scheduleThrottledStageRefetch = () => {
    if (this.pendingStageRefetchTimeout !== null) {
      return;
    }
    this.pendingStageRefetchTimeout = setTimeout(() => {
      this.flushPendingStageRefetch();
    }, STAGE_REFETCH_THROTTLE_MS);
  };

  /** 상세 창이 열려 있으면 보드 반영을 더 늦춘다 → 쓰는 중 버벅임 방지 */
  getRealtimeThrottleMs = () =>
    typeof document !== 'undefined' &&
    document.querySelectorAll('.modal').length >= 1
      ? ITEM_UPDATE_THROTTLE_WHEN_MODAL_MS
      : ITEM_UPDATE_THROTTLE_MS;

  queueItemAdd = (stageId: string, item: IItem, aboveItemId?: string) => {
    this.pendingItemAdds = [
      ...this.pendingItemAdds,
      { stageId, item, aboveItemId },
    ];

    if (this.itemAddFlushTimeout === null) {
      this.itemAddFlushTimeout = setTimeout(
        () => this.flushPendingItemAdds(),
        this.getRealtimeThrottleMs(),
      );
    }
  };

  /** 아직 화면에 넣기 전인 새 카드가 다른 자리로 옮겨졌으면 넣을 자리만 바꾼다 */
  movePendingItemAdd = (item: IItem, stageId: string, aboveItemId?: string) => {
    if (!this.pendingItemAdds.some((add) => add.item._id === item._id)) {
      return false;
    }

    this.pendingItemAdds = this.pendingItemAdds.map((add) =>
      add.item._id === item._id ? { stageId, item, aboveItemId } : add,
    );

    return true;
  };

  flushPendingItemAdds = () => {
    this.itemAddFlushTimeout = null;
    const adds = this.pendingItemAdds;
    this.pendingItemAdds = [];

    if (adds.length === 0) {
      return;
    }

    const { itemMap, addedIds } = applyItemAdds(this.state.itemMap, adds);

    this.setState({
      itemMap,
      itemIds: [...this.state.itemIds, ...addedIds],
    });

    const { queryParams, navigate, location } = this.props;

    isRefresh(queryParams, routerUtils, navigate, location);
  };

  flushPendingItemUpdates = () => {
    this.itemUpdateFlushTimeout = null;
    const pending = Array.from(this.pendingItemUpdatesRef.values());
    this.pendingItemUpdatesRef.clear();
    if (pending.length === 0) return;
    const openItemId = this.props.queryParams?.itemId;
    let nextItemMap = this.state.itemMap;
    for (const item of pending) {
      if (openItemId && item._id === openItemId) continue;
      nextItemMap = updateItemInfo({ itemMap: nextItemMap }, item);
    }
    this.setState({ itemMap: nextItemMap });
  };

  componentWillUnmount() {
    if (this.pendingStageRefetchTimeout !== null) {
      clearTimeout(this.pendingStageRefetchTimeout);
      this.pendingStageRefetchTimeout = null;
    }
    if (this.itemUpdateFlushTimeout !== null) {
      clearTimeout(this.itemUpdateFlushTimeout);
      this.itemUpdateFlushTimeout = null;
    }
    if (this.itemAddFlushTimeout !== null) {
      clearTimeout(this.itemAddFlushTimeout);
      this.itemAddFlushTimeout = null;
    }
    this.pipelineSubscription?.unsubscribe();
    this.pipelineSubscription = null;
    document.removeEventListener(
      'erxes:toggleSelectMode',
      this.handleToggleSelectModeEvent,
    );
  }

  handleToggleSelectModeEvent = () => {
    this.toggleSelectMode();
  };

  synchSingleCard = (itemId: string) => {
    setTimeout(() => {
      client
        .query({
          query: gql(this.props.options.queries.detailQuery),
          fetchPolicy: 'network-only',
          variables: {
            _id: itemId,
          },
        })
        .then(({ data }) => {
          const refetchedItem =
            data[this.props.options.queriesName.detailQuery];
          this.setState({
            itemMap: updateItemInfo(this.state, refetchedItem),
          });
        });
    }, 1000);
  };
  findItemIndex = (stageId: string, aboveItemId: string) => {
    const { itemMap } = this.state;

    if (!aboveItemId) {
      return;
    }

    let index;

    const items = itemMap[stageId] || [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item._id === aboveItemId) {
        index = i;
        break;
      }
    }

    return index;
  };

  componentDidMount() {
    document.addEventListener(
      'erxes:toggleSelectMode',
      this.handleToggleSelectModeEvent,
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { queryParams, queryParamsChanged } = this.props;

    if (queryParamsChanged(prevProps.queryParams, queryParams)) {
      const { stageIds } = this.state;

      PipelineProviderInner.tickets = [];
      PipelineProviderInner.currentTicket = null;

      stageIds.forEach((stageId: string) => {
        this.scheduleStage(stageId);
      });
    }

    if (prevState.isSelectMode !== this.state.isSelectMode) {
      document.dispatchEvent(
        new CustomEvent('erxes:selectModeChanged', {
          detail: { isSelectMode: this.state.isSelectMode },
        }),
      );
    }
  }

  onDragStart = (_start) => {
    const { isDragEnabled } = this.state;
    if (!isDragEnabled) {
      throw new Error('Not ready to move...');
    }
  };

  onDragEnd = (result, saveToDb = true) => {
    // dropped nowhere
    if (!result.destination) {
      return;
    }

    const source = result.source;
    const destination = result.destination;

    // did not move anywhere - can bail early
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // reordering stage
    if (result.type === 'STAGE') {
      const stageIds = reorder(
        this.state.stageIds,
        source.index,
        destination.index,
      );

      this.setState({ stageIds });

      // save orders to database
      if (saveToDb) {
        return this.saveStageOrders(stageIds);
      }
    }

    const { itemMap, target, aboveItem } = reorderItemMap({
      itemMap: this.state.itemMap,
      source,
      destination,
    });

    this.setState({
      itemMap,
    });

    invalidateCache();

    // saving to database
    if (saveToDb) {
      this.itemChange({
        itemId: target._id,
        aboveItemId: aboveItem ? aboveItem._id : '',
        destinationStageId: destination.droppableId,
        sourceStageId: source.droppableId,
      });
    }
  };

  refetchQueryVariables = () => {
    const { options, queryParams } = this.props;

    return {
      search: queryParams.search,
      customerIds: queryParams.customerIds,
      companyIds: queryParams.companyIds,
      assignedUserIds: queryParams.assignedUserIds,
      extraParams: options.getExtraParams(queryParams),
      closeDateType: queryParams.closeDateType,
      userIds: queryParams.userIds,
      segment: queryParams.segment,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      assignedToMe: queryParams.assignedToMe,
    };
  };

  refetchQueryBuild = (stageId: string) => {
    return {
      query: gql(queries.stageDetail),
      variables: {
        _id: stageId,
        ...this.refetchQueryVariables(),
      },
    };
  };

  refetchQueryLogs = (itemId: string) => {
    return {
      query: gql(queriesLogs.activityLogs),
      variables: {
        contentId: itemId,
        contentType: 'tickets:ticket',
      },
    };
  };

  refetchStagesQueryBuild = (pipelineId: string) => {
    return {
      query: gql(queries.stages),
      variables: {
        pipelineId,
        ...this.refetchQueryVariables(),
      },
    };
  };

  itemChange = (args: {
    itemId: string;
    aboveItemId?: string;
    destinationStageId: string;
    sourceStageId: string;
  }) => {
    const { itemId, aboveItemId, destinationStageId, sourceStageId } = args;

    const { options } = this.props;
    const refetchQueries = [
      this.refetchQueryBuild(destinationStageId),
      this.refetchQueryLogs(itemId),
    ];

    if (sourceStageId) {
      refetchQueries.unshift(this.refetchQueryBuild(sourceStageId));
    }

    const proccessId = Math.random().toString();
    localStorage.setItem('proccessId', proccessId);

    client
      .mutate({
        mutation: gql(options.mutations.changeMutation),
        variables: {
          itemId,
          aboveItemId,
          destinationStageId,
          sourceStageId,
          proccessId,
        },
        refetchQueries,
      })
      .catch((e: Error) => {
        Alert.error(e.message);
        location.reload();
      });
  };

  saveStageOrders = (stageIds: string[]) => {
    const { pipeline } = this.props;

    client
      .mutate({
        mutation: gql(mutations.stagesUpdateOrder),
        variables: {
          orders: stageIds.map((stageId, index) => ({
            _id: stageId,
            order: index,
          })),
        },
        refetchQueries: [this.refetchStagesQueryBuild(pipeline._id)],
      })
      .catch((e: Error) => {
        Alert.error(e.message);
      });
  };

  /*
   * - Stage container is sending loaded to items
   * - Storing sent items to global itemsMap
   * - Mark stage's task as complete
   * - Mark stage's loading state as loaded
   */
  onLoadStage = (stageId: string, items: IItem[]) => {
    const task = PipelineProviderInner.tickets.find(
      (t) => t.stageId === stageId,
    );

    if (task) {
      task.isComplete = true;
    }

    const buffer = createBuffer(items);

    this.stageBuffers.set(stageId, buffer);
    this.applyStageWindow(stageId, buffer, {
      ...this.state.stageLoadMap,
      [stageId]: 'loaded',
    });
  };

  /** 화면 카드(드래그·추가·삭제 반영)를 보관 목록에 맞춘 버퍼 */
  getSyncedBuffer = (stageId: string) => {
    const buffer = this.stageBuffers.get(stageId) || createBuffer<IItem>([]);

    // 반영 전이면 itemMap이 이전 창이라 맞추면 카드가 빠진다 — 버퍼가 이미 최신
    if (this.pendingWindowStages.has(stageId)) {
      return buffer;
    }

    return syncWindow(buffer, this.state.itemMap[stageId] || []);
  };

  getStageBufferInfo = (stageId: string) => {
    const buffer = this.getSyncedBuffer(stageId);

    return {
      loadedCount: buffer.loaded.length,
      hasBelow: hasBelow(buffer),
      start: buffer.start,
    };
  };

  onSlideStage = (
    stageId: string,
    direction: SlideDirection,
    fetched: IItem[] = [],
  ) => {
    const current = appendItems(this.getSyncedBuffer(stageId), fetched);
    const next = SLIDE[direction](current);

    this.stageBuffers.set(stageId, next);

    if (next === current) {
      return false;
    }

    this.applyStageWindow(stageId, next);
    return true;
  };

  applyStageWindow = (
    stageId: string,
    buffer: StageBuffer<IItem>,
    stageLoadMap: StageLoadMap = this.state.stageLoadMap,
  ) => {
    const { itemMap, itemIds, stageSkipOffset } = this.state;
    const windowItems = getWindow(buffer);
    const prevStageIds = new Set((itemMap[stageId] || []).map((i) => i._id));
    const newItemIds = Array.from(
      new Set([
        ...itemIds.filter((id) => !prevStageIds.has(id)),
        ...windowItems.map((item) => item._id),
      ]),
    );

    this.pendingWindowStages.add(stageId);
    this.setState(
      {
        itemIds: newItemIds,
        itemMap: { ...itemMap, [stageId]: windowItems },
        stageLoadMap,
        stageSkipOffset: { ...stageSkipOffset, [stageId]: buffer.start },
      },
      () => this.pendingWindowStages.delete(stageId),
    );
  };

  refetchStage = (stageId: string) => {
    const { stageLoadMap } = this.state;

    this.setState({
      stageLoadMap: { ...stageLoadMap, [stageId]: 'readyToLoad' },
    });
  };

  /*
   * Register given stage to tickets queue
   */
  scheduleStage = (stageId: string) => {
    let currentTicket = PipelineProviderInner.currentTicket;

    PipelineProviderInner.tickets.push({
      handler: (id: string) => {
        const { stageLoadMap } = this.state;
        const states = Object.values(stageLoadMap);

        if (!states.includes('readyToLoad')) {
          this.setState({
            stageLoadMap: { ...stageLoadMap, [id]: 'readyToLoad' },
          });
        }
      },
      stageId,
      isComplete: false,
    });

    if (!currentTicket) {
      currentTicket = requestIdleCallback(this.runTicketQueue);
    }
  };

  /*
   * If browser is idle then find first inComplete task and run it
   */
  runTicketQueue = (deadline: {
    didTimeout: boolean;
    timeRemaining: () => number;
  }) => {
    const inCompleteTicket = PipelineProviderInner.tickets.find(
      (task: Ticket) => !task.isComplete,
    );

    while (
      (deadline.timeRemaining() > 0 || deadline.didTimeout) &&
      inCompleteTicket
    ) {
      const { handler, stageId } = inCompleteTicket;
      handler(stageId);
    }

    PipelineProviderInner.currentTicket = null;

    if (inCompleteTicket) {
      PipelineProviderInner.currentTicket = requestIdleCallback(
        this.runTicketQueue,
      );
    }

    if (PipelineProviderInner.currentTicket === null) {
      this.setState({ isDragEnabled: true });
    }
  };

  onAddItem = (stageId: string, item: IItem, aboveItemId?: string) => {
    const { itemMap, itemIds } = this.state;
    const items = itemMap[stageId] || [];

    const { queryParams, navigate, location } = this.props;

    if (!aboveItemId) {
      this.setState({
        itemMap: { ...itemMap, [stageId]: [item, ...items] },
        itemIds: [...itemIds, item._id],
      });

      isRefresh(queryParams, routerUtils, navigate, location);

      return;
    }

    const aboveIndex = this.findItemIndex(stageId, aboveItemId);

    if (aboveIndex !== undefined) {
      const newArray = items.map((item) => Object.assign({}, item));
      newArray.splice(aboveIndex + 1, 0, { ...item });

      this.setState({
        itemMap: {
          ...itemMap,
          [stageId]: [...newArray],
        },
        itemIds: [...itemIds, item._id],
      });
    }

    isRefresh(queryParams, routerUtils, navigate, location);
  };

  onRemoveItem = (itemId: string, stageId: string) => {
    const { itemMap } = this.state;

    const items = (itemMap[stageId] || []).filter(
      (item) => item._id !== itemId,
    );

    this.setState({
      itemMap: { ...itemMap, [stageId]: items },
    });
  };

  onUpdateItem = (item: IItem, prevStageId?: string) => {
    const { stageId } = item;
    const { itemMap } = this.state;

    // Moved to anothor board or pipeline
    if (!itemMap[stageId] && prevStageId) {
      return this.onRemoveItem(item._id, prevStageId);
    }

    if (item.status === 'archived') {
      return this.onRemoveItem(item._id, item.stageId);
    }

    // Moved between stages
    if (prevStageId && stageId !== prevStageId) {
      // remove from old stage
      const prevStageItems = (itemMap[prevStageId] || []).filter(
        (d: IItem) => d._id !== item._id,
      );

      // add to new stage's front
      const items = [...itemMap[stageId]];
      items.unshift(item);

      const newItemMap = {
        ...itemMap,
        [stageId]: items,
        [prevStageId]: prevStageItems,
      };

      this.setState({ itemMap: newItemMap }, () => {
        this.itemChange({
          itemId: item._id,
          destinationStageId: stageId,
          sourceStageId: prevStageId,
        });
      });
    } else {
      const items = [...itemMap[stageId]];
      const index = items.findIndex((d) => d._id === item._id);

      items[index] = item;

      this.setState({
        itemMap: { ...itemMap, [stageId]: items },
      });
    }
  };

  toggleSelectMode = () => {
    this.setState((prev) => ({
      isSelectMode: !prev.isSelectMode,
      selectedIds: [],
    }));
  };

  toggleItemSelect = (itemId: string) => {
    this.setState((prev) => {
      const exists = prev.selectedIds.includes(itemId);
      return {
        selectedIds: exists
          ? prev.selectedIds.filter((id) => id !== itemId)
          : [...prev.selectedIds, itemId],
      };
    });
  };

  selectAllInStage = (stageItemIds: string[]) => {
    this.setState((prev) => {
      const allSelected = stageItemIds.every((id) =>
        prev.selectedIds.includes(id),
      );
      if (allSelected) {
        return {
          selectedIds: prev.selectedIds.filter(
            (id) => !stageItemIds.includes(id),
          ),
        };
      }
      const merged = [...new Set([...prev.selectedIds, ...stageItemIds])];
      return { selectedIds: merged };
    });
  };

  clearSelection = () => {
    this.setState({
      selectedIds: [],
      isSelectMode: false,
      bulkDateThreshold: '',
    });
  };

  setBulkDateThreshold = (v: string) => {
    this.setState({ bulkDateThreshold: v, selectedIds: [] });
  };

  toggleLabels = () => {
    if (!this.state.isShowLabel) {
      localStorage.setItem(this.props.pipeline._id, 'true');
    } else {
      localStorage.removeItem(this.props.pipeline._id);
    }

    this.setState({ isShowLabel: !this.state.isShowLabel });
  };

  renderInvisibleItemInUrl = () => {
    const { queryParams, options } = this.props;
    const { itemId } = queryParams;
    const { isDragEnabled } = this.state;

    if (!isDragEnabled || !itemId) {
      return null;
    }

    const { itemIds } = this.state;

    if (itemIds.includes(itemId)) {
      return null;
    }

    return <InvisibleItemInUrl itemId={itemId} options={options} />;
  };

  render() {
    const { itemMap, stageLoadMap, stageIds, isShowLabel, stageSkipOffset } =
      this.state;

    return (
      <>
        <PipelineContext.Provider
          value={{
            options: this.props.options,
            onDragEnd: this.onDragEnd,
            onDragStart: this.onDragStart,
            onLoadStage: this.onLoadStage,
            onSlideStage: this.onSlideStage,
            getStageBufferInfo: this.getStageBufferInfo,
            scheduleStage: this.scheduleStage,
            refetchStage: this.refetchStage,
            onAddItem: this.onAddItem,
            onRemoveItem: this.onRemoveItem,
            onUpdateItem: this.onUpdateItem,
            synchSingleCard: this.synchSingleCard,
            itemMap,
            stageLoadMap,
            stageIds,
            isShowLabel,
            toggleLabels: this.toggleLabels,
            maxItemsPerStage: MAX_ITEMS_PER_STAGE,
            stageSkipOffset: stageSkipOffset || {},
            isSelectMode: this.state.isSelectMode,
            selectedIds: this.state.selectedIds,
            bulkDateThreshold: this.state.bulkDateThreshold,
            toggleSelectMode: this.toggleSelectMode,
            toggleItemSelect: this.toggleItemSelect,
            selectAllInStage: this.selectAllInStage,
            clearSelection: this.clearSelection,
            setBulkDateThreshold: this.setBulkDateThreshold,
          }}
        >
          {this.props.children}
          {this.renderInvisibleItemInUrl()}
        </PipelineContext.Provider>
      </>
    );
  }
}

export const PipelineProvider = withProps<WrapperProps>(
  compose(
    withApollo,
    graphql<Props, PipelineDetailQueryResponse>(gql(queries.pipelineDetail), {
      name: 'pipelineDetailQuery',
      options: ({ pipeline }) => ({
        variables: { _id: pipeline._id },
      }),
    }),
  )(PipelineProviderInner),
);
