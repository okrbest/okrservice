import dayjs from "dayjs";
import { IUser } from "@erxes/ui/src/auth/types";
import DropdownToggle from "@erxes/ui/src/components/DropdownToggle";
import FormControl from "@erxes/ui/src/components/form/Control";
import Form from "@erxes/ui/src/components/form/Form";
import FormGroup from "@erxes/ui/src/components/form/Group";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Icon from "@erxes/ui/src/components/Icon";
import { ModalFooter } from "@erxes/ui/src/styles/main";
import { IButtonMutateProps, IFormProps } from "@erxes/ui/src/types";
import { __ } from "coreui/utils";
import React from "react";
import Dropdown from "@erxes/ui/src/components/Dropdown";
import Dialog from "@erxes/ui/src/components/Dialog";
import { CalendarForm } from "../styles";
import { IAccount, IEvent, INylasCalendar } from "../types";
import { milliseconds } from "../utils";
import { CalendarConsumer } from "./Wrapper";

type Props = {
  isPopupVisible: boolean;
  onHideModal: (date?: Date) => void;
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  selectedDate?: Date;
  event?: IEvent;
  account?: IAccount;
};

type FinalProps = {
  accounts: IAccount[];
  currentUser?: IUser;
} & Props;

type State = {
  calendar: INylasCalendar;
  accountId?: string;
};

class EditForm extends React.Component<FinalProps, State> {
  constructor(props) {
    super(props);
    const { currentUser, accounts } = props;
    let account = props.account;

    if (!account && currentUser) {
      account =
        accounts.find((cal) => {
          return cal.isPrimary && cal.userId === currentUser._id;
        }) || accounts[0];
    }

    this.state = {
      accountId: account && account.accountId,
      calendar: account && account.calendars[0],
    };

    this.hideModal = this.hideModal.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.account !== this.props.account) {
      const { accounts, currentUser, event } = nextProps;

      let account = nextProps.account;

      if (!account && currentUser) {
        account =
          accounts.find((cal) => {
            return cal.isPrimary && cal.userId === currentUser._id;
          }) || accounts[0];
      }

      if (account.accountId) {
        this.setState({
          accountId: account.accountId,
          calendar: !event
            ? account.calendars[0]
            : account.calendars.find(
                (cal) => cal.providerCalendarId === event.providerCalendarId
              ),
        });
      }
    }
  }

  dateDefaulValue = (start?: boolean) => {
    const { selectedDate, event } = this.props;
    let day = dayjs(selectedDate || new Date()).set("hour", start ? 13 : 14);

    if (event && event.when) {
      const time = start ? event.when.start_time : event.when.end_time;
      day = dayjs(time ? milliseconds(time) : new Date());
    }

    return day.format("YYYY-MM-DD HH:mm");
  };

  onChangeCalendar = (calendar, accountId) => {
    this.setState({ calendar, accountId });
  };

  hideModal() {
    this.setState({ accountId: "" });
    this.props.onHideModal();
  }

  renderContent = (formProps: IFormProps) => {
    const { values, isSubmitted } = formProps;
    const { renderButton, event, accounts } = this.props;
    const { calendar } = this.state;

    const renderAccounts = () => {
      return (
        <Dropdown
          as={DropdownToggle}
          toggleComponent={
            <>
              {calendar ? calendar.name : "Select calendar"}
              <Icon icon="angle-down" />
            </>
          }
        >
          <ul>
            {accounts.map((acc) => {
              return (
                <li key={acc._id}>
                  {acc.name}
                  <ul>
                    {acc.calendars.map((cal) => {
                      return (
                        <li
                          key={cal._id}
                          onClick={this.onChangeCalendar.bind(
                            this,
                            cal,
                            acc.accountId
                          )}
                        >
                          <Icon
                            icon={"circle"}
                            style={{
                              color: cal.color || (acc && acc.color),
                            }}
                          />{" "}
                          &nbsp;
                          {cal.name}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Dropdown>
      );
    };

    return (
      <CalendarForm>
        {renderAccounts()}

        <FormGroup>
          <ControlLabel required={true}>Title</ControlLabel>

          <FormControl
            {...formProps}
            name="title"
            autoFocus={true}
            required={true}
            defaultValue={event && event.title}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Description</ControlLabel>

          <FormControl
            {...formProps}
            name="description"
            componentclass="textarea"
            rows={5}
            defaultValue={event && event.description}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>Start Date</ControlLabel>

          <FormControl
            {...formProps}
            name="start"
            componentclass="datetime-local"
            defaultValue={this.dateDefaulValue(true)}
          />
        </FormGroup>

        <FormGroup>
          <ControlLabel>End Date</ControlLabel>

          <FormControl
            {...formProps}
            name="end"
            componentclass="datetime-local"
            defaultValue={this.dateDefaulValue()}
          />
        </FormGroup>

        <ModalFooter>
          {renderButton({
            values: {
              ...values,
              accountId: this.state.accountId,
              calendarId: calendar.providerCalendarId,
            },
            isSubmitted,
            callback: this.hideModal,
          })}
        </ModalFooter>
      </CalendarForm>
    );
  };

  render() {
    if (!this.state.calendar) {
      return null;
    }

    return (
      <Dialog
        show={this.props.isPopupVisible}
        closeModal={this.hideModal}
        title={__(`${this.props.event ? "Edit" : "Create"}  Event`)}
      >
        <Form renderContent={this.renderContent} />
      </Dialog>
    );
  }
}

const WithConsumer = (props: Props) => {
  return (
    <CalendarConsumer>
      {({ currentUser, accounts }) => (
        <EditForm {...props} currentUser={currentUser} accounts={accounts} />
      )}
    </CalendarConsumer>
  );
};

export default WithConsumer;
