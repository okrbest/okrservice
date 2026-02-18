import {
  Button,
  CalenderWrapper,
  CheckBoxWrapper,
  CloseDateContent,
  CloseDateWrapper,
  DateGrid,
} from "../../styles/popup";
import { generateButtonClass, selectOptions } from "../../utils";
import { __ } from "@erxes/ui/src/utils";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Datetime from "@nateradebaugh/react-datetime";
import FormControl from "@erxes/ui/src/components/form/Control";
import Popover from "@erxes/ui/src/components/Popover";
import { REMINDER_MINUTES } from "../../constants";
import React from "react";
import { flushSync } from "react-dom";
import Select from "react-select";
import dayjs from "dayjs";
import client from "@erxes/ui/src/apolloClient";

type Props = {
  closeDate: Date;
  startDate: Date;
  createdDate: Date;
  isCheckDate?: boolean;
  isComplete: boolean;
  reminderMinute: number;
  onChangeField: (
    name: "closeDate" | "reminderMinute" | "isComplete",
    value: any
  ) => void;
  stage?: any;
};

type State = {
  dueDate: Date | null;
  popoverOpenKey: number;
};

class CloseDate extends React.Component<Props, State> {
  private ref;
  private overlay: any;

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      dueDate: props.closeDate || null,
      popoverOpenKey: 0,
    };
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    if (nextProps.closeDate !== undefined && nextProps.closeDate !== null) {
      return { ...prevState, dueDate: nextProps.closeDate };
    }
    return null;
  }

  componentDidMount() {
    const { stage, closeDate, isComplete, onChangeField } = this.props;
    
    // 마운트 시에도 마지막 단계이고 closeDate가 설정되어 있으면 자동으로 isComplete를 true로 설정
    if (stage?.probability === 'Resolved' && closeDate && !isComplete) {
      onChangeField("isComplete", true);
      // Apollo Client 캐시를 실제로 무효화하고 이벤트 발생
      this.invalidateAndRefresh();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { stage, closeDate, isComplete, onChangeField } = this.props;
    
    
    // probability가 'Resolved'인 경우 마지막 단계로 간주
    const isLastStage = stage?.probability === 'Resolved';
    

    
    // 마지막 단계이고 closeDate가 설정되어 있고, isComplete가 false인 경우에만 설정
    // 이전 상태와 비교하여 실제로 변경이 발생했을 때만 처리
    if (isLastStage && closeDate && !isComplete && prevProps.isComplete !== isComplete) {
      onChangeField("isComplete", true);
      // Apollo Client 캐시를 실제로 무효화하고 이벤트 발생
      this.invalidateAndRefresh();
    }
    
    // isComplete가 true로 변경되었을 때도 이벤트 발생
    if (isComplete && !prevProps.isComplete) {
      this.invalidateAndRefresh();
    }
  }

  setOverlay = (overlay) => {
    this.overlay = overlay;
  };

  minuteOnChange = ({ value }: any) => {
    this.props.onChangeField("reminderMinute", parseInt(value, 10));
  };

  dateOnChange = (date) => {
    this.setState({ dueDate: date });
  };

  onSave = (close) => {
    const { dueDate } = this.state;
    const { startDate } = this.props;
    const toSave = dueDate ?? dayjs();

    // 시작일이 비어 있으면 마감일을 설정할 수 없음
    if (!startDate) {
      alert(__("시작일을 먼저 설정해주세요."));
      return;
    }

    this.props.onChangeField("closeDate", toSave);
    close();
  };

  remove = (close) => {
    this.setState({ dueDate: null });
    this.props.onChangeField("closeDate", null);
    close();
  };

  invalidateAndRefresh = () => {
    
    // Apollo Client를 통한 강력한 캐시 무효화 및 리프레시
    if (client && client.cache) {
      try {
        
        // 1. 모든 tickets 관련 쿼리 리프레시
        client.refetchQueries({
          include: 'all'  // 모든 쿼리 리프레시
        });
        
        // 2. localStorage 플래그 설정
        localStorage.setItem("cacheInvalidated", "true");
        
        // 3. 이벤트 발생
        const event = new CustomEvent('ticketUpdated', { 
          detail: { 
            isComplete: true 
          } 
        });
        window.dispatchEvent(event);
        
      } catch (error) {
        
        // 실패 시 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  renderContent = (close) => {
    const { reminderMinute, isCheckDate, createdDate } = this.props;
    const { dueDate } = this.state;
    const displayDate = dueDate ?? dayjs().toDate();

    const checkedDate = new Date(
      Math.max(new Date(displayDate).getTime(), new Date(createdDate).getTime())
    );
    const day = isCheckDate
      ? dayjs(checkedDate).format("YYYY-MM-DD")
      : dayjs(displayDate).format("YYYY-MM-DD");

    const time = dayjs(displayDate).format("HH:mm");

    const renderValidDate = (current) => {
      return isCheckDate
        ? dayjs(current).isAfter(dayjs(createdDate).subtract(1, "day"))
        : true;
    };

    const onChangeDateTime = (e) => {
      const type = e.target.type;
      const value = e.target.value;

      const oldDay = dayjs(displayDate).format("YYYY/MM/DD");
      const oldTime = dayjs(displayDate).format("HH:mm");
      let newDate: Date;

      if (type === "date") {
        newDate = new Date(value.concat(" ", oldTime));
      } else {
        newDate = new Date(oldDay.concat(" ", value));
      }

      this.setState({ dueDate: newDate });
    };

    return (
      <CloseDateContent>
        <DateGrid>
          <div>
            <ControlLabel>Date</ControlLabel>
            <input type="date" value={day} onChange={onChangeDateTime} />
          </div>
          <div>
            <ControlLabel>Time</ControlLabel>
            <input type="time" value={time} onChange={onChangeDateTime} />
          </div>
        </DateGrid>

        <CalenderWrapper>
          <Datetime
            inputProps={{ placeholder: "Click to select a date" }}
            dateFormat="YYYY/MM/DD"
            timeFormat="HH:mm"
            value={displayDate}
            closeOnSelect={true}
            utc={true}
            input={false}
            isValidDate={renderValidDate}
            onChange={this.dateOnChange}
            defaultValue={dayjs().format("YYYY-MM-DD HH:mm:ss")}
          />
        </CalenderWrapper>

        <ControlLabel>Set reminder</ControlLabel>

        <Select
          required={true}
          value={
            reminderMinute
              ? selectOptions(REMINDER_MINUTES).filter(
                  (o) => o.value === reminderMinute.toString()
                )
              : null
          }
          onChange={this.minuteOnChange}
          options={selectOptions(REMINDER_MINUTES)}
          isClearable={false}
          menuPlacement="top"
        />

        <DateGrid>
          <Button colorname="red" onClick={() => this.remove(close)}>
            {__("Remove")}
          </Button>
          <Button colorname="green" onClick={() => this.onSave(close)}>
            {__("Save")}
          </Button>
        </DateGrid>
      </CloseDateContent>
    );
  };

  render() {
    const { isComplete, onChangeField, closeDate, startDate, stage } = this.props;
    const time = dayjs(closeDate).format("HH:mm");

    const onChange = (e) => onChangeField("isComplete", e.target.checked);

    // probability가 'Resolved'인 경우 마지막 단계로 간주
    const isLastStage = stage?.probability === 'Resolved';
    

    const trigger = (
      <span
        onClick={() => {
          flushSync(() =>
            this.setState({
              popoverOpenKey: Date.now(),
              ...(this.props.closeDate != null ? {} : { dueDate: null }),
            })
          );
        }}
        style={{ display: "inline-block" }}
      >
        <Button
          colorname={generateButtonClass(closeDate, isComplete)}
          disabled={!startDate}
          title={!startDate ? __("시작일을 먼저 설정해주세요.") : ""}
        >
          {closeDate
            ? `${dayjs(closeDate).format("MMM DD")} at ${time}`
            : __("Close date")}
        </Button>
      </span>
    );

    return (
      <CloseDateWrapper ref={this.ref}>
        <Popover
          placement="bottom-end"
          trigger={trigger}
          closeAfterSelect={true}
        >
          {(close) => (
            <React.Fragment key={this.state.popoverOpenKey}>
              {this.renderContent(close)}
            </React.Fragment>
          )}
        </Popover>
        {closeDate && (
          <CheckBoxWrapper>
            <FormControl
              checked={isComplete}
              componentclass="checkbox"
              onChange={onChange}
              disabled={isLastStage} // 마지막 단계일 때는 체크박스 비활성화
            />

          </CheckBoxWrapper>
        )}
      </CloseDateWrapper>
    );
  }
}

export default CloseDate;

