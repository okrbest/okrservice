import {
  DateContainer,
  FormColumn,
  FormWrapper
} from "@erxes/ui/src/styles/main";
import { FlexItem, LeftItem } from "@erxes/ui/src/components/step/styles";

import Button from "@erxes/ui/src/components/Button";
import Datetime from "@nateradebaugh/react-datetime";
import DiscountInput from "../form/DiscountInput";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import FormLabel from "@erxes/ui/src/components/form/Label";
import { PricingPlan } from "../../../types";
import React from "react";
import SelectCompanies from "@erxes/ui-contacts/src/companies/containers/SelectCompanies";
import SelectProductCategory from "@erxes/ui-products/src/containers/SelectProductCategory";
import SelectProducts from "@erxes/ui-products/src/containers/SelectProducts";
import SelectSegments from "@erxes/ui-segments/src/containers/SelectSegments";
import SelectTags from "@erxes/ui-tags/src/containers/SelectTags";
import { __ } from "coreui/utils";

type Props = {
  formValues: PricingPlan;
  handleState: (key: string, value: any) => void;
};

export default function General(props: Props) {
  const { formValues, handleState } = props;

  // Functions
  const renderProductForm = () => {
    switch (formValues.applyType) {
      case "category":
        return (
          <>
            <FormGroup>
              <FormLabel>{__("Product categories")}</FormLabel>
              <SelectProductCategory
                name="categories"
                label="Choose categories"
                initialValue={formValues.categories}
                onSelect={categories => handleState("categories", categories)}
                multi={true}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Exclude categories")}</FormLabel>
              <SelectProductCategory
                name="categoriesExcluded"
                label="Choose categories to exclude"
                initialValue={formValues.categoriesExcluded}
                onSelect={categories =>
                  handleState("categoriesExcluded", categories)
                }
                multi={true}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Exclude products")}</FormLabel>
              <SelectProducts
                name="productsExcluded"
                label="Choose products to exclude"
                initialValue={formValues.productsExcluded}
                onSelect={products => handleState("productsExcluded", products)}
                multi={true}
              />
            </FormGroup>
          </>
        );
      case "product":
        return (
          <FormGroup>
            <FormLabel>{__("Products")}</FormLabel>
            <SelectProducts
              name="products"
              label="Choose products"
              initialValue={formValues.products}
              onSelect={products => handleState("products", products)}
              multi={true}
            />
          </FormGroup>
        );
      case "segment":
        return (
          <FormGroup>
            <FormLabel>{__("Segment")}</FormLabel>
            <SelectSegments
              name="segments"
              label="Choose segments"
              contentTypes={["core:product"]}
              initialValue={formValues.segments}
              multi={true}
              onSelect={segmentIds => handleState("segments", segmentIds)}
            />
          </FormGroup>
        );
      case "vendor":
        return (
          <FormGroup>
            <FormLabel>{__("Vendors")}</FormLabel>
            <SelectCompanies
              label="Choose companies"
              name="vendors"
              initialValue={formValues.vendors}
              multi={true}
              onSelect={companyIds => handleState("vendors", companyIds)}
              showAvatar={false}
            />
          </FormGroup>
        );
      case "tag":
        return (
          <>
            <FormGroup>
              <FormLabel>{__("Product tags")}</FormLabel>
              <SelectTags
                tagsType="core:product"
                name="tags"
                label="Choose tags"
                initialValue={formValues.tags}
                onSelect={tags => handleState("tags", tags)}
                multi={true}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Exclude tags")}</FormLabel>
              <SelectTags
                tagsType="core:product"
                name="tagsExcluded"
                label="Choose tags to exclude"
                initialValue={formValues.tagsExcluded}
                onSelect={tags => handleState("tagsExcluded", tags)}
                multi={true}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Exclude products")}</FormLabel>
              <SelectProducts
                name="productsExcluded"
                label={__("Choose products to exclude")}
                initialValue={formValues.productsExcluded}
                onSelect={products => handleState("productsExcluded", products)}
                multi={true}
              />
            </FormGroup>
          </>
        );
      case "bundle":
        return (
          <FormWrapper>
            <FormGroup>
              <FormLabel>{__("Products to bundle")}</FormLabel>
              {(formValues.productsBundle || []).map((bundles, index) => {
                const onChange = productIds => {
                  (formValues.productsBundle || [])[index] = productIds;
                  handleState("productsBundle", formValues.productsBundle);
                };
                return (
                  <SelectProducts
                    name="products"
                    label="Choose products"
                    initialValue={bundles}
                    onSelect={onChange}
                    multi={true}
                  />
                );
              })}
              <Button
                onClick={() =>
                  handleState("productsBundle", [
                    ...(formValues.productsBundle || []),
                    []
                  ])
                }
              >
                +
              </Button>
            </FormGroup>
          </FormWrapper>
        );
      default:
        return;
    }
  };

  const renderTypeOptions = () => (
    <FormGroup>
      <FormLabel>{__("Discount Type")}</FormLabel>
      <FormControl
        componentclass="radio"
        name="type"
        onChange={() => handleState("type", "fixed")}
        defaultChecked={formValues.type === "fixed"}
      >
        {__("Fixed")}
      </FormControl>
      <FormControl
        componentclass="radio"
        name="type"
        onChange={() => handleState("type", "subtraction")}
        defaultChecked={formValues.type === "subtraction"}
      >
        {__("Subtraction")}
      </FormControl>
      <FormControl
        componentclass="radio"
        name="type"
        onChange={() => handleState("type", "percentage")}
        defaultChecked={formValues.type === "percentage"}
      >
        {__("Percentage")}
      </FormControl>
      <FormControl
        componentclass="radio"
        name="type"
        onChange={() => handleState("type", "bonus")}
        defaultChecked={formValues.type === "bonus"}
      >
        {__("Bonus")}
      </FormControl>
    </FormGroup>
  );

  const renderPriceAdjust = () => {
    if (formValues.type !== "bonus")
      return (
        <>
          <FormGroup>
            <FormLabel>{__("Price adjust type")}</FormLabel>
            <FormControl
              name="priceAdjustType"
              componentclass="select"
              options={[
                {
                  label: "None",
                  value: "none"
                },
                {
                  label: "Round",
                  value: "round"
                },
                {
                  label: "Floor",
                  value: "floor"
                },
                {
                  label: "Ceil",
                  value: "ceil"
                },
                {
                  label: "Truncate",
                  value: "truncate"
                },
                {
                  label: "Ends With 9",
                  value: "endsWith9"
                }
              ]}
              onChange={(e: any) =>
                handleState("priceAdjustType", e.target.value)
              }
              defaultValue={formValues.priceAdjustType}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>{__("Price adjust factor")}</FormLabel>
            <FormControl
              type="number"
              name="value"
              placeholder="0"
              required={true}
              onChange={(e: any) =>
                handleState("priceAdjustFactor", parseFloat(e.target.value))
              }
              defaultValue={formValues.priceAdjustFactor}
            />
          </FormGroup>
        </>
      );
    else return;
  };

  const renderDateRanger = () => (
    <>
      <FormGroup>
        <FormControl
          componentclass="checkbox"
          name="startDate"
          checked={formValues.isStartDateEnabled}
          onChange={(event: any) =>
            handleState("isStartDateEnabled", event.target.checked)
          }
        />
        <FormLabel>{__("Start Date")}</FormLabel>
        <DateContainer>
          <Datetime
            inputProps={{ placeholder: __("Select Date") }}
            dateFormat="MM/DD/YYYY"
            closeOnSelect={true}
            timeFormat={true}
            utc={true}
            value={formValues.startDate || undefined}
            onChange={(date: any) => handleState("startDate", date)}
          />
        </DateContainer>
      </FormGroup>
      <FormGroup>
        <FormControl
          componentclass="checkbox"
          name="endDate"
          checked={formValues.isEndDateEnabled}
          onChange={(event: any) =>
            handleState("isEndDateEnabled", event.target.checked)
          }
        />
        <FormLabel>{__("End Date")}</FormLabel>
        <DateContainer>
          <Datetime
            inputProps={{ placeholder: __("Select Date") }}
            dateFormat="MM/DD/YYYY"
            closeOnSelect={true}
            timeFormat={true}
            utc={true}
            value={formValues.endDate || undefined}
            onChange={(date: any) => handleState("endDate", date)}
          />
        </DateContainer>
      </FormGroup>
    </>
  );

  return (
    <FlexItem>
      <LeftItem>
        <FormWrapper>
          <FormColumn>
            <FormGroup>
              <FormLabel required={true}>{__("Name")}</FormLabel>
              <FormControl
                type="text"
                name="name"
                placeholder={__("Name")}
                value={formValues.name}
                required={true}
                onChange={(event: any) =>
                  handleState("name", (event.target as HTMLInputElement).value)
                }
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Status")}</FormLabel>
              <FormControl
                name="status"
                componentclass="select"
                options={[
                  {
                    label: "Active",
                    value: "active"
                  },
                  {
                    label: "Archived",
                    value: "archived"
                  },
                  {
                    label: "Draft",
                    value: "draft"
                  },
                  {
                    label: "Completed",
                    value: "completed"
                  }
                ]}
                onChange={(e: any) => handleState("status", e.target.value)}
                defaultValue={formValues.status}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>{__("Prioritize")}</FormLabel>
              <FormControl
                name="isPriority"
                componentclass="checkbox"
                checked={formValues.isPriority}
                onChange={(e: any) =>
                  handleState("isPriority", e.target.checked)
                }
              />
            </FormGroup>
            {renderTypeOptions()}
            <DiscountInput
              type={formValues.type}
              value={formValues.value}
              handleChange={(value: number) => handleState("value", value)}
              bonusValue={formValues.bonusProduct}
              handleBonusChange={(value: any) =>
                handleState("bonusProduct", value)
              }
              isLabelOn={true}
            />
            {renderPriceAdjust()}
            {renderDateRanger()}
          </FormColumn>
          <FormColumn>
            <FormGroup>
              <FormLabel>{__("Applies to")}</FormLabel>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "category")}
                defaultChecked={formValues.applyType === "category"}
              >
                Specific Category
              </FormControl>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "product")}
                defaultChecked={formValues.applyType === "product"}
              >
                Specific Product
              </FormControl>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "segment")}
                defaultChecked={formValues.applyType === "segment"}
              >
                Specific Segment
              </FormControl>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "vendor")}
                defaultChecked={formValues.applyType === "vendor"}
              >
                Specific Vendor
              </FormControl>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "tag")}
                defaultChecked={formValues.applyType === "tag"}
              >
                Specific Tag
              </FormControl>
              <FormControl
                componentclass="radio"
                name="applyType"
                onChange={() => handleState("applyType", "bundle")}
                defaultChecked={formValues.applyType === "bundle"}
              >
                Specific Bundle
              </FormControl>
            </FormGroup>
            {renderProductForm()}
          </FormColumn>
        </FormWrapper>
      </LeftItem>
    </FlexItem>
  );
}
