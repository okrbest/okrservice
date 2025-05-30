import { ICustomField } from "@erxes/api-utils/src/definitions/common";
import { Schema, Document } from "mongoose";
import { field, schemaHooksWrapper } from "./utils";

export interface IOrder {
  _id: string;
  customerId: string;
  tourId: string;
  amount: number;
  status: string;
  note: string;
  branchId?: string;
  numberOfPeople: number;
  type?: string;
  additionalCustomers?: string[];
  invoices?: { amount: number; _id: string }[];
}

export interface IOrderDocument extends IOrder, Document {
  _id: string;
  createdAt: Date;
  modifiedAt: Date;
}

const STATUS_TYPES = [
  { label: "paid", value: "paid" },
  { label: "notPaid", value: "notPaid" },
  { label: "somePaid", value: "somePaid" }
];

const getEnum = (): string[] => {
  return STATUS_TYPES.map((option) => option.value);
};

export const orderSchema = schemaHooksWrapper(
  new Schema({
    _id: field({ pkey: true }),
    createdAt: field({ type: Date, label: "Created at" }),
    modifiedAt: field({ type: Date, label: "Modified at" }),
    customerId: field({ type: String, optional: true, label: "customerId" }),
    tourId: field({ type: String, optional: true, label: "tourId" }),
    note: field({ type: String, optional: true, label: "note" }),
    amount: field({ type: Number, optional: true, label: "amount" }),
    status: field({
      type: String,
      enum: getEnum(),
      default: "",
      optional: true,
      label: "status",
      esType: "keyword",
      selectOptions: STATUS_TYPES
    }),
    branchId: field({ type: String, optional: true, label: "branchId" }),
    numberOfPeople: field({
      type: Number,
      optional: true,
      label: "numberOfPeople"
    }),
    type: field({ type: String, optional: true, label: "type" }),
    invoices: field({ type: Object, optional: true, label: "invoices" }),
    additionalCustomers: field({
      type: [String],
      optional: true,
      label: "additionalCustomers"
    }),
    parent: field({ type: String, optional: true, label: "parent" }),
    isChild: field({ type: Boolean, optional: true, label: "isChild" })
  }),
  "erxes_bm_orders"
);
