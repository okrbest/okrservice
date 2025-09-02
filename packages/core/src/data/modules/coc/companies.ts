import * as _ from "underscore";
import { IModels } from "../../../connectionResolver";

import { IConformityQueryParams } from "./customers";
import { CommonBuilder } from "./utils";
import { sortCompaniesByName } from "../../../utils/koreanSort";

type TSortBuilder = { primaryName: number } | { [index: string]: number };

export const sortBuilder = (params: IListArgs): TSortBuilder => {
  const sortField = params.sortField;
  const sortDirection = params.sortDirection || 0;

  let sortParams: TSortBuilder = { primaryName: 1 };

  if (sortField) {
    sortParams = { [sortField]: sortDirection };
  }

  return sortParams;
};

export interface IListArgs extends IConformityQueryParams {
  page?: number;
  perPage?: number;
  segment?: string;
  tag?: string;
  ids?: string[];
  tags?: string[];
  excludeTags?: string[];
  tagWithRelated?: boolean;
  searchValue?: string;
  brand?: string;
  sortField?: string;
  sortDirection?: number;
  dateFilters?: string;
}

export class Builder extends CommonBuilder<IListArgs> {
  constructor(models: IModels, subdomain: string, params: IListArgs, context) {
    super(models, subdomain, "companies", params, context);
  }

  public async findAllMongo(limit: number) {
    const selector = {
      ...this.context.commonQuerySelector,
      status: { $ne: "deleted" }
    };

    const { sortField: sortFieldParam, sortDirection, page = 1 } = this.params;
    
    console.log('=== findAllMongo Debug ===');
    console.log('page:', page);
    console.log('limit:', limit);
    console.log('sortFieldParam:', sortFieldParam);
    console.log('sortDirection:', sortDirection);

    // Elasticsearch 인덱스가 없을 때 MongoDB 직접 조회
    console.log('Using MongoDB direct query (Elasticsearch index not found)');
    
    const skip = (page - 1) * limit;
    console.log('Calculated skip:', skip);
    
    if (!sortFieldParam) {
      console.log('Using Korean sort for default sorting');
      
      // 기본 정렬: 한글 정렬 적용
      // 페이지네이션을 위해 충분한 데이터를 가져와서 정렬 후 슬라이스
      const companies = await this.models.Companies.find(selector)
        .limit(limit * 5); // 더 많은 데이터를 가져와서 정렬 후 페이지네이션

      console.log('Total companies found:', companies.length);
      
      const sortedCompanies = sortCompaniesByName(companies, 1);
      console.log('After Korean sort:', sortedCompanies.length);
      
      // 페이지네이션 적용
      const paginatedCompanies = sortedCompanies.slice(skip, skip + limit);
      console.log('After pagination slice:', paginatedCompanies.length);

      const count = await this.models.Companies.find(selector).countDocuments();
      console.log('Total count:', count);

      return {
        list: paginatedCompanies,
        totalCount: count
      };
    } else {
      console.log('Using MongoDB sort for field:', sortFieldParam);
      
      // 다른 정렬: 기본 MongoDB 정렬 사용 (페이지네이션 포함)
      const sortDirection = this.params.sortDirection || 1;
      const sortObj: any = {};
      sortObj[sortFieldParam] = sortDirection;
      
      const companies = await this.models.Companies.find(selector)
        .sort(sortObj)
        .skip(skip)
        .limit(limit);

      const count = await this.models.Companies.find(selector).countDocuments();
      console.log('MongoDB sort result count:', companies.length);

      return {
        list: companies,
        totalCount: count
      };
    }
  }

  // filter by date fields & properties
  public async dateFilters(filters: string): Promise<void> {
    const dateFilters = JSON.parse(filters);

    const operators = ["gte", "lte"];

    for (const key of Object.keys(dateFilters)) {
      if (key.includes("customFieldsData")) {
        const field = key.split(".")[1];

        const nestedQry: any = {
          nested: {
            path: "customFieldsData",
            query: {
              bool: {
                must: [
                  {
                    term: {
                      "customFieldsData.field": field
                    }
                  }
                ]
              }
            }
          }
        };

        for (const operator of operators) {
          const value = new Date(dateFilters[key][operator]);

          const rangeQry: any = {
            range: { "customFieldsData.dateValue": {} }
          };

          rangeQry.range["customFieldsData.dateValue"][operator] = value;

          nestedQry.nested.query.bool.must.push(rangeQry);

          this.positiveList.push(nestedQry);
        }
      } else {
        for (const operator of operators) {
          const value = new Date(dateFilters[key][operator]);

          const qry: any = {
            range: { [key]: {} }
          };

          qry.range[key][operator] = value;

          if (value) {
            this.positiveList.push(qry);
          }
        }
      }
    }
  }

  /*
   * prepare all queries. do not do any action
   */
  public async buildAllQueries(): Promise<void> {
    await super.buildAllQueries();

    if (this.params.dateFilters) {
      await this.dateFilters(this.params.dateFilters);
    }
  }
}
