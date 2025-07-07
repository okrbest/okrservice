import * as dayjs from "dayjs";
import * as React from "react";
import { __, makeClickableLink, readFile } from "../../../utils";
import { IFaqArticle, IFaqCategory } from "../../types";
import Container from "../common/Container";

type Props = {
  article: IFaqArticle | null;
  goToCategory: (category?: IFaqCategory) => void;
  loading: boolean;
};

const ArticleDetail: React.FC<Props> = (props) => {
  React.useEffect(() => {
    makeClickableLink(".erxes-article-content a");
  }, []);

  const renderHead = () => {
    if (props.loading) return <div className="loader" />;
    return <div className="erxes-topbar-title limited"></div>;
  };

  const { article, goToCategory } = props;

  if (!article) {
    return <div className="loader bigger" />;
  }

  const { createdDate, title, summary, content, attachments } = article;

  const onClick = () => {
    goToCategory();
  };

  return (
    <Container title={renderHead()} onBackButton={onClick}>
      <div className="erxes-content">
        <div className="erxes-content slide-in">
          <div className="erxes-article-content">
            <h2>{title}</h2>
            <div className="date">
              {__("Created ")}: <span>{dayjs(createdDate).format("lll")}</span>
            </div>
            <p>{summary}</p>
            <p dangerouslySetInnerHTML={{ __html: content }} />
            {attachments && attachments.length > 0 && (
              <div className="attachments">
                {attachments.map((file, index) => {
                  return (
                    <div key={index} style={{ marginBottom: "8px" }}>
                      <a
                        href={readFile(file.url)}
                        rel="noopener noreferrer"
                        download={file.name}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        📎 {file.name}
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ArticleDetail;
