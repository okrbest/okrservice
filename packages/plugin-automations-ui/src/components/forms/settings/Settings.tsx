import {
  DateControlWrapper,
  LeftSidebar,
  SettingsContent,
  SettingsLayout,
  SpecificTimeContainer,
} from "../../../styles";

import Button from "@erxes/ui/src/components/Button";
import DateControl from "@erxes/ui/src/components/form/DateControl";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import Icon from "@erxes/ui/src/components/Icon";
import OnlineHours from "../../OnlineHours";
import React from "react";
import UnEnrollment from "../../../containers/forms/settings/UnEnrollment";
import { __ } from "coreui/utils";
import dayjs from "dayjs";

type Props = {
  hours: any[];
};

type State = {
  currentTab: string;
  time: string;
  selectedOption: any;
  hours: any[];
  date: any;
  dates: any[];
  isAnnulay: boolean;
};

class Settings extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: "general",
      time: "any",
      hours: (props.hours || []).map((hour) => ({ ...hour })),
      selectedOption: {},
      date: dayjs(new Date()).format("YYYY-MM-DD"),
      dates: [],
      isAnnulay: false,
    };
  }

  onClickTab = (currentTab: string) => {
    this.setState({ currentTab });
  };

  onChangeTimeType = (e) => {
    this.setState({ time: e.target.value });
  };

  onChangeAnnually = (e) => {
    this.setState({ isAnnulay: e.target.checked });
  };

  onChangeHours = (hours) => {
    this.setState({ hours });
  };

  onDateChange = (date) => {
    this.setState({ date });
  };

  add = () => {
    const { dates } = this.state;

    dates.push({
      _id: Math.random().toString(),
      name: "",
    });

    this.setState({ dates });
  };

  onRemove = (dateId) => {
    let dates = this.state.dates;

    dates = dates.filter((date) => date._id !== dateId);

    this.setState({ dates });
  };

  renderSpecificTime() {
    const { time } = this.state;

    if (time !== "specific") {
      return null;
    }

    return (
      <SpecificTimeContainer>
        <OnlineHours
          prevOptions={this.props.hours || []}
          onChange={this.onChangeHours}
        />
      </SpecificTimeContainer>
    );
  }

  renderDate(item) {
    const remove = () => {
      this.onRemove(item._id);
    };

    return (
      <div className="date-row">
        <DateControl
          value={this.state.date}
          required={false}
          name="date"
          onChange={(date) => this.onDateChange(date)}
          placeholder={__("Start date")}
          dateFormat={"YYYY-MM-DD"}
        />

        <FormControl
          componentclass="checkbox"
          value={this.state.isAnnulay}
          onChange={this.onChangeAnnually}
        >
          {__("Annually")}
        </FormControl>

        <Button size="small" btnStyle="danger" onClick={remove}>
          <Icon icon="cancel-1" />
        </Button>
      </div>
    );
  }

  renderContent() {
    const { currentTab } = this.state;

    if (currentTab === "general") {
      return (
        <div>
          <h3>{currentTab}</h3>
          <div>
            <p>{__("What times do you want the actions to execute")}?</p>
            <FormGroup>
              <FormControl
                componentclass="checkbox"
                value="any"
                onChange={this.onChangeTimeType}
                inline={true}
              >
                {__("Any time")}
              </FormControl>

              <FormControl
                componentclass="checkbox"
                value="specific"
                onChange={this.onChangeTimeType}
                inline={true}
              >
                {__("Specific times")}
              </FormControl>
            </FormGroup>
            {this.renderSpecificTime()}
          </div>

          <div>
            <p>
              {
                __("What upcoming dates do you want to pause actions from executing?")
              }
              ?
            </p>
            <DateControlWrapper>
              {this.state.dates.map((date, index) => (
                <React.Fragment key={index}>
                  {this.renderDate(date)}
                </React.Fragment>
              ))}
              <Button
                btnStyle="success"
                size="small"
                onClick={this.add}
                icon="add"
              >
                Add another dates
              </Button>
            </DateControlWrapper>
          </div>
        </div>
      );
    }

    return <UnEnrollment />;
  }

  render() {
    const { currentTab } = this.state;

    return (
      <SettingsLayout>
        <LeftSidebar>
          <li
            className={currentTab === "general" ? "active" : ""}
            onClick={this.onClickTab.bind(this, "general")}
          >
            General
          </li>
          <li
            className={currentTab === "suppression" ? "active" : ""}
            onClick={this.onClickTab.bind(this, "suppression")}
          >
            Unenrollment and Suppression
          </li>
        </LeftSidebar>
        <SettingsContent>{this.renderContent()}</SettingsContent>
      </SettingsLayout>
    );
  }
}

export default Settings;
