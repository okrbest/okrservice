import { IEditFormContent, IItem, IOptions } from "../../boards/types";
import { IPaymentsData, IPurchase, IPurchaseParams } from "../types";
import { __ } from "coreui/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils";

import ChildrenSection from "../../boards/containers/editForm/ChildrenSection";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import EditForm from "../../boards/components/editForm/EditForm";
import { Flex } from "@erxes/ui/src/styles/main";
import { HeaderContentSmall } from "../../boards/styles/item";
import { IProduct } from "@erxes/ui-products/src/types";
import { IUser } from "@erxes/ui/src/auth/types";
import Left from "../../boards/components/editForm/Left";
import ProductSection from "./ProductSection";
import React from "react";
import Sidebar from "../../boards/components/editForm/Sidebar";
import Top from "../../boards/components/editForm/Top";
import queryString from "query-string";
import PortableTickets from "@erxes/ui-tickets/src/tickets/components/PortableTickets";
import PortableTasks from "@erxes/ui-tasks/src/tasks/components/PortableTasks";
import { isEnabled } from "@erxes/ui/src/utils/core";
import PortableDeals from "@erxes/ui-sales/src/deals/components/PortableDeals";

type Props = {
  options: IOptions;
  item: IPurchase;
  addItem: (doc: IPurchaseParams, callback: () => void) => void;
  saveItem: (doc: IPurchaseParams, callback?: (item) => void) => void;
  copyItem: (itemId: string, callback: () => void) => void;
  onUpdate: (item, prevStageId?: string) => void;
  removeItem: (itemId: string, callback: () => void) => void;
  beforePopupClose: (afterPopupClose?: () => void) => void;
  sendToBoard?: (item: any) => void;
  updateTimeTrack: (
    {
      _id,
      status,
      timeSpent,
    }: { _id: string; status: string; timeSpent: number; startDate?: string },
    callback?: () => void
  ) => void;
  currentUser: IUser;
};

type State = {
  amount: any;
  unUsedAmount: any;
  products: (IProduct & { quantity?: number })[];
  productsData: any;
  paymentsData: IPaymentsData;
  expensesData: any;
  changePayData: IPaymentsData;
  updatedItem?: IItem;
  refresh: boolean;
};

export default class PurchaseEditForm extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    const item = props.item;

    this.state = {
      amount: item.amount || {},
      unUsedAmount: item.unUsedAmount || {},
      productsData: item.products ? item.products.map((p) => ({ ...p })) : [],
      // collecting data for ItemCounter component
      products: item.products
        ? item.products.map((p) => {
            let newP = { ...p.product, quantity: p?.quantity };
            if (p.product.uom !== p.uom) {
              let subUoms = Array.from(
                new Set([
                  ...(p.product.subUoms || []),
                  { uom: p.product.uom, ratio: 1 },
                ])
              );
              newP = { ...newP, uom: p?.uom, subUoms };
            }

            return newP;
          })
        : [],
      paymentsData: item.paymentsData,
      expensesData: item.expensesData,
      changePayData: {},
      refresh: false,
    };
  }

  amountHelper = (title, amount) => {
    if (Object.keys(amount).length === 0) {
      return null;
    }

    return (
      <HeaderContentSmall>
        <ControlLabel>{__(title)}</ControlLabel>
        {Object.keys(amount).map((key) => (
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

  onChangeField = <T extends keyof State>(name: T, value: State[T]) => {
    this.setState({ [name]: value } as Pick<State, keyof State>);
  };

  onChangeRefresh = () => {
    this.setState({
      refresh: !this.state.refresh,
    });
  };

  saveProductsData = () => {
    const { productsData, paymentsData, expensesData } = this.state;
    const { saveItem } = this.props;
    const products: IProduct[] = [];
    const amount: any = {};
    const unUsedAmount: any = {};
    const filteredProductsData: any = [];
    productsData.forEach((data) => {
      // products
      if (data.product) {
        if (data.currency) {
          if (data.tickUsed) {
            if (!amount[data.currency]) {
              amount[data.currency] = data.amount || 0;
            } else {
              amount[data.currency] += data.amount || 0;
            }
          } else {
            if (!unUsedAmount[data.currency]) {
              unUsedAmount[data.currency] = data.amount || 0;
            } else {
              unUsedAmount[data.currency] += data.amount || 0;
            }
          }
        }
        // collecting data for ItemCounter component
        products.push(data.product);
        data.productId = data.product._id;
        filteredProductsData.push(data);
      }
    });

    Object.keys(paymentsData || {}).forEach((key) => {
      const perData = paymentsData[key];

      if (!perData.currency || !perData.amount || perData.amount === 0) {
        delete paymentsData[key];
      }
    });

    this.setState(
      {
        productsData: filteredProductsData,
        products,
        amount,
        unUsedAmount,
        paymentsData,
        expensesData,
      },
      () => {
        saveItem(
          { productsData, paymentsData, expensesData },
          (updatedItem) => {
            this.setState({ updatedItem });
          }
        );
      }
    );
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
    const { products, productsData, paymentsData, expensesData } = this.state;

    const pDataChange = (pData) => {
      this.onChangeField("productsData", pData);
    };
    const prsChange = (prs) => this.onChangeField("products", prs);
    const expDataChange = (expData) =>
      this.onChangeField("expensesData", expData);
    const payDataChange = (payData) =>
      this.onChangeField("paymentsData", payData);

    return (
      <ProductSection
        onChangeProductsData={pDataChange}
        onchangeExpensesData={expDataChange}
        onChangeProducts={prsChange}
        onChangePaymentsData={payDataChange}
        productsData={productsData}
        paymentsData={paymentsData}
        expensesData={expensesData}
        products={products}
        saveProductsData={this.saveProductsData}
        purchaseQuery={this.props.item}
      />
    );
  };

  renderChildrenSection = () => {
    const { item, options } = this.props;

    const updatedProps = {
      ...this.props,
      type: "purchase",
      itemId: item._id,
      stageId: item.stageId,
      pipelineId: item.pipeline._id,
      options,
      queryParams: queryString.parse(window.location.search) || {},
    };

    return <ChildrenSection {...updatedProps} />;
  };

  renderItems = () => {
    const { item } = this.props;
    return (
      <>
        {isEnabled("tickets") && (
          <PortableTickets mainType="purchase" mainTypeId={item._id} />
        )}
        {isEnabled("tasks") && (
          <PortableTasks mainType="purchase" mainTypeId={item._id} />
        )}

        {isEnabled("sales") && (
          <PortableDeals mainType="purchase" mainTypeId={item._id} />
        )}

        {loadDynamicComponent(
          "purchaseRightSidebarSection",
          { id: item._id },
          true
        )}
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
    } = this.props;

    return (
      <>
        <Top
          options={options}
          amount={this.renderAmount}
          stageId={item.stageId}
          item={item}
          saveItem={saveItem}
          onChangeStage={onChangeStage}
        />

        <Flex>
          <Left
            options={options}
            saveItem={saveItem}
            copyItem={copy}
            removeItem={remove}
            onUpdate={onUpdate}
            sendToBoard={sendToBoard}
            item={item}
            addItem={addItem}
            onChangeStage={onChangeStage}
            onChangeRefresh={this.onChangeRefresh}
          />
          <Sidebar
            options={options}
            item={item}
            updateTimeTrack={updateTimeTrack}
            sidebar={this.renderProductSection}
            saveItem={saveItem}
            renderItems={this.renderItems}
            childrenSection={this.renderChildrenSection}
            currentUser={currentUser}
          />
        </Flex>
      </>
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
