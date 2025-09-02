import {
  HeaderContent,
  HeaderContentSmall,
  HeaderRow,
  TitleRow,
} from "../../styles/item";
import { IItem, IOptions } from "../../types";
import React, { useEffect, useState } from "react";

import CloseDate from "./CloseDate";
import { ControlLabel } from "@erxes/ui/src/components/form";
import FormControl from "@erxes/ui/src/components/form/Control";
import Icon from "@erxes/ui/src/components/Icon";
import Move from "../../containers/editForm/Move";
import StartDate from "./StartDate";

type Props = {
  item: IItem;
  options: IOptions;
  stageId: string;
  saveItem: (doc: { [key: string]: any }) => void;
  onChangeStage?: (stageId: string) => void;
  amount?: () => React.ReactNode;
};

function Top(props: Props) {
  const { item } = props;

  const [name, setName] = useState(item.name);

  useEffect(() => {
    // 디버깅: 현재 item 데이터 확인

    // Apollo Client 캐시에서 stage 정보를 가져오는 시도
    if ((window as any).__APOLLO_CLIENT__) {
      try {
        const cache = (window as any).__APOLLO_CLIENT__.cache;
        
        // 캐시에서 stage 정보를 찾아보기
        const cacheData = cache.extract();
        
        // stage 관련 데이터 찾기
        const stageEntries = Object.entries(cacheData).filter(([key, value]) => 
          key.includes('TicketsStage') || (value && typeof value === 'object' && (value as any).__typename === 'TicketsStage')
        );
        
      } catch (error) {
        console.error('Apollo cache access error:', error);
      }
    }
  }, [item]);

  function renderMove() {
    const { stageId, options, onChangeStage } = props;

    return (
      <Move
        options={options}
        item={item}
        stageId={stageId}
        onChangeStage={onChangeStage}
      />
    );
  }

  const { saveItem, amount } = props;

  const onNameBlur = () => {
    if (item.name !== name) {
      saveItem({ name });
    }
  };

  const onCloseDateFieldsChange = (key: string, value: any) => {
    saveItem({ [key]: value });
  };

  const onChangeName = (e) => {
    const itemName = (e.target as HTMLInputElement).value;

    setName(itemName);
    localStorage.setItem(`${props.item._id}Name`, itemName);
  };

  const renderScore = () => {
    const { score } = item;

    if (!score) {
      return null;
    }

    return (
      <HeaderContentSmall>
        <ControlLabel>Score</ControlLabel>
        <p>{score.toLocaleString()}</p>
      </HeaderContentSmall>
    );
  };

  const renderNumber = () => {
    const { number } = item;

    if (!number) {
      return null;
    }

    return (
      <HeaderContentSmall>
        <ControlLabel>Number</ControlLabel>
        <p>{number}</p>
      </HeaderContentSmall>
    );
  };

  return (
    <React.Fragment>
      <HeaderRow>
        <HeaderContent>
          <TitleRow>
            <Icon icon="atm-card" />
            <FormControl
              componentclass="textarea"
              value={name}
              required={true}
              onBlur={onNameBlur}
              onChange={onChangeName}
            />
          </TitleRow>
        </HeaderContent>
        {renderNumber()}
        {renderScore()}
        {amount && amount()}
      </HeaderRow>

      <HeaderRow>
        <HeaderContent>{renderMove()}</HeaderContent>
        <StartDate
          onChangeField={onCloseDateFieldsChange}
          startDate={item.startDate}
          reminderMinute={item.reminderMinute}
        />
        <CloseDate
          onChangeField={onCloseDateFieldsChange}
          closeDate={item.closeDate}
          startDate={item.startDate}
          isCheckDate={item.pipeline.isCheckDate}
          createdDate={item.createdAt}
          reminderMinute={item.reminderMinute}
          isComplete={item.isComplete}
          stage={item.stage}
        />
      </HeaderRow>
    </React.Fragment>
  );
}

export default Top;
