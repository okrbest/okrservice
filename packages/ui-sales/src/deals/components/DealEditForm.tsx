import {
  EditFormContent,
  FormScrollBody,
  LeftSide,
  RightDetailSide,
  RightSide,
  MobileEditFormWrapper,
  MobileTabBar,
  MobileTab,
  MobileContent,
} from "../styles";
import { IDeal, IDealParams } from "../types";
import { IEditFormContent, IItem, IOptions } from "../../boards/types";
import { TabTitle, Tabs } from "@erxes/ui/src/components/tabs";
import {
  __,
  loadDynamicComponent,
  router as routerUtils,
} from "@erxes/ui/src/utils";

import ActivityLogs from "@erxes/ui-log/src/activityLogs/containers/ActivityLogs";
import CommonActions from "../../boards/components/editForm/CommonActions";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormGroup from "@erxes/ui/src/components/form/Group";
import SelectBranches from "@erxes/ui/src/team/containers/SelectBranches";
import SelectDepartments from "@erxes/ui/src/team/containers/SelectDepartments";
import SelectTeamMembers from "@erxes/ui/src/team/containers/SelectTeamMembers";
import CustomFieldsSection from "../../boards/containers/editForm/CustomFieldsSection";
import CustomerDateFields from "./CustomerDateFields";
import EditForm from "../../boards/components/editForm/EditForm";
import FullEditForm from "./FullEditForm";
import { HeaderContentSmall } from "../../boards/styles/item";
import { IUser } from "@erxes/ui/src/auth/types";
import Icon from "@erxes/ui/src/components/Icon";
import PortablePurchase from "@erxes/ui-purchases/src/purchases/components/PortablePurchases";
import PortableTasks from "@erxes/ui-tasks/src/tasks/components/PortableTasks";
import PortableTickets from "@erxes/ui-tickets/src/tickets/components/PortableTickets";
import ProductSectionComponent from "./product/ProductSectionComponent";
import React from "react";
import SidebarConformity from "../../boards/components/editForm/SidebarConformity";
import Top from "../../boards/components/editForm/Top";
import { isEnabled } from "@erxes/ui/src/utils/core";
import { useIsMobile } from "../../boards/utils/mobile";

type Props = {
  options: IOptions;
  item: IDeal;
  addItem: (doc: IDealParams, callback: () => void) => void;
  saveItem: (doc: IDealParams, callback?: (item) => void) => void;
  copyItem: (itemId: string, callback: () => void) => void;
  onUpdate: (item, prevStageId?: string) => void;
  removeItem: (itemId: string, callback?: () => void) => void;
  beforePopupClose: (afterPopupClose?: () => void) => void;
  sendToBoard?: (item: any) => void;
  synchSingleCard?: (itemId: string) => void;
  updateTimeTrack: (
    {
      _id,
      status,
      timeSpent,
    }: { _id: string; status: string; timeSpent: number; startDate?: string },
    callback?: () => void
  ) => void;
  isPopupVisible?: boolean;
  currentUser: IUser;
  isMobile?: boolean;
};

type State = {
  amount: any;
  unUsedAmount: any;
  changePayData: { [currency: string]: number };
  updatedItem?: IItem;
  refresh: boolean;
  currentTab: string;
};

class DealEditForm extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    const item = props.item;

    this.state = {
      amount: item.amount || {},
      unUsedAmount: item.unUsedAmount || {},
      changePayData: {},
      refresh: false,
      currentTab: "overview",
    };
  }

  amountHelper = (title, amount) => {
    if (Object.keys(amount || {}).length === 0) {
      return null;
    }

    return (
      <HeaderContentSmall>
        <ControlLabel>{__(title)}</ControlLabel>
        {Object.keys(amount || {}).map(key => (
          <p key={key}>
            {amount[key].toLocaleString()} {key}
          </p>
        ))}
      </HeaderContentSmall>
    );
  };

  renderAmount = () => {
    const { amount, unUsedAmount } = this.state;
    return (
      <>
        {this.amountHelper("Un used Amount", unUsedAmount)}
        {this.amountHelper("Amount", amount)}
      </>
    );
  };

  onChangeRefresh = () => {
    this.setState({
      refresh: !this.state.refresh,
    });
  };

  tabOnClick = (currentTab: string) => {
    this.setState({ currentTab });
  };

  beforePopupClose = (afterPopupClose?: () => void) => {
    const { updatedItem } = this.state;
    const { onUpdate, beforePopupClose } = this.props;

    if (beforePopupClose) {
      beforePopupClose(() => {
        if (updatedItem && onUpdate) {
          onUpdate(updatedItem);
        }

        if (afterPopupClose) {
          afterPopupClose();
        }
      });
    }
  };

  renderProductSection = () => {
    return (
      <ProductSectionComponent
        item={this.props.item}
        saveItem={this.props.saveItem}
      />
    );
  };

  renderItems = () => {
    const { item } = this.props;

    return (
      <>
        {isEnabled("tickets") && (
          <PortableTickets mainType="deal" mainTypeId={item._id} />
        )}
        {isEnabled("tasks") && (
          <PortableTasks mainType="deal" mainTypeId={item._id} />
        )}

        {isEnabled("purchases") && (
          <PortablePurchase mainType="deal" mainTypeId={item._id} />
        )}
      </>
    );
  };

  renderDetail = saveItem => {
    const { item, options, currentUser } = this.props;
    const userOnChange = usrs => saveItem({ assignedUserIds: usrs });
    const onChangeStructure = (values, name) => saveItem({ [name]: values });
    const assignedUserIds = (item.assignedUsers || []).map(user => user._id);
    const branchIds = currentUser?.branchIds;
    const departmentIds = currentUser?.departmentIds;

    return (
      <>
        <FormGroup>
          <ControlLabel uppercase={true}>{__("Assigned to")}</ControlLabel>
          <SelectTeamMembers
            label={__("Choose users")}
            name="assignedUserIds"
            initialValue={assignedUserIds}
            onSelect={userOnChange}
            filterParams={{
              isAssignee: true,
              departmentIds,
              branchIds,
            }}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel uppercase={true}>{__("Branches")}</ControlLabel>
          <SelectBranches
            name="branchIds"
            label={__("Choose branches")}
            initialValue={item?.branchIds}
            onSelect={onChangeStructure}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel uppercase={true}>{__("Departments")}</ControlLabel>
          <SelectDepartments
            name="departmentIds"
            label={__("Choose departments")}
            onSelect={onChangeStructure}
            initialValue={item?.departmentIds}
          />
        </FormGroup>
        <SidebarConformity
          options={options}
          item={item}
          saveItem={saveItem}
          renderItems={this.renderItems}
        />

        {loadDynamicComponent(
          "dealRightSidebarSection",
          {
            id: item._id,
            mainType: "deal",
            mainTypeId: item._id,
            object: item,
          },
          true
        )}
      </>
    );
  };

  renderProperties = () => {
    const { item, options } = this.props;

    return <CustomFieldsSection item={item} options={options} />;
  };

  renderActivity = () => {
    const { item, options } = this.props;

    return (
      <>
        <ActivityLogs
          target={item.name}
          contentId={item._id}
          contentType={`sales:${options.type}`}
          extraTabs={
            options.type === "tasks:task" && isEnabled("tasks")
              ? []
              : [{ name: "tasks:task", label: "Task" }]
          }
        />
      </>
    );
  };

  renderTabContent = props => {
    const { currentTab } = this.state;

    switch (currentTab) {
      case "overview":
        return this.renderOverview(props);
      case "detail":
        return this.renderDetail(props.saveItem);
      case "product":
        return this.renderProductSection();
      case "properties":
        return this.renderProperties();
      case "activity":
        return this.renderActivity();
      default:
        return null;
    }
  };

  renderOverview = ({ saveItem, onChangeStage, copy, remove }) => {
    const { item, options, onUpdate, sendToBoard, addItem, currentUser, isMobile } =
      this.props;

    return (
      <>
        <Top
          options={options}
          amount={this.renderAmount}
          stageId={item.stageId}
          item={item}
          saveItem={saveItem}
          onUpdate={onUpdate}
          onChangeStage={onChangeStage}
        />
        <CustomFieldsSection item={item} options={options} showType="list" hideGroupSidebar={true} compact={true} />
        <CommonActions
          options={options}
          saveItem={saveItem}
          copyItem={copy}
          removeItem={remove}
          onUpdate={onUpdate}
          sendToBoard={sendToBoard}
          item={item}
          synchSingleCard={this.props.synchSingleCard}
          addItem={addItem}
          onChangeStage={onChangeStage}
          onChangeRefresh={this.onChangeRefresh}
          currentUser={currentUser}
          hideAssignmentFields={true}
        />
        {/* 모바일은 오른쪽 사이드바 없음 → 한 스크롤에 Detail까지 포함 */}
        {isMobile && this.renderDetail(saveItem)}
      </>
    );
  };

  renderFormContent = ({
    saveItem,
    onChangeStage,
    copy,
    remove,
  }: IEditFormContent) => {
    const {
      item,
      currentUser,
      options,
      onUpdate,
      addItem,
      sendToBoard,
      updateTimeTrack,
      isMobile,
    } = this.props;
    const { currentTab } = this.state;
    const isFullQueryParam = routerUtils.getParam(location, "isFull");

    if (isFullQueryParam === "true") {
      return (
        <FullEditForm
          options={options}
          saveItem={saveItem}
          copy={copy}
          remove={remove}
          onUpdate={onUpdate}
          sendToBoard={sendToBoard}
          item={item}
          addItem={addItem}
          updateTimeTrack={updateTimeTrack}
          amount={this.renderAmount}
          onChangeStage={onChangeStage}
          onChangeRefresh={this.onChangeRefresh}
          renderItems={this.renderItems}
          currentUser={currentUser}
        />
      );
    }

    if (isMobile) {
      const tabs = [
        { id: "overview", label: __("Overview"), icon: "newspaper" },
        { id: "product", label: __("Products"), icon: "bar-chart" },
        { id: "properties", label: __("Properties"), icon: "settings" },
        { id: "activity", label: __("Activity"), icon: "graph-bar" },
      ];
      return (
        <MobileEditFormWrapper>
          <MobileTabBar>
            {tabs.map((tab) => (
              <MobileTab
                key={tab.id}
                $active={currentTab === tab.id}
                onClick={() => this.tabOnClick(tab.id)}
              >
                <Icon size={14} icon={tab.icon} />
                {" "}
                {tab.label}
              </MobileTab>
            ))}
          </MobileTabBar>
          <MobileContent>
            {this.renderTabContent({ saveItem, onChangeStage, copy, remove })}
          </MobileContent>
        </MobileEditFormWrapper>
      );
    }

    return (
      <EditFormContent>
        <FormScrollBody>
          <LeftSide>
            {this.renderTabContent({ saveItem, onChangeStage, copy, remove })}
          </LeftSide>
          <RightDetailSide>
            {this.renderDetail(saveItem)}
          </RightDetailSide>
        </FormScrollBody>
        <RightSide>
          <Tabs direction="vertical">
            <TabTitle
              direction="vertical"
              className={currentTab === "overview" ? "active" : ""}
              onClick={this.tabOnClick.bind(this, "overview")}
            >
              <Icon size={16} icon={"newspaper"} />
              {__("Overview")}
            </TabTitle>
            <TabTitle
              direction="vertical"
              className={currentTab === "product" ? "active" : ""}
              onClick={this.tabOnClick.bind(this, "product")}
            >
              <Icon size={16} icon={"bar-chart"} />
              {__("Products")}
            </TabTitle>
            <TabTitle
              direction="vertical"
              className={currentTab === "properties" ? "active" : ""}
              onClick={this.tabOnClick.bind(this, "properties")}
            >
              <Icon size={16} icon={"settings"} />
              {__("Properties")}
            </TabTitle>
            <TabTitle
              direction="vertical"
              className={currentTab === "activity" ? "active" : ""}
              onClick={this.tabOnClick.bind(this, "activity")}
            >
              <Icon size={16} icon={"graph-bar"} />
              {__("Activity")}
            </TabTitle>
          </Tabs>
        </RightSide>
      </EditFormContent>
    );
  };

  render() {
    const extendedProps = {
      ...this.props,
      sidebar: this.renderProductSection,
      formContent: this.renderFormContent,
      beforePopupClose: this.beforePopupClose,
      refresh: this.state.refresh,
    };

    return <EditForm {...extendedProps} />;
  }
}

function DealEditFormWithMobile(props: Omit<Props, "isMobile">) {
  const isMobile = useIsMobile();
  return <DealEditForm {...props} isMobile={isMobile} />;
}

export { DealEditForm, DealEditFormWithMobile };
export default DealEditFormWithMobile;
