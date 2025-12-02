import * as compose from "lodash.flowright";

import React, { Component } from "react";
import {
  IOptions,
  IPipeline,
  PipelineLabelsQueryResponse,
  StagesQueryResponse
} from "../types";
import { gql } from "@apollo/client";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import { withProps } from "@erxes/ui/src/utils";
import { graphql } from "@apollo/client/react/hoc";
import { queries } from "../graphql";
import styled from "styled-components";
import { PRIORITIES } from "../constants";
import ListGroupBy from "./ListGroupBy";
import GanttChart from "./gantt/GanttChart";
import TimeItems from "./time/TimeItems";
import { TagsQueryResponse } from "@erxes/ui-tags/src/types";
import { queries as tagQueries } from "@erxes/ui-tags/src/graphql";
import { AllUsersQueryResponse } from "@erxes/ui/src/auth/types";
import { queries as userQueries } from "@erxes/ui/src/team/graphql";
import { FieldsGroupsQueryResponse } from "@erxes/ui-forms/src/settings/properties/types";
import { queries as fieldQueries } from "@erxes/ui-forms/src/settings/properties/graphql";

const Container = styled.div`
  min-height: 500px;
  overflow: auto;
  background-color: white;
`;

type Props = {
  pipeline: IPipeline;
  queryParams: any;
  options: IOptions;
  viewType: string;
};

type WithStagesProps = {
  stagesQuery: any;
  pipelineLabelsQuery: PipelineLabelsQueryResponse;
  pipelineAssigneeQuery: any;
  tagsQuery?: TagsQueryResponse;
  usersQuery: AllUsersQueryResponse;
  fieldsGroupsQuery?: FieldsGroupsQueryResponse;
  customerFieldsGroupsQuery?: FieldsGroupsQueryResponse;
} & Props;

class WithStages extends Component<WithStagesProps> {
  render() {
    const {
      options,
      queryParams,
      stagesQuery,
      pipelineLabelsQuery,
      pipelineAssigneeQuery,
      viewType,
      pipeline,
      tagsQuery,
      usersQuery,
      fieldsGroupsQuery,
      customerFieldsGroupsQuery
    } = this.props;

    // Deal 타입일 때 커스텀 필드 목록 추출
    let customFields: any[] = [];
    if (options.type === "deal" && fieldsGroupsQuery && !fieldsGroupsQuery.loading && fieldsGroupsQuery.fieldsGroups) {
      const expectedContentType = `sales:${options.type}`;
      customFields = fieldsGroupsQuery.fieldsGroups
        .flatMap((group) => group.fields || [])
        .filter((field) => {
          // 필드가 존재하고, 시스템 필드가 아니며, 보이는 필드이고, 이름이 있는 필드만 포함
          // 그리고 올바른 contentType을 가진 필드만 포함
          return field && 
                 !field.isDefinedByErxes && 
                 field.isVisible && 
                 (field.text || field.name) &&
                 (field.text || field.name).trim() !== '' &&
                 field.contentType === expectedContentType;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Customer 필드에서 메일발송일과 직전소통일 필드 ID 찾기
    let mailSentDateFieldId: string | null = null;
    let lastContactDateFieldId: string | null = null;
    
    if (options.type === "deal" && customerFieldsGroupsQuery && !customerFieldsGroupsQuery.loading && customerFieldsGroupsQuery.fieldsGroups) {
      const allFields = customerFieldsGroupsQuery.fieldsGroups.flatMap((group) => group.fields || []);
      
      console.log("ViewGroupBy: Searching for date fields in", allFields.length, "customer fields");
      
      for (const field of allFields) {
        if (!field || !field._id) continue;
        
        const fieldName = field.text || field.name || "";
        const fieldType = field.type || "";
        const lowerFieldName = fieldName.toLowerCase().replace(/\s+/g, "");
        
        console.log("ViewGroupBy: Checking field:", fieldName, "Type:", fieldType, "ID:", field._id);
        
        // More flexible matching for 메일발송일
        if ((lowerFieldName.includes("메일") && (lowerFieldName.includes("발송") || lowerFieldName.includes("보낸"))) ||
            fieldName === "메일발송일" ||
            fieldName === "메일 발송일" ||
            lowerFieldName === "메일발송일") {
          mailSentDateFieldId = field._id;
          console.log("ViewGroupBy: ✓ Found 메일발송일 field:", fieldName, field._id);
        }
        
        // More flexible matching for 직전소통일
        if ((lowerFieldName.includes("직전") && lowerFieldName.includes("소통")) ||
            fieldName === "직전소통일" ||
            fieldName === "직전 소통일" ||
            lowerFieldName === "직전소통일") {
          lastContactDateFieldId = field._id;
          console.log("ViewGroupBy: ✓ Found 직전소통일 field:", fieldName, field._id);
        }
      }
      
      console.log("ViewGroupBy: Final field IDs - mailSentDateFieldId:", mailSentDateFieldId, "lastContactDateFieldId:", lastContactDateFieldId);
    }

    let groupType = "stage";
    let groups: any[] = stagesQuery.salesStages || [];

    if (queryParams.groupBy === "label") {
      groups = pipelineLabelsQuery.salesPipelineLabels || [];
      groupType = "label";
    }

    if (queryParams.groupBy === "priority") {
      groups = PRIORITIES.map(p => ({ _id: p, name: p }) || []);
      groupType = "priority";
    }

    if (queryParams.groupBy === "assignee") {
      groups = pipelineAssigneeQuery.salesPipelineAssignedUsers || [];
      groupType = "assignee";
    }

    if (queryParams.groupBy === "dueDate") {
      const renderLink = () => [
        {
          _id: "overDue",
          name: "Overdue",
          value: "overdue"
        },
        {
          _id: "dueTomorrow",
          name: "Due tomorrow",
          value: "nextDay"
        },
        {
          _id: "dueWeek",
          name: "Due next week",
          value: "nextWeek"
        },
        {
          _id: "dueMonth",
          name: "Due next month",
          value: "nextMonth"
        },
        {
          _id: "noCloseDate",
          name: "Has no close date",
          value: "noCloseDate"
        }
      ];
      groups = renderLink();
      groupType = "dueDate";
    }

    if (queryParams.groupBy === "tags") {
      groups = tagsQuery?.tags || [];
      groupType = "tags";
    }

    if (queryParams.groupBy === "members") {
      groups = usersQuery.allUsers || [];
      groupType = "members";
    }

    if (groups.length === 0) {
      return (
        <EmptyState
          image="/images/actions/8.svg"
          text="No value in this pipeline"
          size="large"
          light={true}
        />
      );
    }

    if (viewType === "gantt") {
      return (
        <GanttChart
          key={pipeline._id}
          options={options}
          queryParams={queryParams}
          groups={groups}
          groupType={groupType}
        />
      );
    }

    if (viewType === "time") {
      return (
        <TimeItems
          key={pipeline._id}
          pipeline={pipeline}
          queryParams={queryParams}
          options={options}
          type={options.type}
          groupType={groupType}
          groups={groups}
        />
      );
    }

    return (
      <Container>
        {groups.map((groupObj, index) => (
          <ListGroupBy
            key={groupObj._id}
            options={options}
            groupObj={groupObj}
            groupType={groupType}
            index={index}
            length={groups.length}
            queryParams={queryParams}
            refetchStages={stagesQuery.refetch}
            customFields={customFields}
            mailSentDateFieldId={mailSentDateFieldId}
            lastContactDateFieldId={lastContactDateFieldId}
          />
        ))}
      </Container>
    );
  }
}

export default withProps<Props>(
  compose(
    graphql<Props, StagesQueryResponse>(gql(queries.stages), {
      name: "stagesQuery",
      options: ({ pipeline, queryParams, options: { getExtraParams } }) => ({
        variables: {
          pipelineId: pipeline._id,
          search: queryParams.search,
          customerIds: queryParams.customerIds,
          companyIds: queryParams.companyIds,
          assignedUserIds: queryParams.assignedUserIds,
          labelIds: queryParams.labelIds,
          extraParams: getExtraParams(queryParams),
          closeDateType: queryParams.closeDateType,
          userIds: queryParams.userIds,
          assignedToMe: queryParams.assignedToMe
        }
      })
    }),
    graphql<Props, StagesQueryResponse>(gql(queries.pipelineLabels), {
      name: "pipelineLabelsQuery",
      options: ({ pipeline }) => ({
        variables: {
          pipelineId: pipeline._id
        }
      })
    }),
    graphql<Props, StagesQueryResponse>(gql(queries.pipelineAssignedUsers), {
      name: "pipelineAssigneeQuery",
      options: ({ pipeline }) => ({
        variables: {
          _id: pipeline._id
        }
      })
    }),
    graphql<Props, TagsQueryResponse, { type: string }>(gql(tagQueries.tags), {
      name: "tagsQuery",
      skip: ({ pipeline }: Props) => pipeline.tagId === "",
      options: ({ pipeline, options }: Props) => ({
        variables: {
          type: `sales:${options.type}`,
          parentId: pipeline.tagId
        }
      })
    }),
    graphql<Props, AllUsersQueryResponse>(gql(userQueries.allUsers), {
      name: "usersQuery",
      options: ({ queryParams }) => ({
        variables: {
          isActive: true,
          assignedToMe: queryParams?.assignedToMe,
          ids: queryParams?.assignedUserIds
        }
      })
    }),
    graphql<Props, FieldsGroupsQueryResponse, { contentType: string; config?: { boardId?: string; pipelineId?: string } }>(
      gql(fieldQueries.fieldsGroups),
      {
        name: "fieldsGroupsQuery",
        skip: ({ options }: Props) => options.type !== "deal",
        options: ({ pipeline, queryParams, options }: Props) => ({
          variables: {
            contentType: `sales:${options.type}`,
            isDefinedByErxes: false,
            config: {
              boardId: pipeline.boardId || queryParams?.boardId || "",
              pipelineId: pipeline._id || "",
            },
          },
        }),
      }
    ),
    graphql<Props, FieldsGroupsQueryResponse, { contentType: string; isDefinedByErxes?: boolean }>(
      gql(fieldQueries.fieldsGroups),
      {
        name: "customerFieldsGroupsQuery",
        skip: ({ options }: Props) => options.type !== "deal",
        options: () => ({
          variables: {
            contentType: "core:customer",
            // Remove isDefinedByErxes filter to get all fields
          },
        }),
      }
    )
  )(WithStages)
);
