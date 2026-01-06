import {
  ActionButton,
  ActionList,
  AddNew,
  Body,
  Container,
  Divider,
  Header,
  Indicator,
  IndicatorItem,
  LoadingContent,
  StageFooter,
  StageRoot,
  StageTitle
} from "../../styles/stage";
import { IItem, IOptions, IStage } from "../../types";
import { __ } from "coreui/utils";
import { isEnabled } from "@erxes/ui/src/utils/core";

import { AddForm } from "../../containers/portable";
import { Draggable } from "react-beautiful-dnd";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import Icon from "@erxes/ui/src/components/Icon";
import ItemList from "../stage/ItemList";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import Popover from "@erxes/ui/src/components/Popover";
import React from "react";
import StageModal from "./StageModal";

type Props = {
  loadingItems: () => boolean;
  removeStage: (stageId: string) => void;
  index: number;
  stage: IStage;
  length: number;
  items: any[];
  onAddItem: (stageId: string, item: IItem) => void;
  onRemoveItem: (itemId: string, stageId: string) => void;
  loadMore: () => void;
  options: IOptions;
  archiveItems: () => void;
  archiveList: () => void;
  sortItems: (type: string, description: string) => void;
};

type State = {
  showSortOptions: boolean;
  renderModal: boolean;
  items: any[];
};

export default class Stage extends React.Component<Props, State> {
  private bodyRef;
  private overlayTrigger;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private cleanupScrollHandler: ((e: Event) => void) | null = null;

  constructor(props: Props) {
    super(props);
    this.bodyRef = React.createRef();

    this.state = {
      showSortOptions: false,
      renderModal: false,
      items: []
    };
  }

  componentDidMount() {
    // setInterval 대신 IntersectionObserver나 스크롤 이벤트 사용 (더 효율적)
    const checkAndLoadMore = () => {
      if (this.props.loadingItems()) {
        return;
      }

      const { current } = this.bodyRef;

      if (!current) {
        return;
      }

      const isScrolled = current.scrollHeight > current.clientHeight;

      if (isScrolled) {
        return;
      }

      const { items, stage } = this.props;

      if (items.length < stage.itemsTotalCount) {
        this.props.loadMore();
      }
    };

    // 초기 체크는 한 번만 수행
    const timeoutId = setTimeout(checkAndLoadMore, 500);

    // 스크롤 이벤트로 대체 (더 효율적)
    const handleScroll = (e: Event) => {
      checkAndLoadMore();
    };

    if (this.bodyRef.current) {
      this.bodyRef.current.addEventListener('scroll', handleScroll);
    }

    window.addEventListener("storageChange", this.handleStorageChange);
    window.addEventListener("ticketUpdated", this.handleTicketUpdate);
    window.addEventListener("forceStageUpdate", this.handleForceStageUpdate);
    window.addEventListener("globalTicketUpdate", this.handleGlobalUpdate);
    
    // 마지막 단계에서 closeDate가 설정된 아이템들의 isComplete 자동 설정
    this.checkAndUpdateCompleteStatus();

    // cleanup 함수 저장
    this.cleanupTimeout = timeoutId;
    this.cleanupScrollHandler = handleScroll;
  }

  componentDidUpdate(prevProps: Props) {
    const { items, stage } = this.props;
    const { items: prevItems, stage: prevStage } = prevProps;
    
    // items나 stage의 참조나 주요 필드 변경 확인 (JSON.stringify 제거)
    const itemsChanged = items !== prevItems || 
      items.length !== prevItems.length ||
      (items.length > 0 && items.some((item, idx) => 
        item._id !== prevItems[idx]?._id || 
        item.isComplete !== prevItems[idx]?.isComplete ||
        item.closeDate !== prevItems[idx]?.closeDate
      ));
    
    const stageChanged = stage !== prevStage || 
      stage._id !== prevStage._id ||
      stage.probability !== prevStage.probability;
    
    if (itemsChanged || stageChanged) {
      this.checkAndUpdateCompleteStatus();
    }
  }

  componentWillUnmount() {
    // cleanup 타이머
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }

    // cleanup 스크롤 이벤트 리스너
    if (this.cleanupScrollHandler && this.bodyRef.current) {
      this.bodyRef.current.removeEventListener('scroll', this.cleanupScrollHandler);
    }

    window.removeEventListener("storageChange", this.handleStorageChange);
    window.removeEventListener("ticketUpdated", this.handleTicketUpdate);
    window.removeEventListener("forceStageUpdate", this.handleForceStageUpdate);
    window.removeEventListener("globalTicketUpdate", this.handleGlobalUpdate);
  }

  handleStorageChange = () => {
    // forceUpdate 대신 setState 사용
    this.setState({});
  };

  handleTicketUpdate = (event: CustomEvent) => {
    const { stageId, itemId } = event.detail || {};
    
    // 현재 스테이지와 관련된 업데이트인 경우에만 업데이트
    const { stage, items } = this.props;
    const isRelevantUpdate = !stageId || stageId === stage._id || 
      items.some(item => item._id === itemId);
    
    if (isRelevantUpdate) {
      // forceUpdate 대신 setState로 선택적 업데이트
      this.setState({}, () => {
        if (this.props.loadMore) {
          this.props.loadMore();
        }
      });
    }
  };

  handleForceStageUpdate = (event: CustomEvent) => {
    const { stageId } = event.detail || {};
    
    // 현재 스테이지와 관련된 업데이트인 경우에만 업데이트
    if (stageId === this.props.stage._id) {
      // forceUpdate 대신 setState 사용
      this.setState({});
    }
  };

  handleGlobalUpdate = () => {
    // forceUpdate 대신 setState로 선택적 업데이트
    this.setState({}, () => {
      if (this.props.loadMore) {
        this.props.loadMore();
      }
    });
  };

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const { stage, index, length, items, loadingItems } = this.props;
    const { showSortOptions, renderModal } = this.state;

    // 상태 변경 확인
    if (
      showSortOptions !== nextState.showSortOptions ||
      renderModal !== nextState.renderModal
    ) {
      return true;
    }

    // 프롭 변경 확인
    if (
      index !== nextProps.index ||
      length !== nextProps.length ||
      loadingItems() !== nextProps.loadingItems()
    ) {
      return true;
    }

    // stage 객체 참조 및 주요 필드 변경 확인 (JSON.stringify 대신 얕은 비교)
    if (stage !== nextProps.stage) {
      // 참조가 다르면 주요 필드만 비교
      if (
        stage._id !== nextProps.stage._id ||
        stage.name !== nextProps.stage.name ||
        stage.itemsTotalCount !== nextProps.stage.itemsTotalCount ||
        stage.probability !== nextProps.stage.probability ||
        stage.age !== nextProps.stage.age
      ) {
        return true;
      }
    }

    // items 배열 참조 및 길이 변경 확인
    if (items !== nextProps.items) {
      // 배열 길이 확인
      if (items.length !== nextProps.items.length) {
        return true;
      }

      // 각 아이템의 참조 또는 주요 필드 변경 확인
      if (items.length > 0 && items.length <= 100) {
        // 아이템이 많지 않은 경우에만 개별 비교 (성능 최적화)
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const nextItem = nextProps.items[i];
          
          if (item !== nextItem) {
            // 주요 필드만 비교
            if (
              item._id !== nextItem._id ||
              item.name !== nextItem.name ||
              item.isComplete !== nextItem.isComplete ||
              item.status !== nextItem.status ||
              item.closeDate !== nextItem.closeDate ||
              item.stageId !== nextItem.stageId
            ) {
              return true;
            }
          }
        }
      } else if (items.length > 100) {
        // 아이템이 많은 경우 참조만 확인하고 항상 업데이트 허용
        // (실제 변경 감지는 React의 내부 최적화에 의존)
        return true;
      }
    }

    return false;
  }

  // 마지막 단계에서 closeDate가 설정된 아이템들의 isComplete 자동 설정
  checkAndUpdateCompleteStatus = () => {
    const { stage, items, options } = this.props;
    
    // probability가 'Resolved'인 경우 마지막 단계로 간주
    const isLastStage = stage?.probability === 'Resolved';
    
    if (!isLastStage) {
      return;
    }

    // closeDate가 설정되어 있지만 isComplete가 false인 아이템들 찾기
    const itemsToUpdate = items.filter(item => 
      item.closeDate && !item.isComplete
    );

    if (itemsToUpdate.length > 0) {
      console.log('Stage: 마지막 단계에서 자동으로 isComplete를 true로 설정할 아이템들:', itemsToUpdate.length);
      
      // 각 아이템에 대해 isComplete를 true로 설정
      itemsToUpdate.forEach(item => {
        // options.onUpdateItem이 있다면 사용, 없다면 직접 상태 업데이트
        if (options.onUpdateItem) {
          options.onUpdateItem({ ...item, isComplete: true });
        }
      });
    }
  }

  onClosePopover = () => {
    this.overlayTrigger.hide();
  };

  toggleSortOptions = () => {
    const { showSortOptions } = this.state;

    this.setState({ showSortOptions: !showSortOptions });
  };

  toggleModal = () => {
    this.setState(prevState => ({
      renderModal: !prevState.renderModal
    }));
    this.onClosePopover();
  };

  renderPopover() {
    const { stage, options } = this.props;
    const { showSortOptions } = this.state;
    const archiveList = () => {
      this.props.archiveList();
      this.onClosePopover();
    };

    const archiveItems = () => {
      this.props.archiveItems();
      this.onClosePopover();
    };

    const removeStage = () => {
      this.props.removeStage(stage._id);
      this.onClosePopover();
    };

    return (
      <ActionList>
        {showSortOptions ? (
          this.renderSortOptions()
        ) : (
          <>
            <li onClick={archiveItems} key="archive-items">
              {__("Archive All Cards in This List")}
            </li>
            <li onClick={archiveList} key="archive-list">
              {__("Archive This List")}
            </li>
            <li onClick={removeStage} key="remove-stage">
              {__("Remove stage")}
            </li>
            <Divider />
            <li onClick={this.toggleSortOptions}>{__("Sort By")}</li>
            {isEnabled("documents") && options.type === "deal" && (
              <li>
                <a onClick={this.toggleModal}>{__("Print document")}</a>
              </li>
            )}
          </>
        )}
      </ActionList>
    );
  }

  renderCtrl() {
    return (
      <Popover
        placement="bottom"
        trigger={
          <ActionButton>
            <Icon icon="ellipsis-h" />
          </ActionButton>
        }
      >
        {this.renderPopover()}
      </Popover>
    );
  }

  renderSortOptions() {
    const { showSortOptions } = this.state;

    if (!showSortOptions) {
      return null;
    }

    const sortItems = (type: string, description: string) => {
      this.props.sortItems(type, description);
      this.onClosePopover();
    };

    return (
      <>
        <li onClick={this.toggleSortOptions}>Back</li>

        <Divider />

        <li
          onClick={sortItems.bind(
            this,
            "created-desc",
            "date created (newest first)"
          )}
        >
          Date created (Newest first)
        </li>
        <li
          onClick={sortItems.bind(
            this,
            "created-asc",
            "date created (oldest first)"
          )}
        >
          Date created (Oldest first)
        </li>
        <li
          onClick={sortItems.bind(
            this,
            "modified-desc",
            "date modified (newest first)"
          )}
        >
          Date modified (Newest first)
        </li>
        <li
          onClick={sortItems.bind(
            this,
            "modified-asc",
            "date modified (oldest first)"
          )}
        >
          Date modified (Oldest first)
        </li>
        <li
          onClick={sortItems.bind(
            this,
            "close-asc",
            "date assigned (Earliest first)"
          )}
        >
          Date assigned (Earliest first)
        </li>
        <li
          onClick={sortItems.bind(
            this,
            "close-desc",
            "date assigned (Latest first)"
          )}
        >
          Date assigned (Latest first)
        </li>
        <li
          onClick={sortItems.bind(this, "alphabetically-asc", "alphabetically")}
        >
          Alphabetically
        </li>
      </>
    );
  }

  onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom =
      Math.floor(target.scrollHeight - target.scrollTop) <= target.clientHeight;

    if (bottom) {
      this.props.loadMore();
    }
  };

  renderAddItemTrigger() {
    const { options, stage, onAddItem } = this.props;
    const addText = options.texts.addText;

    const trigger = (
      <StageFooter>
        <AddNew>
          <Icon icon="plus-1" />
          {__(addText)}
        </AddNew>
      </StageFooter>
    );

    const formProps = {
      options,
      showSelect: false,
      callback: (item: IItem) => onAddItem(stage._id, item),
      stageId: stage._id,
      pipelineId: stage.pipelineId,
      aboveItemId: ""
    };

    const content = props => <AddForm {...props} {...formProps} />;

    return <ModalTrigger title={addText} trigger={trigger} content={content} />;
  }

  renderIndicator() {
    const index = this.props.index || 0;
    const length = this.props.length || 0;

    const data: any = [];

    for (let i = 0; i < length; i++) {
      data.push(<IndicatorItem $isPass={index >= i} key={i} />);
    }

    return data;
  }

  renderItemList() {
    const { stage, items, loadingItems, options, onRemoveItem } = this.props;

    if (loadingItems()) {
      return (
        <LoadingContent>
          <img alt="Loading" src="/images/loading-content.gif" />
        </LoadingContent>
      );
    }

    return (
      <ItemList
        listId={stage._id}
        stageId={stage._id}
        stageAge={stage.age}
        items={items}
        options={options}
        onRemoveItem={onRemoveItem}
      />
    );
  }

  renderTriggerModal() {
    return this.state.renderModal ? (
      <StageModal
        item={this.props.items}
        toggleModal={this.toggleModal}
        stage={this.props.stage}
      />
    ) : null;
  }

  render() {
    const { index, stage } = this.props;

    if (!stage) {
      return <EmptyState icon="columns-1" text="No stage" size="small" />;
    }

    return (
      <Draggable draggableId={stage._id} index={index}>
        {(provided, snapshot) => (
          <Container
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <StageRoot $isDragging={snapshot.isDragging}>
              <Header {...provided.dragHandleProps}>
                <StageTitle>
                  <div>
                    {stage.name}
                    <span>{stage.itemsTotalCount}</span>
                  </div>
                  {this.renderCtrl()}
                </StageTitle>

                <Indicator>{this.renderIndicator()}</Indicator>
              </Header>
              <Body ref={this.bodyRef} onScroll={this.onScroll}>
                {this.renderItemList()}
                {this.renderTriggerModal()}
              </Body>
              {this.renderAddItemTrigger()}
            </StageRoot>
          </Container>
        )}
      </Draggable>
    );
  }
}
