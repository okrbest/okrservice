import { FlexContent, FlexItem } from "@erxes/ui/src/layout/styles";
import { Half, Recipient, Recipients } from "../styles";
import {
  IEmailTemplate,
  IEngageEmail,
  IEngageMessageDoc,
  IEngageMessenger,
} from "../types";

import Button from "@erxes/ui/src/components/Button";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import RichTextEditor from "@erxes/ui/src/containers/RichTextEditor";
import FormControl from "@erxes/ui/src/components/form/Control";
import FormGroup from "@erxes/ui/src/components/form/Group";
import { IAttachment } from "@erxes/ui/src/types";
import { IBrand } from "@erxes/ui/src/brands/types";
import { ICustomer } from "@erxes/ui-contacts/src/customers/types";
import { IUser } from "@erxes/ui/src/auth/types";
import { MAIL_TOOLBARS_CONFIG } from "@erxes/ui/src/constants/integrations";
import { METHODS } from "../constants";
import MessengerPreview from "../containers/MessengerPreview";
import { ModalFooter } from "@erxes/ui/src/styles/main";
import React from "react";
import Select from "react-select";
import Uploader from "@erxes/ui/src/components/Uploader";
import { __ } from "coreui/utils";
import { generateEmailTemplateParams } from "../utils";

type Props = {
  customers: ICustomer[];
  emailTemplates: IEmailTemplate[];
  brands: IBrand[];
  messengerKinds: any[];
  sentAsChoices: any[];
  save: (doc: IEngageMessageDoc, closeModal: () => void) => void;
  closeModal: () => void;
  channelType?: string;
  currentUser: IUser;
};

type State = {
  content: string;
  channel: string;
  attachments: IAttachment[];
  sentAs: string;
  templateId: string;
  isSaved: boolean;
};

class WidgetForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      content: "",
      channel: props.channelType || "email",
      attachments: [],
      sentAs: "snippet",
      templateId: "",
      isSaved: false,
    };

    this.close = this.close.bind(this);
  }

  save = (e) => {
    e.preventDefault();

    const { save, customers } = this.props;

    const doc = {
      title: (document.getElementById("title") as HTMLInputElement).value,
      customerIds: customers.map((customer) => customer._id),
      method: "",
    } as IEngageMessageDoc;

    if (this.state.channel === "email") {
      doc.method = METHODS.EMAIL;
      doc.email = {
        subject: (document.getElementById("emailSubject") as HTMLInputElement)
          .value,
        attachments: this.state.attachments,
        content: this.state.content,
      } as IEngageEmail;
    }

    if (this.state.channel === "messenger") {
      doc.method = METHODS.MESSENGER;
      doc.messenger = {
        brandId: (document.getElementById("brandId") as HTMLInputElement).value,
        kind: (document.getElementById("messengerKind") as HTMLInputElement)
          .value,
        sentAs: (document.getElementById("sentAs") as HTMLInputElement).value,
        content: this.state.content,
      } as IEngageMessenger;
    }

    return save(doc, () => this.close);
  };

  onChangeCommon = <T extends keyof State>(name: T, value: State[T]) => {
    this.setState({ [name]: value } as unknown as Pick<State, keyof State>);
  };

  onChannelChange = (e) => {
    this.setState({ channel: e.target.value });
  };

  templateChange = (e) => {
    this.setState({ content: this.findTemplate(e.value), templateId: e.value });
  };

  onEditorChange = (content: string) => {
    this.onChangeCommon("content", content);
  };

  onSentAsChange = (e) => {
    this.onChangeCommon("sentAs", e.target.value);
  };

  findTemplate = (id) => {
    const template = this.props.emailTemplates.find((t) => t._id === id);

    if (template) {
      return template.content;
    }

    return "";
  };

  renderReceivers() {
    return (
      <FormGroup>
        <ControlLabel>Sending to:</ControlLabel>
        <Recipients>
          {this.props.customers.map((customer) => (
            <Recipient key={customer._id}>
              <strong>{customer.firstName}</strong>
              <span>({customer.primaryEmail || "Unknown"})</span>
            </Recipient>
          ))}
        </Recipients>
      </FormGroup>
    );
  }

  renderChannelType() {
    if (this.props.channelType) {
      return null;
    }

    return (
      <Half>
        <FormGroup>
          <ControlLabel>Channel:</ControlLabel>
          <FormControl
            componentclass="select"
            onChange={this.onChannelChange}
            defaultValue={this.state.channel}
          >
            <option value="email">{__("Email")}</option>
            <option value="messenger">{__("Messenger")}</option>
          </FormControl>
        </FormGroup>
      </Half>
    );
  }

  close() {
    this.setState({ isSaved: true }, () => {
      this.props.closeModal();
    });
  }

  renderFormContent() {
    const currentUser = this.props.currentUser;

    const editor = (options?) => (
      <RichTextEditor
        {...options}
        content={this.state.content}
        onChange={this.onEditorChange}
        toolbar={MAIL_TOOLBARS_CONFIG}
        name={`engage_widget_${this.state.channel}_${currentUser._id}`}
        isSubmitted={this.state.isSaved}
      />
    );

    if (this.state.channel === "messenger") {
      return (
        <FlexContent>
          <FlexItem>
            <FormGroup>
              <ControlLabel required={true}>Brand:</ControlLabel>

              <FormControl id="brandId" componentclass="select" required={true}>
                <option />
                {this.props.brands.map((b, index) => (
                  <option key={`brand-${index}`} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </FormControl>
            </FormGroup>
            <div>
              <FlexContent>
                <FlexItem>
                  <FormGroup>
                    <ControlLabel required={true}>Messenger kind:</ControlLabel>

                    <FormControl
                      id="messengerKind"
                      componentclass="select"
                      required={true}
                    >
                      <option />
                      {this.props.messengerKinds.map((t, index) => (
                        <option key={`messengerKind-${index}`} value={t.value}>
                          {t.text}
                        </option>
                      ))}
                    </FormControl>
                  </FormGroup>
                </FlexItem>
                <FlexItem hasSpace={true}>
                  <FormGroup>
                    <ControlLabel>Sent as:</ControlLabel>

                    <FormControl
                      id="sentAs"
                      defaultValue={this.state.sentAs}
                      componentclass="select"
                      onChange={this.onSentAsChange}
                    >
                      {this.props.sentAsChoices.map((t, index) => (
                        <option key={`sentAs-${index}`} value={t.value}>
                          {t.text}
                        </option>
                      ))}
                    </FormControl>
                  </FormGroup>
                </FlexItem>
              </FlexContent>
            </div>

            {editor()}
          </FlexItem>

          <FlexItem>
            <MessengerPreview
              sentAs={this.state.sentAs}
              content={this.state.content}
              fromUserId={this.props.currentUser._id}
            />
          </FlexItem>
        </FlexContent>
      );
    }

    const { attachments } = this.state;
    const onChange = (attachmentsAtt) =>
      this.onChangeCommon("attachments", attachmentsAtt);

    const options = generateEmailTemplateParams(this.props.emailTemplates);

    return (
      <>
        <Half>
          <FormGroup>
            <ControlLabel>Email subject:</ControlLabel>
            <FormControl id="emailSubject" type="text" required={true} />
          </FormGroup>

          <FormGroup>
            <ControlLabel>Email templates:</ControlLabel>
            <p>{__("Insert email template to content")}</p>

            <Select
              value={options.find(
                (option) => option.value === this.state.templateId
              )}
              onChange={this.templateChange}
              options={options}
              isClearable={false}
            />
          </FormGroup>
        </Half>

        <FormGroup>{editor({ height: 300 })}</FormGroup>

        <FormGroup>
          <ControlLabel>Attachments:</ControlLabel>
          <Uploader defaultFileList={attachments} onChange={onChange} />
        </FormGroup>
      </>
    );
  }

  render() {
    return (
      <form onSubmit={this.save}>
        {this.renderReceivers()}
        {this.renderChannelType()}

        <Half>
          <FormGroup>
            <ControlLabel required={true}>Title:</ControlLabel>
            <FormControl
              autoFocus={true}
              id="title"
              type="text"
              required={true}
            />
          </FormGroup>
        </Half>

        {this.renderFormContent()}

        <ModalFooter>
          <Button btnStyle="simple" icon="times-circle" onClick={this.close}>
            Close
          </Button>
          <Button type="submit" btnStyle="success" icon="message">
            Send
          </Button>
        </ModalFooter>
      </form>
    );
  }
}

export default WidgetForm;
