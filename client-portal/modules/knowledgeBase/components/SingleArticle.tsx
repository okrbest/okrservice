import { ArticleWrapper, Feedback, Modal, PageAnchor, ArticleFeedback } from "./styles";
import { Config, IKbArticle } from "../../types";

import Avatar from "../../common/Avatar";
import React from "react";
import { Col } from "react-bootstrap";
import Scrollspy from "react-scrollspy";
import Script from "../../common/Script";
import Spinner from "../../common/Spinner";
import classNames from "classnames";
import { gql, useMutation } from "@apollo/client";
import { articleReactMutation } from "../graphql/queries";

type Props = {
  article: IKbArticle;
  config: Config;
  loading?: boolean;
  onReact?: (reaction: string) => void;
};

class SingleArticle extends React.Component<Props, { reaction: string; helpful: 'yes' | 'no' | null }> {
  constructor(props) {
    super(props);

    this.state = {
      reaction: "",
      helpful: null,
    };
  }

  createDom = () => {
    const { article } = this.props;

    if (!article) {
      return null;
    }
    const content = article.content;
    const dom = new DOMParser().parseFromString(content, "text/html");
    return dom;
  };

  onReactionClick = (reaction) => {
    this.setState({ reaction });
  };

  renderTags = () => {
    const tags =
      (typeof window !== "undefined" &&
        (document.getElementsByTagName("h2") as any)) ||
      ({} as any);

    if (!tags || Object.keys(tags).length === 0) {
      return null;
    }

    const tagged = [];

    const addId = (array, isTag) => {
      return array.forEach((el) => {
        let taggedItem;

        if (el.lastChild.innerText) {
          el.children.length > 0
            ? (taggedItem = el.lastChild.innerText.replace(/&nbsp;/gi, ""))
            : (taggedItem = el.innerText.replace(/&nbsp;/gi, ""));

          el.setAttribute("id", taggedItem);
          // tslint:disable-next-line:no-unused-expression
          isTag && tagged.push(taggedItem);
        }
      });
    };

    const h2Array =
      (typeof window !== "undefined" &&
        (document.getElementsByTagName("h2") as any)) ||
      ({} as any);
    addId([...(tags || ({} as any))], true);
    addId([...h2Array], false);

    if (!tagged || tagged.length === 0) {
      return null;
    }

    return (
      <Col md={2}>
        <PageAnchor id="anchorTag">
          <h6>On this page </h6>
          <Scrollspy items={tagged} currentClassName="active">
            {tagged.map((val, index) => (
              <li key={index}>
                <a href={`#${val}`}>{val}</a>
              </li>
            ))}
          </Scrollspy>
        </PageAnchor>
      </Col>
    );
  };

  showImageModal = (e) => {
    const img = (e.target.closest("img") as any) || {};
    const modalImg =
      (typeof window !== "undefined" &&
        (document.getElementById("modal-content") as any)) ||
      {};
    const modal =
      (typeof window !== "undefined" &&
        (document.getElementById("modal") as any)) ||
      {};

    if (img && e.currentTarget.contains(img)) {
      modalImg.src = img.src;
      modalImg.alt = img.alt;

      if (modal.style) {
        modal.style.visibility = "visible";
      }
    }
  };

  handleModal = () => {
    const modal =
      typeof window !== "undefined" && document.getElementById("modal");

    if (modal) {
      modal.style.visibility = "hidden";
    }
  };

  renderReactions = () => {
    const { article } = this.props;
    const { reaction } = this.state;

    if (
      !article ||
      !article.reactionChoices ||
      article.reactionChoices.length === 0
    ) {
      return null;
    }

    const reactionClassess = classNames("reactions", {
      clicked: reaction,
    });

    return (
      <Feedback>
        <div className={reactionClassess}>
          {(article.reactionChoices || []).map((reactionChoice, index) => (
            <span
              key={index}
              className={reactionChoice === reaction ? "active" : undefined}
              onClick={this.onReactionClick.bind(this, reactionChoice)}
            >
              <img alt="reaction" src={reactionChoice} />
            </span>
          ))}
        </div>
      </Feedback>
    );
  };

  renderHelpful = () => {
    const { helpful } = this.state;
    const { onReact } = this.props;

    if (helpful) {
      return (
        <ArticleFeedback>
          <p className="thanks">
            <span className="material-icons">{helpful === 'yes' ? 'sentiment_satisfied_alt' : 'sentiment_dissatisfied'}</span>
            {helpful === 'yes' ? '피드백 감사합니다!' : '더 나은 문서를 위해 노력하겠습니다.'}
          </p>
        </ArticleFeedback>
      );
    }

    return (
      <ArticleFeedback>
        <p>이 글이 도움이 됐나요?</p>
        <div className="buttons">
          <button className="btn-yes" onClick={() => {
            this.setState({ helpful: 'yes' });
            onReact && onReact('helpful');
          }}>
            <span className="material-icons">thumb_up</span> 도움됐어요
          </button>
          <button className="btn-no" onClick={() => {
            this.setState({ helpful: 'no' });
            onReact && onReact('not_helpful');
          }}>
            <span className="material-icons">thumb_down</span> 아니에요
          </button>
        </div>
      </ArticleFeedback>
    );
  };

  renderContent = () => {
    const { article, config } = this.props;

    const forms = article.forms || [];

    return (
      <p>
        {forms.length !== 0 && (
          <Script
            messengerBrandCode={config.messengerBrandCode}
            erxesForms={forms}
          />
        )}
        <div
          onClick={this.showImageModal}
          dangerouslySetInnerHTML={{
            __html: article.content,
          }}
        />
      </p>
    );
  };

  render() {
    const { article, loading } = this.props;

    if (loading) {
      return <Spinner />;
    }

    return (
      <>
        <ArticleWrapper>
          <h4> {article.title}</h4>
          <Avatar
            date={{modifiedAt: article.modifiedDate, publishedAt: article.publishedAt}}
            user={{ ...article.publishedUser || article.createdUser, status: article.publishedUser ? 'Published' : 'Written' }}
            viewCount={article.viewCount || 0}
          />

          <hr />

          <div className="content" id="contentText">
            <p>{article.summary}</p>
            {this.renderContent()}
            <Modal onClick={this.handleModal} id="modal">
              <span id="close">&times;</span>
              <img id="modal-content" alt="modal" />
            </Modal>
          </div>
          <hr />
          {this.renderReactions()}
          {this.renderHelpful()}
        </ArticleWrapper>
        {this.renderTags()}
      </>
    );
  }
}

function SingleArticleWithReact(props: Omit<Props, 'onReact'>) {
  const [react] = useMutation(gql(articleReactMutation));

  const onReact = (reaction: string) => {
    react({ variables: { _id: props.article._id, reaction } }).catch(() => {});
  };

  return <SingleArticle {...props} onReact={onReact} />;
}

export default SingleArticleWithReact;
