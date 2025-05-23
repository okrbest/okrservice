import {
  Box,
  MainStyleButtonRelated as ButtonRelated,
  EmptyState,
  Icon,
  ModalTrigger,
  SectionBodyItem,
  __,
} from "@erxes/ui/src";

import CarChooser from "../../containers/CarChooser";
import DynamicComponentContent from "@erxes/ui/src/components/dynamicComponent/Content";
import GetConformity from "@erxes/ui-sales/src/conformity/containers/GetConformity";
import { ICar } from "../../types";
import { Link } from "react-router-dom";
import React from "react";
import { queries } from "../../graphql";

type Props = {
  name: string;
  items?: ICar[];
  mainType?: string;
  mainTypeId?: string;
  showType?: string;
  onSelect?: (cars: ICar[]) => void;
  collapseCallback?: () => void;
};

function Component(
  this: any,
  {
    name,
    items = [],
    mainType = "",
    mainTypeId = "",
    showType,
    onSelect,
    collapseCallback,
  }: Props
) {
  const renderCarChooser = (props) => {
    return (
      <CarChooser
        {...props}
        data={{ name, cars: items, mainType, mainTypeId }}
        onSelect={onSelect}
      />
    );
  };

  const renderRelatedCarChooser = (props) => {
    return (
      <CarChooser
        {...props}
        data={{ name, cars: items, mainTypeId, mainType, isRelated: true }}
        onSelect={onSelect}
      />
    );
  };

  const carTrigger = (
    <button>
      <Icon icon="plus-circle" />
    </button>
  );

  const relCarTrigger = (
    <ButtonRelated>
      <span>{__("See related cars..")}</span>
    </ButtonRelated>
  );

  const quickButtons = (
    <ModalTrigger
      title={__("Associate")}
      trigger={carTrigger}
      size="lg"
      content={renderCarChooser}
    />
  );

  const relQuickButtons = (
    <ModalTrigger
      title={__("Related Associate")}
      trigger={relCarTrigger}
      size="lg"
      content={renderRelatedCarChooser}
    />
  );

  const content = () => {
    if (items.length > 0) {
      const categoryId = items[0].category?.productCategoryId;

      localStorage.setItem(
        "erxes_products:chooser_filter",
        JSON.stringify({ categoryId })
      );
    }

    return (
      <>
        {items.map((car, index) => (
          <SectionBodyItem key={index}>
            <Link to={`/erxes-plugin-car/details/${car._id}`}>
              <Icon icon="arrow-to-right" />
            </Link>
            <span>{car.plateNumber || "Unknown"}</span>
          </SectionBodyItem>
        ))}
        {items.length === 0 && <EmptyState icon="building" text="No car" />}
        {mainTypeId && mainType && relQuickButtons}
      </>
    );
  };

  if (showType && showType === "list") {
    return <DynamicComponentContent>{content()}</DynamicComponentContent>;
  }

  return (
    <Box
      title={__("Cars")}
      name="showCars"
      extraButtons={quickButtons}
      isOpen={true}
      callback={collapseCallback}
    >
      {content()}
    </Box>
  );
}

type IProps = {
  mainType?: string;
  mainTypeId?: string;
  isOpen?: boolean;
  cars?: ICar[];
  onSelect?: (datas: ICar[]) => void;
  collapseCallback?: () => void;
};

export default (props: IProps) => {
  return (
    <GetConformity
      {...props}
      relType="car"
      component={Component}
      queryName="cars"
      itemsQuery={queries.cars}
      alreadyItems={props.cars}
    />
  );
};
