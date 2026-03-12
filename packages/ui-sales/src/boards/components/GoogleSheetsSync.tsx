import React, { useState } from "react";
import { gql, useMutation } from "@apollo/client";
import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import FormControl from "@erxes/ui/src/components/form/Control";
import { __, getEnv } from "coreui/utils";
import { Alert } from "@erxes/ui/src/utils";
import { mutations } from "../../deals/graphql";
import { TabContent } from "../styles/rightMenu";

type Props = {
  pipelineId: string;
  closeModal?: () => void;
};

export default function GoogleSheetsSync({ pipelineId, closeModal }: Props) {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [saveToPipeline, setSaveToPipeline] = useState(false);

  const [syncDeals, { loading }] = useMutation(
    gql(mutations.syncDealsToGoogleSheet),
    {
      onCompleted(data) {
        const result = data?.syncDealsToGoogleSheet;
        if (result?.message) {
          Alert.success(
            saveToPipeline
              ? __("저장되었습니다. 이후 딜 추가/변경 시 자동으로 시트에 반영됩니다.")
              : result.message
          );
          closeModal?.();
        }
      },
      onError(e) {
        Alert.error(e.message || "동기화에 실패했습니다.");
      },
    }
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId.trim()) {
      Alert.warning("스프레드시트 ID를 입력해 주세요.");
      return;
    }
    const env = getEnv();
    const fileBaseUrl = env?.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    syncDeals({
      variables: {
        pipelineId,
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim() || "Sheet1",
        saveToPipeline: saveToPipeline || undefined,
        fileBaseUrl: fileBaseUrl || undefined,
      },
    });
  };

  return (
    <TabContent>
      <form onSubmit={onSubmit}>
        <ControlLabel required>{__("Google 스프레드시트 ID")}</ControlLabel>
        <FormControl
          placeholder="예: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          value={spreadsheetId}
          onChange={(e: any) => setSpreadsheetId(e.target.value)}
        />
        <ControlLabel>{__("시트 이름 (선택)")}</ControlLabel>
        <FormControl
          placeholder="Sheet1"
          value={sheetName}
          onChange={(e: any) => setSheetName(e.target.value)}
        />
        <p style={{ fontSize: "11px", color: "#888", marginTop: 8 }}>
          {__(
            "스프레드시트 URL의 /d/ 다음 부분이 ID입니다. 시트를 서비스 계정 이메일과 공유해 두세요."
          )}
        </p>
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <FormControl
            componentclass="checkbox"
            checked={saveToPipeline}
            onChange={(e: any) => setSaveToPipeline(Boolean(e.target.checked))}
          />
          <ControlLabel style={{ marginLeft: 8 }}>
            {__("딜 추가/변경 시 자동 동기화")}
          </ControlLabel>
        </div>
        <p style={{ fontSize: "11px", color: "#888", marginTop: 0, marginBottom: 10 }}>
          {__("체크 후 동기화하면, 이후 이 파이프라인에서 딜이 추가·수정·이동될 때마다 위 시트에 자동 반영됩니다.")}
        </p>
        <Button
          type="submit"
          btnStyle="success"
          icon="sync"
          disabled={loading}
          style={{ marginTop: 10 }}
        >
          {loading ? __("동기화 중...") : __("Google 시트에 동기화")}
        </Button>
      </form>
    </TabContent>
  );
}
