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
    const handle = setInterval(() => {
      if (this.props.loadingItems()) {
        return;
      }

      const { current } = this.bodyRef;

      if (!current) {
        return;
      }

      const isScrolled = current.scrollHeight > current.clientHeight;

      if (isScrolled) {
        return clearInterval(handle);
      }

      const { items, stage } = this.props;

      if (items.length < stage.itemsTotalCount) {
        return this.props.loadMore();
      } else {
        return clearInterval(handle);
      }
    }, 1000);

    window.addEventListener("storageChange", this.handleStorageChange);
    window.addEventListener("ticketUpdated", this.handleTicketUpdate);
    window.addEventListener("forceStageUpdate", this.handleForceStageUpdate);
    window.addEventListener("globalTicketUpdate", this.handleGlobalUpdate);
    
    // 마지막 단계에서 closeDate가 설정된 아이템들의 isComplete 자동 설정
    this.checkAndUpdateCompleteStatus();
  }

  componentDidUpdate(prevProps: Props) {
    const { items, stage } = this.props;
    const { items: prevItems, stage: prevStage } = prevProps;
    
    // items나 stage가 변경되었을 때만 체크
    if (JSON.stringify(items) !== JSON.stringify(prevItems) || 
        JSON.stringify(stage) !== JSON.stringify(prevStage)) {
      this.checkAndUpdateCompleteStatus();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("storageChange", this.handleStorageChange);
    window.removeEventListener("ticketUpdated", this.handleTicketUpdate);
    window.removeEventListener("forceStageUpdate", this.handleForceStageUpdate);
    window.removeEventListener("globalTicketUpdate", this.handleGlobalUpdate);
  }

  handleStorageChange = () => {
    this.forceUpdate();
  };

  handleTicketUpdate = (event: CustomEvent) => {
    console.log('Stage: ticketUpdated 이벤트 수신:', event.detail);
    
    // 스테이지의 아이템들 중 마지막 단계인 것들을 강제로 업데이트
    this.forceUpdate();
    
    // 부모 컴포넌트에도 리프레시 요청
    if (this.props.loadMore) {
      setTimeout(() => {
        this.props.loadMore();
      }, 100);
    }
  };

  handleForceStageUpdate = (event: CustomEvent) => {
    const { stageId, itemId, isComplete } = event.detail;
    console.log('Stage: forceStageUpdate 이벤트 수신:', { stageId, itemId, isComplete });
    
    // 현재 스테이지와 관련된 업데이트인 경우 강제 업데이트
    if (stageId === this.props.stage._id) {
      console.log('Stage: 현재 스테이지 업데이트, 강제 리렌더링');
      this.forceUpdate();
    }
  };

  handleGlobalUpdate = () => {
    console.log('Stage: globalTicketUpdate 이벤트 수신, 강제 업데이트');
    this.forceUpdate();
    
    // 부모 컴포넌트에도 리프레시 요청
    if (this.props.loadMore) {
      this.props.loadMore();
    }
  };

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    const { stage, index, length, items, loadingItems } = this.props;
    const { showSortOptions, renderModal } = this.state;

    if (
      showSortOptions !== nextState.showSortOptions ||
      renderModal !== nextState.renderModal ||
      index !== nextProps.index ||
      loadingItems() !== nextProps.loadingItems() ||
      length !== nextProps.length ||
      JSON.stringify(stage) !== JSON.stringify(nextProps.stage) ||
      JSON.stringify(items) !== JSON.stringify(nextProps.items)
    ) {
      return true;
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
