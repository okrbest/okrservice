import { IEditFormContent, IOptions } from "../../boards/types";
import { ITicket, ITicketParams } from "../types";
import React, { useEffect, useState } from "react";
import Select, { components } from "react-select";
import { __ } from "@erxes/ui/src/utils";
import { loadDynamicComponent } from "@erxes/ui/src/utils";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { useIsMobile } from "../../boards/utils/mobile";
import { MobileLayoutComponent } from "../../boards/components/editForm/MobileLayout";
import MobileSidebar from "../../boards/components/editForm/MobileSidebar";
import { Alert, confirm } from "@erxes/ui/src/utils";

import { Capitalize } from "@erxes/ui-settings/src/permissions/styles";
import ChildrenSection from "../../boards/containers/editForm/ChildrenSection";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import EditForm from "../../boards/components/editForm/EditForm";
import styled from "styled-components";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { ISelectedOption } from "@erxes/ui/src/types";

// PC용 Flex 레이아웃 컴포넌트
const Flex = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`;
import { IUser } from "@erxes/ui/src/auth/types";
import Left from "../../boards/components/editForm/Left";
import PortableDeals from "@erxes/ui-sales/src/deals/components/PortableDeals";
import PortablePurchase from "@erxes/ui-purchases/src/purchases/components/PortablePurchases";
import PortableTasks from "@erxes/ui-tasks/src/tasks/components/PortableTasks";
import PortableTickets from "./PortableTickets";
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
      updatedAt
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

// WidgetComments 수정 뮤테이션
const WIDGET_COMMENTS_EDIT_MUTATION = gql`
  mutation widgetsTicketCommentEdit($_id: String!, $content: String!) {
    widgetsTicketCommentEdit(_id: $_id, content: $content) {
      _id
      content
      createdAt
      updatedAt
    }
  }
`;

const AUTOMATION_TRIGGER_MUTATION = gql`
  mutation AutomationTriggerManual($type: String!, $targets: [JSON]!) {
    automationTriggerManual(type: $type, targets: $targets) {
      success
      message
    }
  }
`;

export default function TicketEditForm(props: Props) {
  const { item } = props;
  const [source, setSource] = useState(item.source);
  const [isCheckUserTicket, setIsCheckUserTicket] = useState(
    item.isCheckUserTicket
  );
  const [requestType, setRequestType] = useState(item.requestType);
  const [functionCategory, setFunctionCategory] = useState(item.functionCategory);
  const [refresh, setRefresh] = useState(false);

  // saveItem을 래핑하여 저장 후 자동으로 UI 새로고침
  const [localItem, setLocalItem] = useState(item);
  
  // props.item이 변경되면 localItem도 업데이트
  useEffect(() => {
    setLocalItem(item);
  }, [item]);
  
  const saveItem = (doc: any, callback?: (item) => void) => {
    if (doc.attachments) {
      console.log(`[TicketEditForm] saveItem 호출 - attachments 길이: ${doc.attachments.length}`);
    }
    props.saveItem(doc, (updatedItem) => {
      console.log('💾 saveItem 완료, 업데이트된 item:', updatedItem);
      console.log('🔍 emailSent:', updatedItem?.emailSent, 'widgetAlarm:', updatedItem?.widgetAlarm, 'manualEmailRequest:', updatedItem?.manualEmailRequest);
      
      // 로컬 state 즉시 업데이트
      setLocalItem(updatedItem);
      
      // callback 실행
      if (callback) {
        callback(updatedItem);
      }
      
      // description이나 emailSent가 변경된 경우 UI 새로고침
      if (doc.description !== undefined || doc.manualEmailRequest === true) {
        console.log('🔄 UI 새로고침 예약');
        // onUpdate를 호출하여 상위 컴포넌트에 업데이트 알림
        if (props.onUpdate) {
          props.onUpdate(updatedItem);
        }
        setTimeout(() => {
          setRefresh(prev => !prev);
        }, 100); // 100ms로 단축
      }
    });
  };

  // CardDetailAction.tsx와 동일한 방식으로 type 설정
  const type = item.stage?.type || "ticket";

  // type이 "ticket"이 아닐 때는 댓글 기능 비활성화
  const isTicketType = type === "ticket";
  
  // 모바일 여부 확인
  const isMobile = useIsMobile();

  // 자동화 트리거 mutation
  const [triggerAutomation] = useMutation(AUTOMATION_TRIGGER_MUTATION);

  // 수동 이메일 발송 함수 (자동화 트리거만 발동)
  const handleSendEmail = () => {
    console.log('🚀 Send Email 버튼 클릭됨');
    
    // 확인 팝업 표시 - 확인을 누르면 then이 실행되고, 취소를 누르면 아무것도 실행되지 않음
    confirm(
      __("정말로 알림 이메일을 전송하시겠습니까?"),
      {
        okLabel: __("전송"),
        cancelLabel: __("취소"),
      }
    ).then(() => {
      // 사용자가 확인을 누른 경우에만 실행
      console.log('📝 manualEmailRequest를 true로 설정하여 자동화 트리거 활성화...');
      
      // manualEmailRequest를 true로 설정하여 자동화 트리거 활성화
      // 서버에서 자동화 처리 후 자동으로 false로 리셋되고 emailSent가 true로 변경됨
      saveItem({ manualEmailRequest: true }, (updatedItem) => {
        console.log('✅ saveItem callback 실행 - 업데이트된 item:', updatedItem);
        console.log('🔍 emailSent:', updatedItem?.emailSent, 'manualEmailRequest:', updatedItem?.manualEmailRequest);
        
        // onUpdate를 호출하여 상위 컴포넌트에 업데이트 알림
        if (props.onUpdate) {
          props.onUpdate(updatedItem);
        }
        
        // 서버에서 emailSent를 업데이트하는데 시간이 걸릴 수 있으므로
        // 약간의 지연 후 다시 확인하여 UI 새로고침
        setTimeout(() => {
          console.log('🔄 지연 후 UI 새로고침');
          setRefresh(prev => !prev);
          
          // onUpdate를 다시 호출하여 최신 데이터 반영
          if (props.onUpdate && updatedItem) {
            props.onUpdate(updatedItem);
          }
        }, 500);
      });
      
      console.log('✅ manualEmailRequest 설정 완료 - 자동화 트리거가 발동됩니다');
      Alert.success("이메일이 발송되었습니다.");
    }).catch((error: any) => {
      // 오류 발생 시에만 실행 (취소는 catch되지 않음)
      console.error('❌ 이메일 발송 에러:', error);
      Alert.error("이메일 발송에 실패했습니다: " + (error?.message || '알 수 없는 오류'));
    });
  };

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
      refetchWidgetComments();
      
      // 담당자가 댓글을 추가한 경우 emailSent를 false로 설정하여 Send Email 버튼 활성화
      console.log('💬 댓글 추가 완료 - emailSent를 false로 업데이트하여 Send Email 버튼 활성화');
      setLocalItem((prev: any) => ({
        ...prev,
        emailSent: false,
        widgetAlarm: false
      }));
      
      // UI 새로고침
      setTimeout(() => {
        setRefresh(prev => !prev);
      }, 100);
    },
    onError: (error) => {
      console.error("Failed to add comment:", error);
      alert(`댓글 추가 실패: ${error.message}`);
    },
  });

  // WidgetComments 삭제 뮤테이션 (ticket 타입일 때만)
  const [deleteWidgetComment] = useMutation(WIDGET_COMMENTS_DELETE_MUTATION, {
    onCompleted: (data) => {
      // 삭제 성공 시 댓글 목록 새로고침
      refetchWidgetComments();
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
      alert(`댓글 삭제 실패: ${error.message}`);
    },
  });

  // WidgetComments 수정 뮤테이션 (ticket 타입일 때만)
  const [editWidgetComment] = useMutation(WIDGET_COMMENTS_EDIT_MUTATION, {
    onCompleted: (data) => {
      // 수정 성공 시 댓글 목록 새로고침
      refetchWidgetComments();
    },
    onError: (error) => {
      console.error("Failed to edit comment:", error);
      alert(`댓글 수정 실패: ${error.message}`);
    },
  });

  const widgetComments = widgetCommentsData?.widgetsTicketComments || [];

  // 댓글 추가 핸들러 (ticket 타입일 때만)
  const handleAddComment = async (content: string) => {
    if (!isTicketType) {
      return;
    }

   
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
      return result;
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  };

  // 댓글 삭제 핸들러 (ticket 타입일 때만)
  const handleDeleteComment = async (commentId: string) => {
    if (!isTicketType) {
      return;
    }


    
    try {
      // 댓글 삭제 뮤테이션 실행
      const result = await deleteWidgetComment({
        variables: { _id: commentId }
      });
      
      
      // 삭제 성공 시 댓글 목록 새로고침
      if (result.data?.widgetsTicketCommentsRemove) {
        refetchWidgetComments();
      }
      
      return result;
    } catch (error) {
      console.error("Failed to delete comment:", error);
      throw error;
    }
  };

  // 댓글 수정 핸들러 (ticket 타입일 때만)
  const handleEditComment = async (commentId: string, content: string) => {
    if (!isTicketType) {
      return;
    }

    
    try {
      // 댓글 수정 뮤테이션 실행
      const result = await editWidgetComment({
        variables: { 
          _id: commentId,
          content: content
        }
      });
      
      
      // 수정 성공 시 댓글 목록 새로고침
      if (result.data?.widgetsTicketCommentEdit) {
        refetchWidgetComments();
      }
      
      return result;
    } catch (error) {
      console.error("Failed to edit comment:", error);
      throw error;
    }
  };

  useEffect(() => {
    setSource(item.source);
    setRequestType(item.requestType);
    setFunctionCategory(item.functionCategory);
  }, [item.source, item.requestType, item.functionCategory]);

  function renderSidebarFields(saveItem) {
    
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
      { label: "오류처리", value: "error" },
      { label: "설정변경", value: "config" },
      { label: "추가개발", value: "additional_development" },
      { label: "사용안내", value: "usage_guide" }
    ];

    const requestTypeValueRenderer = (option: ISelectedOption): React.ReactNode => (
      <Capitalize>{option.label}</Capitalize>
    );

    const onRequestTypeChange = (option) => {
      const value = option ? option.value : "";


      setRequestType(value);

      if (saveItem) {
        saveItem({ requestType: value });
      } 
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

    // 기능분류 필드
    const functionCategoryValues = [
      { label: "인사", value: "hr" },
      { label: "조직", value: "organization" },
      { label: "근태", value: "attendance" },
      { label: "급여", value: "payroll" },
      { label: "평가", value: "evaluation" },
      { label: "교육", value: "education" },
      { label: "채용", value: "recruitment" },
      { label: "복리후생", value: "benefits" },
      { label: "PCOFF", value: "pcoff" },
      { label: "전자결재", value: "approval" },
      { label: "시스템", value: "system" }
    ];

    const onFunctionCategoryChange = (option) => {
      const value = option ? option.value : "";
      setFunctionCategory(value);
      if (saveItem) {
        saveItem({ functionCategory: value });
      }
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

        <FormGroup>
          <ControlLabel>기능분류</ControlLabel>
          <Select
            placeholder="기능분류를 선택하세요"
            value={functionCategoryValues.find((f) => f.value === functionCategory)}
            options={functionCategoryValues}
            onChange={onFunctionCategoryChange}
            isClearable={true}
          />
        </FormGroup>
      </>
    );
  }

  function renderItems() {
    return (
      <>
        <PortableTickets mainType="ticket" mainTypeId={props.item._id} />
        
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
    const onCloseDateFieldsChange = (key: string, value: any) => {
      saveItem({ [key]: value });
    };
    const {
      options,
      onUpdate,
      addItem,
      sendToBoard,
      updateTimeTrack,
      currentUser,
    } = props;

    // localItem을 사용하여 최신 상태 반영 (saveItem 호출 후 즉시 업데이트됨)
    const currentItem = localItem;

    const renderSidebar = () => renderSidebarFields(saveItem);

    // 모바일일 때만 새로운 레이아웃 사용
    if (isMobile) {
      const leftProps = {
        options,
        saveItem,
        copyItem: copy,
        removeItem: remove,
        onUpdate,
        item: currentItem,
        addItem,
        sendToBoard,
        onChangeStage,
        onChangeRefresh: () => setRefresh(!refresh),
        widgetComments: isTicketType ? widgetComments : [],
        onAddComment: isTicketType ? handleAddComment : undefined,
        onDeleteComment: isTicketType ? handleDeleteComment : undefined,
        onEditComment: isTicketType ? handleEditComment : undefined,
        currentUser,
        onSendEmail: handleSendEmail,
      };

      const sidebarProps = {
        options,
        item: currentItem,
        sidebar: renderSidebar,
        saveItem,
        renderItems,
        updateTimeTrack,
        childrenSection: renderChildrenSection,
        currentUser,
      };

      return (
        <>
          <Top
            options={options}
            stageId={state.stageId}
            item={currentItem}
            saveItem={saveItem}
            onChangeStage={onChangeStage}
          />

          <MobileLayoutComponent
            isMobile={true}
            sidebarContent={<MobileSidebar {...sidebarProps} />}
            item={currentItem}
            onCloseDateFieldsChange={onCloseDateFieldsChange}
          >
            <Left {...leftProps} />
          </MobileLayoutComponent>
        </>
      );
    }

    // PC일 때는 기존 레이아웃 그대로 사용
    return (
      <>
        <Top
          options={options}
          stageId={state.stageId}
          item={currentItem}
          saveItem={saveItem}
          onChangeStage={onChangeStage}
          onSendEmail={handleSendEmail}
        />

        <Flex>
          <Left
            options={options}
            saveItem={saveItem}
            copyItem={copy}
            removeItem={remove}
            onUpdate={onUpdate}
            item={currentItem}
            addItem={addItem}
            sendToBoard={sendToBoard}
            onChangeStage={onChangeStage}
            onChangeRefresh={() => setRefresh(!refresh)}
            widgetComments={isTicketType ? widgetComments : []}
            onAddComment={isTicketType ? handleAddComment : undefined}
            onDeleteComment={isTicketType ? handleDeleteComment : undefined}
            onEditComment={isTicketType ? handleEditComment : undefined}
            currentUser={currentUser}
            onSendEmail={handleSendEmail}
          />

          <Sidebar
            options={options}
            item={currentItem}
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
