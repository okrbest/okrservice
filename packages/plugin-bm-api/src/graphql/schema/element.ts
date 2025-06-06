import gql from "graphql-tag";

export const types = () => `

  type BMSLocation {
    lat: Float
    lng: Float
    name: String
    mapId: String
  }
  input BMSLocationInput {
    lat: Float
    lng: Float
    name: String
    mapId: String
  }


  type Element {
    _id: String!
    name: String
    quick: Boolean
    orderCheck: Boolean
    visibleName: Boolean
    icon: String
    content: String
    note: String
    startTime: String
    duration: Int
    cost: Float
    images: [String]
    categories: [String]
    categoriesObject: [ElementCategory]
    itineraryId: String
    location: BMSLocation
    branchId: String
    createdAt: Date
    modifiedAt: Date
    additionalInfo: JSON
  }

  type ElementCategory {
    _id: String!
    name: String
    parentId: String
  }
  type ListElement {
    list: [Element]
    total: Int
  }
`;

export const queries = `
  bmElements(branchId:String, categories: [String],name: String, page:Int, perPage:Int,quick: Boolean,sortField:String, sortDirection:Int,icon:Boolean): ListElement
  bmElementDetail(_id:String!): Element
  bmElementCategoryies(parentId:String): [ElementCategory]
  bmElementsInit: JSON
  bmCategoryInit: JSON
`;

const params = `
  name: String,
  content: String,
  note: String,
  startTime: String,
  duration: Int,
  cost:Float,
  images:[String],
  categories: [String],
  itineraryId: String,
  location: BMSLocationInput,
  quick: Boolean,
  orderCheck: Boolean,
  branchId: String,
  icon: String,
  visibleName: Boolean,
  additionalInfo: JSON
`;

export const mutations = `
  bmElementAdd(${params}): Element
  bmElementRemove(ids: [String]): JSON
  bmElementEdit(_id:String!, ${params}): Element
  bmElementCategoryAdd(name:String,parentId:String):ElementCategory
  bmElementCategoryRemove(_id: String!):JSON
  bmElementCategoryEdit(_id: String!, name:String,parentId:String): ElementCategory
`;
