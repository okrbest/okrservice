import { IEditFormContent, IOptions } from "../../boards/types";
import { ITicket, ITicketParams } from "../types";
import React, { useEffect, useState } from "react";
import Select, { components } from "react-select";
import { __ } from "coreui/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@apollo/client";

import { Capitalize } from "@erxes/ui-settings/src/permissions/styles";
import ChildrenSection from "../../boards/containers/editForm/ChildrenSection";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import EditForm from "../../boards/components/editForm/EditForm";
import { Flex } from "@erxes/ui/src/styles/main";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { INTEGRATION_KINDS } from "@erxes/ui/src/constants/integrations";
import { ISelectedOption } from "@erxes/ui/src/types";
import { IUser } from "@erxes/ui/src/auth/types";
import Left from "../../boards/components/editForm/Left";
import PortableDeals from "@erxes/ui-sales/src/deals/components/PortableDeals";
import PortablePurchase from "@erxes/ui-purchases/src/purchases/components/PortablePurchases";
import PortableTasks from "@erxes/ui-tasks/src/tasks/components/PortableTasks";
import Sidebar from "../../boards/components/editForm/Sidebar";
import Top from "../../boards/components/editForm/Top";
import queryString from "query-string";
import { isEnabled } from "@erxes/ui/src/utils/core";
import FormControl from "@erxes/ui/src/components/form/Control";

type Props = {
  options: IOptions;
  item: ITicket;
  addItem: (doc: ITicketParams, callback: () => void, msg?: string) => void;
  saveItem: (doc: ITicketParams, callback?: (item) => void) => void;
  copyItem: (itemId: string, callback: (item) => void) => void;
  onUpdate: (item, prevStageId?: string) => void;
  removeItem: (itemId: string, callback: () => void) => void;
  beforePopupClose: () => void;
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
  synchSingleCard?: (itemId: string) => void;
};

// WidgetComments 쿼리 추가
const WIDGET_COMMENTS_QUERY = gql`
  query widgetsTicketComments($typeId: String!, $type: String!) {
    widgetsTicketComments(typeId: $typeId, type: $type) {
      _id
      content
      createdUser {
        _id
        email
        lastName
        firstName
        avatar
      }
      type
      userType
      createdAt
    }
  }
`;

// WidgetComments 추가 뮤테이션
const WIDGET_COMMENTS_ADD_MUTATION = gql`
  mutation widgetsTicketCommentAdd(
    $type: String!
    $typeId: String!
    $content: String!
    $userType: String!
    $customerId: String
  ) {
    widgetsTicketCommentAdd(
      type: $type
      typeId: $typeId
      content: $content
      userType: $userType
      customerId: $customerId
    ) {
      _id
      type
      createdAt
    }
  }
`;

// WidgetComments 삭제 뮤테이션
const WIDGET_COMMENTS_DELETE_MUTATION = gql`
  mutation widgetsTicketCommentsRemove($_id: String!) {
    widgetsTicketCommentsRemove(_id: $_id)
  }
`;

export default function TicketEditForm(props: Props) {
  const item = props.item;
  const [source, setSource] = useState(item.source);
  const [isCheckUserTicket, setIsCheckUserTicket] = useState(
    item.isCheckUserTicket
  );
  const [requestType, setRequestType] = useState(item.requestType);
  const [refresh, setRefresh] = useState(false);

  // CardDetailAction.tsx와 동일한 방식으로 type 설정
  const type = item.stage?.type || "ticket";

  // type이 "ticket"이 아닐 때는 댓글 기능 비활성화
  const isTicketType = type === "ticket";

  // WidgetComments 쿼리 실행 (ticket 타입일 때만)
  const { data: widgetCommentsData, refetch: refetchWidgetComments } = useQuery(WIDGET_COMMENTS_QUERY, {
    variables: { 
      typeId: item._id, 
      type: type
    },
    skip: !item._id || !isTicketType,
  });

  // WidgetComments 추가 뮤테이션 (ticket 타입일 때만)
  const [addWidgetComment] = useMutation(WIDGET_COMMENTS_ADD_MUTATION, {
    onCompleted: (data) => {
      console.log("Comment added successfully:", data);
      refetchWidgetComments();
    },
    onError: (error) => {
      console.error("Failed to add comment:", error);
      alert(`댓글 추가 실패: ${error.message}`);
    },
  });

  // WidgetComments 삭제 뮤테이션 (ticket 타입일 때만)
  const [deleteWidgetComment] = useMutation(WIDGET_COMMENTS_DELETE_MUTATION, {
    onCompleted: (data) => {
      console.log("Comment deleted successfully:", data);
      // 삭제 성공 시 댓글 목록 새로고침
      refetchWidgetComments();
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
      alert(`댓글 삭제 실패: ${error.message}`);
    },
  });

  const widgetComments = widgetCommentsData?.widgetsTicketComments || [];

  // 댓글 추가 핸들러 (ticket 타입일 때만)
  const handleAddComment = async (content: string) => {
    if (!isTicketType) {
      console.log("Comments are only available for ticket type");
      return;
    }

    console.log("Attempting to add comment:", { content, itemId: item._id, currentUser: props.currentUser?._id, type });
    
    try {
      const result = await addWidgetComment({
        variables: {
          type: type,
          typeId: item._id,
          content,
          userType: "team",
          customerId: props.currentUser?._id || "",
        },
      });
      console.log("Mutation result:", result);
      return result;
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  };

  // 댓글 삭제 핸들러 (ticket 타입일 때만)
  const handleDeleteComment = async (commentId: string) => {
    if (!isTicketType) {
      console.log("Comments are only available for ticket type");
      return;
    }

    console.log("Attempting to delete comment:", { commentId, itemId: item._id });
    
    try {
      // 댓글 삭제 뮤테이션 실행
      const result = await deleteWidgetComment({
        variables: { _id: commentId }
      });
      
      console.log("Comment deletion result:", result);
      
      // 삭제 성공 시 댓글 목록 새로고침
      if (result.data?.widgetsTicketCommentsRemove) {
        console.log("Comment deleted successfully, refreshing comments...");
        refetchWidgetComments();
      }
      
      return result;
    } catch (error) {
      console.error("Failed to delete comment:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("useEffect triggered - item.requestType:", item.requestType);
    setSource(item.source);
    setRequestType(item.requestType);
  }, [item.source, item.requestType]);

  function renderSidebarFields(saveItem) {
    console.log("renderSidebarFields called with saveItem:", saveItem);
    console.log("Current requestType state:", requestType);
    console.log("Current item.requestType:", item.requestType);
    
    // Source 필드 주석처리
    // const sourceValues = INTEGRATION_KINDS.ALL.map((kind) => ({
    //   label: __(kind.text),
    //   value: kind.value,
    // }));

    // sourceValues.push({
    //   label: __("Other"),
    //   value: "other",
    // });

    const onToggleChange = (value: boolean) => {
      setIsCheckUserTicket(value);
      if (saveItem) saveItem({ isCheckUserTicket: value });
    };

    // const sourceValueRenderer = (option: ISelectedOption): React.ReactNode => (
    //   <Capitalize>{option.label}</Capitalize>
    // );

    // const onSourceChange = (option) => {
    //   const value = option ? option.value : "";

    //   console.log("=== SOURCE CHANGE START ===");
    //   console.log("Source changed to:", value);
    //   console.log("Calling saveItem with:", { source: value });

    //   setSource(value);

    //   if (saveItem) {
    //     saveItem({ source: value });
    //     console.log("saveItem called for source");
    //   } else {
    //     console.log("saveItem not available for source");
    //   }
    //   console.log("=== SOURCE CHANGE END ===");
    // };

    // const Option = (props) => {
    //   return (
    //     <components.Option {...props}>
    //       {sourceValueRenderer(props.data)}
    //     </components.Option>
    //   );
    // };

    // const SingleValue = (props) => {
    //   return (
    //     <components.SingleValue {...props}>
    //       {sourceValueRenderer(props.data)}
    //     </components.SingleValue>
    //   );
    // };

    // 고객요청구분 필드
    const requestTypeValues = [
      { label: "단순문의", value: "inquiry" },
      { label: "개선요청", value: "improvement" },
      { label: "오류처리", value: "error" }
    ];

    const requestTypeValueRenderer = (option: ISelectedOption): React.ReactNode => (
      <Capitalize>{option.label}</Capitalize>
    );

    const onRequestTypeChange = (option) => {
      const value = option ? option.value : "";

      console.log("=== REQUEST TYPE CHANGE START ===");
      console.log("RequestType changed to:", value);
      console.log("Calling saveItem with:", { requestType: value });

      setRequestType(value);

      if (saveItem) {
        saveItem({ requestType: value });
        console.log("saveItem called for requestType");
      } else {
        console.log("saveItem not available for requestType");
      }
      console.log("=== REQUEST TYPE CHANGE END ===");
    };

    const RequestTypeOption = (props) => {
      return (
        <components.Option {...props}>
          {requestTypeValueRenderer(props.data)}
        </components.Option>
      );
    };

    const RequestTypeSingleValue = (props) => {
      return (
        <components.SingleValue {...props}>
          {requestTypeValueRenderer(props.data)}
        </components.SingleValue>
      );
    };

    return (
      <>
        {/* Source 필드 주석처리
        <FormGroup>
          <ControlLabel>Source</ControlLabel>
          <Select
            placeholder={__("Select a source")}
            value={sourceValues.find((s) => s.value === source)}
            options={sourceValues}
            onChange={onSourceChange}
            isClearable={true}
            components={{ Option, SingleValue }}
          />
        </FormGroup>
        */}

        {isCheckUserTicket !== null && (
          <FormGroup controlId="isCheckUserTicket">
            <ControlLabel>
              Show only the user's assigned(created) ticket
            </ControlLabel>
            <FormControl
              type="checkbox"
              componentclass="checkbox"
              checked={isCheckUserTicket}
              onChange={(e) =>
                onToggleChange((e.target as HTMLInputElement).checked)
              }
            />
          </FormGroup>
        )}

        <FormGroup>
          <ControlLabel>고객요청구분</ControlLabel>
          <Select
            placeholder="요청구분을 선택하세요"
            value={requestTypeValues.find((r) => r.value === requestType)}
            options={requestTypeValues}
            onChange={onRequestTypeChange}
            isClearable={true}
            components={{ Option: RequestTypeOption, SingleValue: RequestTypeSingleValue }}
          />
        </FormGroup>
      </>
    );
  }

  function renderItems() {
    return (
      <>
        {isEnabled("sales") && (
          <PortableDeals mainType="ticket" mainTypeId={props.item._id} />
        )}
        {isEnabled("purchases") && (
          <PortablePurchase mainType="ticket" mainTypeId={props.item._id} />
        )}

        {isEnabled("tasks") && (
          <PortableTasks mainType="ticket" mainTypeId={props.item._id} />
        )}

        {loadDynamicComponent(
          "ticketRightSidebarSection",
          {
            id: props.item._id,
            mainType: "ticket",
            mainTypeId: props.item._id,
            object: props.item,
          },
          true
        )}
      </>
    );
  }

  const renderChildrenSection = () => {
    const { item, options } = props;

    const updatedProps = {
      ...props,
      type: "ticket",
      itemId: item._id,
      stageId: item.stageId,
      pipelineId: item.pipeline._id,
      options,
      queryParams: queryString.parse(window.location.search) || {},
    };

    return <ChildrenSection {...updatedProps} />;
  };

  function renderFormContent({
    state,
    copy,
    remove,
    saveItem,
    onChangeStage,
  }: IEditFormContent) {
    const {
      options,
      onUpdate,
      addItem,
      sendToBoard,
      updateTimeTrack,
      currentUser,
    } = props;

    const renderSidebar = () => renderSidebarFields(saveItem);

    return (
      <>
        <Top
          options={options}
          stageId={state.stageId}
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
            item={item}
            addItem={addItem}
            sendToBoard={sendToBoard}
            onChangeStage={onChangeStage}
            onChangeRefresh={() => setRefresh(!refresh)}
            widgetComments={isTicketType ? widgetComments : []}
            onAddComment={isTicketType ? handleAddComment : undefined}
            onDeleteComment={isTicketType ? handleDeleteComment : undefined}
            currentUser={currentUser}
          />

          <Sidebar
            options={options}
            item={item}
            sidebar={renderSidebar}
            saveItem={saveItem}
            renderItems={renderItems}
            updateTimeTrack={updateTimeTrack}
            childrenSection={renderChildrenSection}
            currentUser={currentUser}
          />
        </Flex>
      </>
    );
  }

  const extendedProps = {
    ...props,
    formContent: renderFormContent,
    extraFields: { source },
    refresh,
    synchSingleCard: (itemId: string) => {
      if (props.synchSingleCard) {
        props.synchSingleCard(itemId);
      }
    },
  };

  return <EditForm {...extendedProps} />;
}
