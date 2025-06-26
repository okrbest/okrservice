import Button from "@erxes/ui/src/components/Button";
import DataWithLoader from "@erxes/ui/src/components/DataWithLoader";
import { Header } from "@erxes/ui-settings/src/styles";
import { IButtonMutateProps } from "@erxes/ui/src/types";
import { ITopic } from "@erxes/ui-knowledgebase/src/types";
import KnowledgeForm from "../../containers/knowledge/KnowledgeForm";
import KnowledgeRow from "./KnowledgeRow";
import ModalTrigger from "@erxes/ui/src/components/ModalTrigger";
import React from "react";
import Sidebar from "@erxes/ui/src/layout/components/Sidebar";
import { __ } from "coreui/utils";

type Props = {
  queryParams: any;
  currentCategoryId: string;
  count?: number;
  loading: boolean;
  topics: ITopic[];
  articlesCount: number;
  refetch: () => void;
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  remove: (knowledgeBaseId: string) => void;
};
const KnowledgeList = (props: Props) => {
  const {
    topics,
    loading,
    remove,
    renderButton,
    currentCategoryId,
    queryParams,
    articlesCount,
    refetch,
  } = props;

  const renderSidebarHeader = () => {
    const trigger = (
      <Button btnStyle="success" block={true} icon="plus-circle">
        Add Knowledge Base
      </Button>
    );

    const content = (props) => (
      <KnowledgeForm {...props} renderButton={renderButton} />
    );

    return (
      <Header>
        <ModalTrigger
          title="Add Knowledge Base"
          autoOpenKey="showKBAddModal"
          trigger={trigger}
          content={content}
          enforceFocus={false}
        />
      </Header>
    );
  };

  const renderTopics = () => {
    const mainArticleTopic: ITopic = {
      _id: "main-articles-topic",
      title: __("Main FAQ"),
      description: "",
      brand: {
        _id: "",
        name: "",
        code: "",
        createdAt: "",
        emailConfig: { type: "", template: "" },
      },
      color: "#ffffff",
      backgroundImage: "",
      languageCode: "en",
      createdBy: "",
      createdDate: new Date(),
      modifiedBy: "",
      modifiedDate: new Date(),
      parentCategories: [],
      notificationSegmentId: "",
      categories: [
        {
          _id: "main-category",
          title: __("Main Articles"),
          description: "",
          articles: queryParams?.articles?.filter((a) => a.isPrivate) || [],
          numArticles:
            queryParams?.articles?.filter((a) => a.isPrivate)?.length || 0,
          icon: "",
          createdBy: "",
          createdDate: new Date(),
          modifiedBy: "",
          modifiedDate: new Date(),
          firstTopic: {
            _id: "",
            title: "",
            description: "",
            categories: [],
            brand: {
              _id: "",
              name: "",
              code: "",
              createdAt: "",
              emailConfig: { type: "", template: "" },
            },
            color: "",
            backgroundImage: "",
            languageCode: "",
            createdBy: "",
            createdDate: new Date(),
            modifiedBy: "",
            modifiedDate: new Date(),
            parentCategories: [],
            notificationSegmentId: "",
            code: "",
          },
          parentCategoryId: "",
          code: "",
        },
      ],
    };

    const allTopics = [mainArticleTopic, ...topics];

    return (
      <>
        {allTopics.map((topic) => (
          <KnowledgeRow
            currentCategoryId={currentCategoryId}
            key={topic._id}
            topic={{ ...topic, articles: queryParams?.articles || [] }}
            queryParams={queryParams}
            articlesCount={articlesCount}
            remove={remove}
            renderButton={renderButton}
            refetchTopics={refetch}
          />
        ))}
      </>
    );
  };

  return (
    <Sidebar wide={true} header={renderSidebarHeader()} hasBorder={true}>
      <DataWithLoader
        data={renderTopics()}
        loading={loading}
        count={topics.length}
        emptyText="There is no knowledge base"
        emptyImage="/images/actions/18.svg"
      />
    </Sidebar>
  );
};

export default KnowledgeList;
