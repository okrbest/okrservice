import {
  CommentContent,
  CommentWrapper,
  CreatedUser,
  SpaceFormsWrapper,
  TicketComment,
} from "@erxes/ui-settings/src/styles";
import { IClientPortalComment, IWidgetsComment } from "../types";
import { TabTitle, Tabs } from "@erxes/ui/src/components/tabs";
import { __, readFile, renderFullName } from "coreui/utils";

import Button from "@erxes/ui/src/components/Button";
import { ColorButton } from "../../boards/styles/common";
import ControlLabel from "@erxes/ui/src/components/form/Label";
import Dialog from "@erxes/ui/src/components/Dialog";
import EmptyState from "@erxes/ui/src/components/EmptyState";
import { IUser } from "@erxes/ui/src/auth/types";
import Icon from "@erxes/ui/src/components/Icon";
import { ModalFooter } from "@erxes/ui/src/styles/main";
import React from "react";
import { Toggle } from "@erxes/ui/src";
import dayjs from "dayjs";

type Props = {
  currentUser: IUser;
  widgetsTicketComments: IWidgetsComment[];
  clientPortalComments: IClientPortalComment[];
  remove: (_id: string) => void;
  removeTicketComment: (_id: string) => void;
};
type State = {
  show: boolean;
  currentTab: string;
};
class Comment extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: "clientPortal",
      show: false,
    };
  }

  handleClose = () => this.setState({ show: false });
  handleShow = () => this.setState({ show: true });
  tabOnClick = (tab) => this.setState({ currentTab: tab });

  render() {
    const { currentUser, remove, removeTicketComment } = this.props;
    const { show } = this.state;

    const renderComment = (comment) => {
      const createdUser = comment.createdUser || comment.createdCustomer || {};
      const isCurrentUser = createdUser._id === currentUser._id;
      const { currentTab } = this.state;
      return (
        <TicketComment key={comment._id}>
          <CreatedUser>
            <img
              src={readFile(createdUser.avatar || "/images/avatar-colored.svg")}
              alt="profile"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/images/avatar-colored.svg";
              }}
            />
            <div>
              <CommentContent>
                <h5>
                  {createdUser.fullName ||
                    `${createdUser.firstName || ""} ${createdUser.lastName || ""}`}
                </h5>
                {(comment.content && comment.content.trim()) ? (
                  <div
                    className="comment"
                    dangerouslySetInnerHTML={{ __html: comment.content }}
                  />
                ) : null}
                {comment.attachments &&
                  comment.attachments.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {comment.attachments.map((att, idx) => {
                        const url = att.url ? readFile(att.url) : "";
                        const isImage =
                          att.type && att.type.startsWith("image/");
                        const inlineUrl = url ? (url.indexOf("?") >= 0 ? url + "&inline=true" : url + "?inline=true") : "";
                        return (
                          <div
                            key={`${comment._id}-att-${idx}`}
                            style={{ marginBottom: 4 }}
                          >
                            {isImage ? (
                              <>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={url}
                                    alt={att.name || ""}
                                    style={{
                                      maxWidth: 200,
                                      maxHeight: 200,
                                      objectFit: "contain",
                                    }}
                                  />
                                </a>
                                <div style={{ marginTop: 4, fontSize: 12 }}>
                                  <a
                                    href={inlineUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#6569df" }}
                                  >
                                    {__("Open in new window to view at full size")}
                                  </a>
                                </div>
                              </>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {att.name || __("Attachment")}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
              </CommentContent>
              <span>
                {__("Created at")}{" "}
                {dayjs(comment.createdAt).format("YYYY-MM-DD HH:mm")}
              </span>
            </div>
            {isCurrentUser && currentTab === "clientPortal" && (
              <div className="actions">
                <button
                  type="button"
                  onClick={() => remove(comment._id)}
                  aria-label="Delete comment"
                >
                  {__("Delete")}
                </button>
              </div>
            )}
            {currentTab === "widget" && (
              <div className="actions">
                <button
                  type="button"
                  onClick={() => removeTicketComment(comment._id)}
                  aria-label="Delete comment"
                >
                  {__("Delete")}
                </button>
              </div>
            )}
          </CreatedUser>
        </TicketComment>
      );
    };

    const renderCommentsList = () => {
      const { currentTab } = this.state;
      const { clientPortalComments, widgetsTicketComments } = this.props;

      const comments =
        currentTab === "clientPortal"
          ? clientPortalComments
          : widgetsTicketComments;

      return comments.length === 0 ? (
        <EmptyState text="No comments available" icon="info-circle" />
      ) : (
        comments.map(renderComment)
      );
    };

    return (
      <>
        <ColorButton onClick={this.handleShow}>
          <Icon icon="comment-alt-message" />
          {__("Comment")}
        </ColorButton>

        <Dialog
          show={show}
          closeModal={this.handleClose}
          title={__("Comments")}
        >
          <Tabs full={true}>
            <TabTitle
              className={this.state.currentTab === "widget" ? "active" : ""}
              onClick={this.tabOnClick.bind(this, "widget")}
            >
              {__("Widgets")}
            </TabTitle>
            <TabTitle
              className={
                this.state.currentTab === "clientPortal" ? "active" : ""
              }
              onClick={this.tabOnClick.bind(this, "clientPortal")}
            >
              {__("Client Portal")}
            </TabTitle>
          </Tabs>
          <SpaceFormsWrapper>
            <CommentWrapper>{renderCommentsList()}</CommentWrapper>
          </SpaceFormsWrapper>
          <ModalFooter>
            <Button
              btnStyle="simple"
              size="small"
              icon="times-circle"
              onClick={this.handleClose}
            >
              {__("Cancel")}
            </Button>
          </ModalFooter>
        </Dialog>
      </>
    );
  }
}

export default Comment;
