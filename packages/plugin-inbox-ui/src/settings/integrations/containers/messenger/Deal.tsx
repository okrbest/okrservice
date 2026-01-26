import {
  BoardsQueryResponse,
  IPipeline
} from "@erxes/ui-sales/src/boards/types";
import React, { useEffect, useState } from "react";
import General from "../../components/messenger/steps/DealSelector";
import Spinner from "@erxes/ui/src/components/Spinner";
import boardQueries from "@erxes/ui-sales/src/settings/boards/graphql/queries";
import formQueries from "@erxes/ui-forms/src/forms/graphql/queries";
import client from "@erxes/ui/src/apolloClient";
import { gql } from "@apollo/client";
import { isEnabled } from "@erxes/ui/src/utils/core";
import { useQuery } from "@apollo/client";

type DealCustomField = { _id: string; label: string };

type Props = {
  handleFormChange: (name: string, value: string | boolean | string[]) => void;
  dealPipelineId: string;
  dealBoardId: string;
  dealStageId: string;
  dealToggle?: boolean;
  dealCustomFieldIds?: string[];
};

function GeneralContainer(props: Props) {
  const [pipelines, setPipelines] = useState<IPipeline[]>([] as IPipeline[]);
  const [dealFields, setDealFields] = useState<DealCustomField[]>([]);

  const boardsQuery = useQuery<BoardsQueryResponse>(gql(boardQueries.boards), {
    variables: { type: "deal" },
    skip: isEnabled("sales") ? false : true
  });

  const fetchPipelines = (boardId: string) => {
    client
      .query({
        query: gql(boardQueries.pipelines),
        variables: { boardId, type: "deal" }
      })
      .then(({ data = {} }) => {
        setPipelines(data.salesPipelines || []);
      });
  };

  useEffect(() => {
    if (props.dealBoardId) {
      fetchPipelines(props.dealBoardId);
    }
  }, [props.dealBoardId]);

  useEffect(() => {
    const boardId = props.dealBoardId || "";
    const pipelineId = props.dealPipelineId || "";
    if (!boardId || !pipelineId) {
      setDealFields([]);
      return;
    }
    client
      .query({
        query: gql(formQueries.fieldsCombinedByContentType),
        variables: {
          contentType: "sales:deal",
          config: { boardId, pipelineId }
        }
      })
      .then(({ data = {} }) => {
        const fields: any[] = data.fieldsCombinedByContentType || [];
        const custom = fields.filter(
          (f: any) => f.name && String(f.name).startsWith("customFieldsData.")
        );
        const mapped: DealCustomField[] = custom.map((f: any) => {
          const _id = String(f.name).replace(/^customFieldsData\./, "");
          return { _id, label: f.label || f.name || _id };
        });
        setDealFields(mapped);
      })
      .catch(() => setDealFields([]));
  }, [props.dealBoardId, props.dealPipelineId]);

  if (boardsQuery && boardsQuery.loading) {
    return <Spinner />;
  }

  const boards = (boardsQuery.data && boardsQuery.data.salesBoards) || [];

  const updatedProps = {
    ...props,
    boards,
    pipelines,
    tokenPassMethod: "cookie" as "cookie",
    fetchPipelines,
    dealToggle: props.dealToggle,
    dealCustomFieldIds: props.dealCustomFieldIds || [],
    dealFields,
  };
  return <General {...updatedProps} />;
}

export default GeneralContainer;
