import React from 'react';
import { pickManualLink } from '../../utils/faqDisplay';
import { FaqHelpBox } from './homeStyles';

type Props = {
  externalLinks?: Record<string, string>;
};

function FaqHelpBanner({ externalLinks }: Props) {
  const manual = pickManualLink(externalLinks);

  if (!manual) return null;

  return (
    <FaqHelpBox>
      <div>
        <b>원하는 답을 못 찾으셨나요?</b>
        <span>화면별 사용 방법은 매뉴얼에 자세히 나와 있어요.</span>
      </div>
      <a href={manual.url} target="_blank" rel="noopener noreferrer">
        매뉴얼 보러 가기
        <span className="material-icons">open_in_new</span>
      </a>
    </FaqHelpBox>
  );
}

export default FaqHelpBanner;
