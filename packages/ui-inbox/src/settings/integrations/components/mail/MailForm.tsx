import { __ } from "coreui/utils";
import { Alert } from "@erxes/ui/src/utils";
import {
  ControlWrapper,
  EditorFooter,
  EditorFooterGroup,
  MailEditorWrapper,
  Resipients,
  ShowReplies,
  ShowReplyButtonWrapper,
  SpaceBetweenRow,
  ToolBar,
  UploaderWrapper,
} from "./styles";
import { FlexRow, Subject } from "./styles";
import { IEmail, IMail, IMessage } from "@erxes/ui-inbox/src/inbox/types";
import React, { ReactNode } from "react";
import {
  formatObj,
  formatStr,
  generateForwardMailContent,
  generatePreviousContents,
} from "../../containers/utils";
import { isEnabled, readFile } from "@erxes/ui/src/utils/core";

import Attachment from "@erxes/ui/src/components/Attachment";
import Button from "@erxes/ui/src/components/Button";
import { Column } from "@erxes/ui/src/styles/main";
import EmailTemplate from "../../containers/mail/EmailTemplate";
import FormControl from "@erxes/ui/src/components/form/Control";
import { IAttachment } from "@erxes/ui/src/types";
import { IEmailSignature } from "@erxes/ui/src/auth/types";
import { IEmailTemplate } from "../../types";
import { IUser } from "@erxes/ui/src/auth/types";
import Icon from "@erxes/ui/src/components/Icon";
import { Label } from "@erxes/ui/src/components/form/styles";
import { MAIL_TOOLBARS_CONFIG } from "@erxes/ui/src/constants/integrations";
import MailChooser from "./MailChooser";
import { Meta } from "./styles";
import { RichTextEditor } from "@erxes/ui/src/components/richTextEditor/TEditor";
import SignatureChooser from "./SignatureChooser";
import { SmallLoader } from "@erxes/ui/src/components/ButtonMutate";
import Tip from "@erxes/ui/src/components/Tip";
import Uploader from "@erxes/ui/src/components/Uploader";
import asyncComponent from "@erxes/ui/src/components/AsyncComponent";
import dayjs from "dayjs";
import { generateEmailTemplateParams } from "@erxes/ui-engage/src/utils";

const Signature = asyncComponent(
  () =>
    import(
      /* webpackChunkName:"Signature" */ "@erxes/ui-settings/src/email/containers/Signature"
    )
);

type Props = {
  emailTemplates: IEmailTemplate[] /*change type*/;
  currentUser: IUser;
  fromEmail?: string;
  emailTo?: string;
  mailData?: IMail;
  clearOnSubmit?: boolean;
  isReply?: boolean;
  isForward?: boolean;
  replyAll?: boolean;
  brandId?: string;
  mails?: IMessage[];
  messageId?: string;
  totalCount?: number;
  closeModal?: () => void;
  toggleReply?: () => void;
  emailSignatures: IEmailSignature[];
  fetchMoreEmailTemplates: (page: number) => void;
  createdAt?: Date;
  isEmptyEmail?: boolean;
  loading?: boolean;
  sendMail: ({
    variables,
    callback,
  }: {
    variables: any;
    callback: () => void;
  }) => void;
  verifiedImapEmails: string[];
  verifiedEngageEmails: string[];
  detailQuery: string[];
  shrink?: boolean;
  clear?: boolean;
  conversationStatus?: string;
  brands?: any[];
};

type State = {
  status?: string;
  templateId: string;
  cc?: string;
  bcc?: string;
  to?: string;
  fromEmail?: string;
  from?: string;
  subject?: string;
  hasCc?: boolean;
  hasBcc?: boolean;
  hasSubject?: boolean;
  loading?: boolean;
  kind: string;
  content: string;
  isSubmitLoading: boolean;
  isSubmitResolveLoading: boolean;
  attachments: any[];
  fileIds: string[];
  showPrevEmails: boolean;
  emailSignature: string;
  name: string;
  showReply: string;
  isRepliesRetrieved: boolean;
};

class MailForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    const { isForward, replyAll, mailData = {} as IMail, emailTo } = props;

    const mailWidget = JSON.parse(
      localStorage.getItem("emailWidgetData") || "{}"
    );

    const cc = replyAll
      ? formatObj(mailData.cc || [])
      : mailWidget
        ? mailWidget.cc
        : "" || "";

    const bcc = replyAll
      ? formatObj(mailData.bcc || [])
      : mailWidget
        ? mailWidget.bcc
        : "" || "";

    const [from] = mailData.from || ([{}] as IEmail[]);
    const sender =
      this.getEmailSender(from.email || props.fromEmail) || mailWidget?.to;

    const to = emailTo
      ? emailTo
      : mailWidget
        ? mailWidget.to
        : isForward
          ? ""
          : sender || "";
    const mailKey = `mail_${to || this.props.currentUser._id}`;
    const showPrevEmails =
      (localStorage.getItem(`reply_${mailKey}`) || "").length > 0;

    const attachments =
      isForward && mailData.attachments
        ? mailData.attachments
        : mailWidget
          ? mailWidget.attachments
          : [] || [];

    this.state = {
      cc,
      bcc,
      to,

      templateId: "",

      hasCc: cc ? cc.length > 0 : false,
      hasBcc: bcc ? bcc.length > 0 : false,
      hasSubject: !props.isReply,

      isSubmitLoading: false,
      isSubmitResolveLoading: false,
      showPrevEmails,

      fromEmail: sender,
      from: "",
      subject: mailData.subject || mailWidget ? mailWidget.subject : "",
      emailSignature: "",
      content: mailData
        ? this.getContent(mailData, "")
        : mailWidget
          ? mailWidget.content
          : "",

      status: "draft",
      kind: "",

      attachments,
      fileIds: [],

      name: `mail_${mailKey}`,
      showReply: `reply_${mailKey}`,

      isRepliesRetrieved: false,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    const { name, content } = this.state;
    const { isEmptyEmail, clear, emailTo } = this.props;

    if (prevState.content !== content) {
      localStorage.setItem(name, content);
    }

    if (prevProps.clear !== clear || prevProps.isEmptyEmail !== isEmptyEmail) {
      this.clearContent();
    }

    if (prevProps.emailTo !== emailTo) {
      this.setState({ to: emailTo });
    }
  }

  componentDidMount() {
    const { name, showPrevEmails } = this.state;

    const content = localStorage.getItem(name);

    if (content && content !== this.state.content) {
      this.setState({ content: "" });
    }

    if ((content || "").length === 0 && showPrevEmails) {
      this.setState({ showPrevEmails: false });
    }
  }

  componentWillUnmount() {
    localStorage.removeItem(this.state.name);
    localStorage.removeItem(this.state.showReply);
  }

  prepareData() {
    const { from, to, cc, bcc, subject, content, attachments } = this.state;

    const variables = {
      from,
      to,
      cc,
      bcc,
      subject,
      content,
      attachments,
    };

    localStorage.setItem("emailWidgetData", JSON.stringify(variables));
  }

  getContent(mailData: IMail, emailSignature: string) {
    const { createdAt, isForward } = this.props;

    if (!isForward) {
      return `<p>&nbsp;</p><p>&nbsp;</p> ${emailSignature}<p>&nbsp;</p>`;
    }

    const {
      from = [],
      to = [],
      cc = [],
      bcc = [],
      subject = "",
      body = "",
    } = mailData;

    const [{ email: fromEmail }] = from;

    return generateForwardMailContent({
      fromEmail,
      date: dayjs(createdAt).format("lll"),
      to,
      cc,
      bcc,
      subject,
      body,
      emailSignature,
    });
  }

  getReplies(messageId?: string) {
    const { mails = [] } = this.props;

    const { isRepliesRetrieved } = this.state;
    this.setState({ isRepliesRetrieved: !isRepliesRetrieved });

    if (!messageId) {
      return "";
    }

    const selectedMails = mails.filter((mail) => {
      if (!mail) {
        return false;
      }

      return mail._id === messageId;
    });

    const previousEmails = selectedMails
      .map((mail) => {
        if (!mail.mailData) {
          return [];
        }

        const prevEmailForm = mail.mailData.from || [];
        const [{ email }] = prevEmailForm;

        return {
          fromEmail: email,
          body: mail.mailData.body,
          date: dayjs(mail.createdAt).format("lll"),
        };
      })
      .filter((mail) => mail);

    const replyContent = generatePreviousContents(previousEmails);

    const updatedContent = `
      ${this.state.content}
      ${replyContent || ""}
    `;

    return updatedContent;
  }

  clearContent = () => {
    this.setState({
      to: this.props.emailTo ? this.props.emailTo : "",
      cc: "",
      bcc: "",
      subject: "",
      content: "",
      attachments: [],
      isSubmitLoading: false,
      isSubmitResolveLoading: false,
    });

    this.prepareData();
  };

  onShowReplies = () => {
    const { messageId } = this.props;

    this.setState(
      {
        showPrevEmails: true,
        content: this.getReplies(messageId),
      },
      () => {
        localStorage.setItem(this.state.showReply, "true");
      }
    );
  };

  onSubmit = (_, shouldResolve = false) => {
    const {
      isReply,
      closeModal,
      toggleReply,
      sendMail,
      isForward,
      clearOnSubmit,
      messageId,
      conversationStatus,
    } = this.props;

    const mailData = this.props.mailData || ({} as IMail);
    const {
      content,
      from,
      attachments,
      to,
      cc,
      bcc,
      subject,
      kind,
      isRepliesRetrieved,
    } = this.state;

    if (!to) {
      return Alert.warning("This message must have at least one recipient.");
    }

    if (!isReply && (!subject || !content)) {
      return Alert.warning(
        "Send this message with a subject or text in the body."
      );
    }

    const { references, headerId, inReplyTo, replyTo, threadId } = mailData;

    shouldResolve
      ? this.setState({ isSubmitResolveLoading: true })
      : this.setState({ isSubmitLoading: true });

    const subjectValue = subject || mailData.subject || "";

    const updatedContent =
      isForward || !isReply
        ? content
        : !isRepliesRetrieved
          ? this.getReplies(messageId)
          : content;

    const variables = {
      headerId,
      replyTo,
      inReplyTo,
      references,
      threadId,
      attachments,
      kind,
      body: updatedContent,
      erxesApiId: from,
      shouldResolve:
        shouldResolve && conversationStatus === "new" ? true : false,
      shouldOpen:
        shouldResolve && conversationStatus === "closed" ? true : false,
      ...(!isForward ? { replyToMessageId: mailData.messageId } : {}),
      to: formatStr(to),
      cc: formatStr(cc),
      bcc: formatStr(bcc),
      from,
      subject:
        isForward && !subjectValue.includes("Fw:")
          ? `Fw: ${subjectValue}`
          : subjectValue,
    };

    return sendMail({
      variables,
      callback: () => {
        shouldResolve
          ? this.setState({ isSubmitResolveLoading: true })
          : this.setState({ isSubmitLoading: true });

        if (clearOnSubmit) {
          this.clearContent();
        }

        if (isReply) {
          return toggleReply && toggleReply();
        } else {
          return closeModal && closeModal();
        }
      },
    });
  };

  onEditorChange = (value: string) => {
    this.setState({ content: value });
    this.prepareData();
  };

  onClick = <T extends keyof State>(name: T) => {
    this.setState({ [name]: true } as unknown as Pick<State, keyof State>);
  };

  handleInputChange = (e) => {
    this.setState({ subject: e.currentTarget.value });
  };

  onSelectChange = <T extends keyof State>(name: T, e: any) => {
    this.setState({ [name]: e.currentTarget.value } as unknown as Pick<
      State,
      keyof State
    >);

    this.prepareData();
  };

  onRemoveAttach = (attachment: any) => {
    const { attachments } = this.state;

    this.setState({
      attachments: attachments.filter(
        (item) => item.filename !== attachment.filename
      ),
    });
  };

  getEmailSender = (fromEmail?: string) => {
    const mailData = this.props.mailData || ({} as IMail);
    const { integrationEmail } = mailData;

    const to = formatObj(mailData.to) || "";

    // new email
    if ((!to || to.length === 0) && !integrationEmail) {
      return fromEmail;
    }

    // reply
    if (!integrationEmail && !fromEmail) {
      return "";
    }

    if (!integrationEmail && to !== fromEmail) {
      return fromEmail;
    }

    let receiver;

    // Prevent send email to itself
    if (integrationEmail === fromEmail) {
      receiver = to;
    } else {
      let toEmails;

      // Exclude integration email from [to]
      if (to.includes(integrationEmail)) {
        toEmails = to.split(" ").filter((email) => email !== integrationEmail);
      } else {
        toEmails = to;
      }

      receiver = toEmails + " " + fromEmail;
    }

    return receiver;
  };

  findTemplate = (id) => {
    const template = this.props.emailTemplates.find((t) => t._id === id);

    if (template) {
      return template.content;
    }

    return "";
  };

  templateChange = (value) => {
    this.setState({ content: this.findTemplate(value), templateId: value });
  };

  onContentChange = (content) => {
    this.setState({ content });
  };

  onSignatureChange = (emailSignature) => {
    this.setState({ emailSignature });
  };

  renderFromValue = () => {
    const { verifiedImapEmails, verifiedEngageEmails, detailQuery } =
      this.props;

    const onChangeMail = (from: string | null) => {
      this.setState({ from: from || "" });
    };
    this.prepareData();
    return (
      <MailChooser
        onChange={onChangeMail}
        integrations={[]}
        selectedItem={this.state.from}
        verifiedImapEmails={verifiedImapEmails}
        verifiedEngageEmails={verifiedEngageEmails}
        detailQuery={detailQuery}
      />
    );
  };

  renderFrom() {
    return (
      <FlexRow $isEmail={true}>
        <label className="from">From:</label>
        {this.renderFromValue()}
      </FlexRow>
    );
  }

  renderTo() {
    return (
      <FlexRow $isEmail={true}>
        <label>To:</label>
        <FormControl
          autoFocus={this.props.isForward}
          value={this.state.to}
          onChange={this.onSelectChange.bind(this, "to")}
          name="to"
          required={true}
          disabled={this.props.emailTo ? true : false}
        />
        {this.renderRightSide()}
      </FlexRow>
    );
  }

  renderCC() {
    const { cc, hasCc } = this.state;

    if (!hasCc) {
      return null;
    }

    return (
      <FlexRow>
        <label>Cc:</label>
        <FormControl
          autoFocus={true}
          componentclass="textarea"
          onChange={this.onSelectChange.bind(this, "cc")}
          name="cc"
          value={cc}
        />
      </FlexRow>
    );
  }

  renderBCC() {
    const { bcc, hasBcc } = this.state;

    if (!hasBcc) {
      return null;
    }

    return (
      <FlexRow>
        <label>Bcc:</label>
        <FormControl
          autoFocus={true}
          onChange={this.onSelectChange.bind(this, "bcc")}
          componentclass="textarea"
          name="bcc"
          value={bcc}
        />
      </FlexRow>
    );
  }

  renderSubject() {
    const { subject, hasSubject } = this.state;

    if (!hasSubject) {
      return null;
    }

    return (
      <Subject>
        <FlexRow>
          <label>Subject:</label>
          <FormControl
            name="subject"
            onChange={this.handleInputChange}
            required={true}
            value={subject}
            autoFocus={true}
          />
        </FlexRow>
      </Subject>
    );
  }

  renderIcon = ({
    text,
    icon,
    element,
    onClick,
  }: {
    text: string;
    icon: string;
    element?: ReactNode;
    onClick?: () => void;
  }) => {
    if (!onClick && !element) {
      return null;
    }

    return (
      <Tip text={__(text)} placement="top">
        <Label>
          <Icon icon={icon} onClick={onClick} />
          {element}
        </Label>
      </Tip>
    );
  };

  renderSubmit(
    label: string,
    onClick,
    type: string,
    icon = "message",
    kind?: string
  ) {
    const { isSubmitLoading, isSubmitResolveLoading } = this.state;
    const isResolve = kind && kind === "resolveOrOpen";
    const isLoading = isResolve ? isSubmitResolveLoading : isSubmitLoading;

    return (
      <Button
        onClick={onClick}
        btnStyle={type}
        size="small"
        icon={isLoading ? undefined : icon}
        disabled={isLoading}
      >
        {isLoading && <SmallLoader />}
        {label}
      </Button>
    );
  }

  signatureContent = (props) => {
    return <Signature {...props} />;
  };

  renderButtons() {
    const {
      isReply,
      emailTemplates,
      toggleReply,
      totalCount,
      fetchMoreEmailTemplates,
      conversationStatus,
      emailSignatures,
      brands,
      loading,
    } = this.props;
    const onSubmitResolve = (e) => this.onSubmit(e, true);

    const onChangeAttachment = (attachments) => {
      for (const att of attachments) {
        att.url = readFile(att.url);
      }

      this.setState({ attachments });
    };

    const removeAttachment = (index: number) => {
      const attachments = [...this.state.attachments];

      attachments.splice(index, 1);

      this.setState({ attachments });

      onChangeAttachment(attachments);
    };

    return (
      <div>
        <UploaderWrapper>
          <Attachment
            attachment={
              (this.state.attachments || [])[0] || ({} as IAttachment)
            }
            attachments={this.state.attachments || ([] as IAttachment[])}
            removeAttachment={removeAttachment}
            withoutPreview={true}
          />
        </UploaderWrapper>
        <EditorFooter>
          <EditorFooterGroup>
            <div>
              {this.renderSubmit("Send", this.onSubmit, "primary")}
              {isReply &&
                this.renderSubmit(
                  conversationStatus === "closed"
                    ? "Send and Open"
                    : "Send and Resolve",
                  onSubmitResolve,
                  conversationStatus === "closed" ? "warning" : "success",
                  conversationStatus === "closed" ? "redo" : "check-circle",
                  "resolveOrOpen"
                )}
            </div>
            <ToolBar>
              <Uploader
                defaultFileList={this.state.attachments || []}
                onChange={onChangeAttachment}
                icon="attach"
                showOnlyIcon={true}
                noPreview={true}
              />

              <EmailTemplate
                onSelect={this.templateChange}
                totalCount={totalCount}
                fetchMoreEmailTemplates={fetchMoreEmailTemplates}
                targets={generateEmailTemplateParams(emailTemplates || [])}
                loading={loading}
              />

              <SignatureChooser
                signatureContent={this.signatureContent}
                brands={brands || []}
                signatures={emailSignatures || []}
                emailSignature={this.state.emailSignature}
                emailContent={this.state.content}
                onContentChange={this.onContentChange}
                onSignatureChange={this.onSignatureChange}
              />
            </ToolBar>
          </EditorFooterGroup>
          <ToolBar>
            {this.renderIcon({
              text: "Delete",
              icon: "trash-alt",
              onClick: toggleReply,
            })}
          </ToolBar>
        </EditorFooter>
      </div>
    );
  }

  renderShowReplies() {
    const { isReply, isForward } = this.props;

    if (!isReply || isForward || this.state.showPrevEmails) {
      return null;
    }

    return (
      <ShowReplyButtonWrapper>
        <Tip text="Show trimmed content">
          <ShowReplies onClick={this.onShowReplies}>
            <span />
            <span />
            <span />
          </ShowReplies>
        </Tip>
      </ShowReplyButtonWrapper>
    );
  }

  renderBody() {
    return (
      <MailEditorWrapper>
        {this.renderShowReplies()}
        <RichTextEditor
          toolbarLocation="bottom"
          content={this.state.content}
          onChange={this.onEditorChange}
          toolbar={[
            "bold",
            "italic",
            "underline",
            "strikethrough",
            "|",
            "color",
            "highlight",
            "|",
            "fontSize",
            "|",
            { items: ["h1", "h2", "h3"] },
            "|",
            {
              items: ["alignLeft", "alignRight", "alignCenter", "alignJustify"],
            },
            "|",
            { items: ["orderedList", "bulletList"] },
            "|",
            {
              items: [
                "blockquote",
                "horizontalRule",
                "link",
                "unlink",
                "image",
                "table",
              ],
              isMoreControl: true,
            },
          ]}
          height={300}
        />
      </MailEditorWrapper>
    );
  }

  renderLeftSide() {
    return (
      <Column>
        {this.renderFrom()}
        {this.renderTo()}
        {this.renderCC()}
        {this.renderBCC()}
      </Column>
    );
  }

  renderRightSide() {
    const { hasCc, hasBcc, hasSubject } = this.state;

    const onClickHasCc = () => this.onClick("hasCc");
    const onClickHasBCC = () => this.onClick("hasBcc");
    const onClickSubject = () => this.onClick("hasSubject");

    return (
      <>
        <Resipients onClick={onClickHasCc} $isActive={hasCc}>
          Cc
        </Resipients>
        <Resipients onClick={onClickHasBCC} $isActive={hasBcc}>
          Bcc
        </Resipients>
        <Resipients onClick={onClickSubject} $isActive={hasSubject}>
          Subject
        </Resipients>
      </>
    );
  }

  renderMeta = () => {
    return (
      <Meta>
        <SpaceBetweenRow>{this.renderLeftSide()}</SpaceBetweenRow>
      </Meta>
    );
  };

  renderData = () => {
    if (!this.props.shrink) {
      return (
        <>
          {this.renderMeta()}
          {this.renderSubject()}
          {this.renderBody()}
          {this.renderButtons()}
        </>
      );
    }

    return null;
  };

  render() {
    return <ControlWrapper>{this.renderData()}</ControlWrapper>;
  }
}

export default MailForm;
