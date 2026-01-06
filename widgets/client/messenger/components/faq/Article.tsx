import * as React from "react";
import { IFaqArticle } from "../../types";
import { useRouter } from "../../context/Router";

type Props = {
  article: IFaqArticle;
  onClick: (article: IFaqArticle) => void;
};

const Article: React.FC<Props> = ({ article, onClick }) => {
  const { isZoomed } = useRouter();

  const handleOnClick = (event: React.FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    onClick(article);
  };

  // 확대 상태일 때는 더 많은 텍스트를 표시
  const maxLength = isZoomed ? 130 : 30;

  return (
    <div className="erxes-list-item faq-item" onClick={handleOnClick}>
      <div className="erxes-left-side">
        <i className="erxes-icon-clipboard" />
      </div>
      <div className="erxes-right-side">
        <div className="erxes-name">{article.title}</div>
        <div className="description">
          {article.summary.length > maxLength
            ? article.summary.substring(0, maxLength) + "..."
            : article.summary}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Article);
