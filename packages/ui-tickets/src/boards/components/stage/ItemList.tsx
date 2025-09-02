import * as routerUtils from "@erxes/ui/src/utils/router";

import { Draggable, Droppable } from "react-beautiful-dnd";
import {
  DropZone,
  EmptyContainer,
  ItemContainer,
  NotifiedContainer,
  Wrapper,
} from "../../styles/common";
import { IItem, IOptions } from "../../types";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import EmptyState from "@erxes/ui/src/components/EmptyState";
import Icon from "@erxes/ui/src/components/Icon";
import Item from "./Item";
import client from "@erxes/ui/src/apolloClient";
import dayjs from "dayjs";
import { gql } from "@apollo/client";
import { mutations } from "@erxes/ui-notifications/src/graphql";

type Props = {
  listId: string;
  stageId: string;
  stageAge?: number;
  items: IItem[];
  internalScroll?: boolean;
  style?: any;
  // may not be provided - and might be null
  ignoreContainerClipping?: boolean;
  options: IOptions;
  onRemoveItem: (itemId: string, stageId: string) => void;
};

type DraggableContainerProps = {
  stageId: string;
  stageAge?: number;
  item: IItem;
  index: number;
  options: IOptions;
  onRemoveItem: (itemId: string, stageId: string) => void;
};

function DraggableContainer(props: DraggableContainerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const itemIdQueryParam = routerUtils.getParam(location, "itemId");
  const { stageId, item, index, options, stageAge } = props;

  const [isDragDisabled, setIsDragDisabled] = useState<boolean>(
    Boolean(itemIdQueryParam)
  );
  const [hasNotified, setHasNotified] = useState(
    item.hasNotified === false ? false : true
  );
  const [currentItem, setCurrentItem] = useState(item);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  // item prop이 변경되면 currentItem도 업데이트
  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  // 마지막 단계에서 isComplete 자동 설정 - 실제 API 호출로 업데이트
  useEffect(() => {
    const checkAndAutoComplete = async () => {
      // stage 정보를 가져오기 위해 item.stage를 확인
      const stage = currentItem.stage;

      if (stage && stage.probability === 'Resolved' && currentItem.closeDate && !currentItem.isComplete && !isAutoCompleting) {
        console.log('ItemList: 마지막 단계에서 isComplete를 자동으로 true로 설정합니다:', currentItem._id);
        setIsAutoCompleting(true);

        try {
          // 실제 데이터베이스 업데이트를 위한 GraphQL mutation 호출
          const mutation = gql`
            mutation TicketsEdit($_id: String!, $isComplete: Boolean) {
              ticketsEdit(_id: $_id, isComplete: $isComplete) {
                _id
                isComplete
                closeDate
                stageId
                stage {
                  _id
                  probability
                }
              }
            }
          `;

          const result = await client.mutate({
            mutation,
            variables: {
              _id: currentItem._id,
              isComplete: true
            },
            // 캐시 업데이트 - 즉시 UI 반영
            update: (cache, { data }) => {
              console.log('ItemList: 캐시 업데이트 - isComplete 변경', data);
              
              // Apollo Client 캐시에서 현재 아이템의 참조 업데이트
              if (data && data.ticketsEdit) {
                try {
                  // 캐시에서 현재 아이템 직접 업데이트
                  cache.modify({
                    id: cache.identify({ __typename: 'Ticket', _id: currentItem._id }),
                    fields: {
                      isComplete: () => true
                    }
                  });
                  
                  console.log('ItemList: 캐시 직접 수정 완료');
                } catch (cacheError) {
                  console.log('ItemList: 캐시 직접 수정 실패, 전체 리프레시:', cacheError);
                  
                  // 캐시 직접 수정 실패 시 전체 리프레시
                  client.refetchQueries({
                    include: 'all'
                  });
                }
              }
            },
            // optimisticResponse로 즉시 UI 업데이트
            optimisticResponse: {
              ticketsEdit: {
                __typename: 'Ticket',
                _id: currentItem._id,
                isComplete: true,
                closeDate: currentItem.closeDate,
                stageId: currentItem.stageId,
                stage: currentItem.stage
              }
            }
          });

          console.log('ItemList: isComplete 업데이트 성공:', result.data.ticketsEdit);

          // 로컬 상태도 즉시 업데이트
          setCurrentItem(prevItem => ({
            ...prevItem,
            isComplete: true
          }));

          // 부모 컴포넌트들에게 변경사항 전파
          const updateEvent = new CustomEvent('forceStageUpdate', {
            detail: {
              stageId: currentItem.stageId,
              itemId: currentItem._id,
              isComplete: true
            }
          });
          window.dispatchEvent(updateEvent);

          // 전역적으로 모든 UI 컴포넌트 강제 업데이트
          setTimeout(() => {
            const globalUpdateEvent = new CustomEvent('globalTicketUpdate');
            window.dispatchEvent(globalUpdateEvent);
          }, 200);

        } catch (error) {
          console.error('ItemList: isComplete 업데이트 실패:', error);
        } finally {
          setIsAutoCompleting(false);
        }
      }
    };

    // 약간의 지연 후 실행하여 중복 호출 방지
    const timeoutId = setTimeout(checkAndAutoComplete, 500);

    return () => clearTimeout(timeoutId);
  }, [currentItem.stage, currentItem.closeDate, currentItem.isComplete, currentItem._id]);

  // ticketUpdated 이벤트 감지하여 실시간 업데이트
  useEffect(() => {
    const handleTicketUpdate = (event: CustomEvent) => {
      const { isComplete } = event.detail;
      
      console.log('ItemList: ticketUpdated 이벤트 감지, 모든 아이템 업데이트:', isComplete);
      
      // 현재 아이템의 isComplete 상태를 업데이트 (closeDate가 있는 경우)
      if (currentItem.closeDate) {
        setCurrentItem(prevItem => ({
          ...prevItem,
          isComplete: isComplete
        }));
        
        console.log('아이템 isComplete 상태 업데이트:', currentItem._id, isComplete);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('ticketUpdated', handleTicketUpdate as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('ticketUpdated', handleTicketUpdate as EventListener);
    };
  }, [currentItem._id, props.onRemoveItem]);

  const onClick = () => {
    setIsDragDisabled(true);

    routerUtils.setParams(navigate, location, { itemId: currentItem._id, key: "" });

    if (!hasNotified) {
      client.mutate({
        mutation: gql(mutations.markAsRead),
        variables: {
          contentTypeId: currentItem._id,
        },
      });
    }
  };

  const beforePopupClose = () => {
    const { onRemoveItem } = props;

    if (currentItem.status === "archived") {
      onRemoveItem(currentItem._id, currentItem.stageId);
    }

    setIsDragDisabled(false);
    setHasNotified(true);
  };

  const renderHasNotified = () => {
    if (hasNotified) {
      return null;
    }

    return (
      <NotifiedContainer>
        <Icon icon="bell" size={14} />
      </NotifiedContainer>
    );
  };

  const now = dayjs(new Date());
  const createdAt = dayjs(currentItem.createdAt);
  const isOld =
    !stageAge || stageAge <= 0 ? false : now.diff(createdAt, "day") > stageAge;

  return (
    <Draggable
      key={currentItem._id}
      draggableId={currentItem._id}
      index={index}
      isDragDisabled={isDragDisabled}
    >
      {(dragProvided, dragSnapshot) => (
        <ItemContainer
          $isDragging={dragSnapshot.isDragging}
          $isOld={isOld}
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
        >
          {renderHasNotified()}
          <Item
            key={currentItem._id}
            stageId={stageId}
            item={currentItem}
            onClick={onClick}
            beforePopupClose={beforePopupClose}
            options={options}
          />
        </ItemContainer>
      )}
    </Draggable>
  );
}

const DraggableContainerWithRouter = DraggableContainer;

class InnerItemList extends React.PureComponent<{
  stageId: string;
  stageAge?: number;
  items: IItem[];
  options: IOptions;
  onRemoveItem: (itemId: string, stageId: string) => void;
}> {
  render() {
    const { stageId, stageAge, items, options, onRemoveItem } = this.props;

    return items.map((item, index: number) => (
      <DraggableContainerWithRouter
        key={item._id}
        stageId={stageId}
        stageAge={stageAge}
        item={item}
        index={index}
        options={options}
        onRemoveItem={onRemoveItem}
      />
    ));
  }
}

type InnerListProps = {
  dropProvided;
  stageId: string;
  stageAge?: number;
  items: IItem[];
  options: IOptions;
  onRemoveItem: (itemId: string, stageId: string) => void;
};

class InnerList extends React.PureComponent<InnerListProps> {
  render() {
    const { stageId, stageAge, items, dropProvided, options, onRemoveItem } =
      this.props;

    if (items.length === 0) {
      return (
        <EmptyContainer ref={dropProvided.innerRef}>
          <EmptyState icon="postcard" text="No item" size="small" />
        </EmptyContainer>
      );
    }

    return (
      <DropZone ref={dropProvided.innerRef}>
        <InnerItemList
          onRemoveItem={onRemoveItem}
          stageId={stageId}
          stageAge={stageAge}
          items={items}
          options={options}
        />
        {dropProvided.placeholder}
      </DropZone>
    );
  }
}

export default class ItemList extends React.Component<Props> {
  static defaultProps = {
    listId: "LIST",
  };

  render() {
    const {
      ignoreContainerClipping,
      listId,
      style,
      stageId,
      stageAge,
      items,
      options,
      onRemoveItem,
    } = this.props;

    return (
      <Droppable
        droppableId={listId}
        ignoreContainerClipping={ignoreContainerClipping}
      >
        {(dropProvided, dropSnapshot) => (
          <Wrapper
            style={style}
            $isDraggingOver={dropSnapshot.isDraggingOver}
            {...dropProvided.droppableProps}
          >
            <InnerList
              onRemoveItem={onRemoveItem}
              stageId={stageId}
              stageAge={stageAge}
              items={items}
              dropProvided={dropProvided}
              options={options}
            />
            {dropProvided.placeholder}
          </Wrapper>
        )}
      </Droppable>
    );
  }
}
