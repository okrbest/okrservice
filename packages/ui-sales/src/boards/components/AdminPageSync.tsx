import React from "react";
import { gql, useMutation } from "@apollo/client";
import Button from "@erxes/ui/src/components/Button";
import { __ } from "coreui/utils";
import { Alert } from "@erxes/ui/src/utils";
import { mutations } from "../../deals/graphql";
import { TabContent } from "../styles/rightMenu";

type Props = {
  pipelineId: string;
};

export default function AdminPageSync({ pipelineId }: Props) {
  const [pushDeals, { loading }] = useMutation(
    gql(mutations.pushPipelineDealsToAdminPage),
    {
      onCompleted(data) {
        const result = data?.pushPipelineDealsToAdminPage;
        if (!result) return;
        const msg = `${result.pushed}건 성공${result.failed > 0 ? ` / ${result.failed}건 실패` : ""}`;
        if (result.failed > 0) {
          Alert.warning(msg);
        } else {
          Alert.success(msg);
        }
      },
      onError(e) {
        Alert.error(e.message || "전송에 실패했습니다.");
      },
    }
  );

  const onPush = () => {
    pushDeals({ variables: { pipelineId } });
  };

  return (
    <TabContent>
      <p style={{ fontSize: "13px", marginBottom: 12 }}>
        {__("이 파이프라인의 모든 딜을 관리 웹페이지로 전송합니다.")}
      </p>
      <Button
        btnStyle="success"
        icon="upload-6"
        disabled={loading}
        onClick={onPush}
      >
        {loading ? __("전송 중...") : __("관리 웹페이지에 동기화")}
      </Button>
    </TabContent>
  );
}
