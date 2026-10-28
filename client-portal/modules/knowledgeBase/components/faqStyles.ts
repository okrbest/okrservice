import styled from 'styled-components';
import styledTS from 'styled-components-ts';

// FAQ 개편 화면(첫 화면·전체·분류·검색) 전용 스타일. 시안: specs/002-faq-home-redesign
export const faqColors = {
  ink: '#191f28',
  sub: '#4e5968',
  muted: '#6b7684',
  faint: '#b0b8c1',
  line: '#f2f4f6',
  border: '#e5e8eb',
  page: '#f6f7f9',
  accent: '#3182f6',
  accentDark: '#1b64da',
  accentSoft: '#e8f3ff',
};

const c = faqColors;
const MOBILE = '768px';

/* ---------- 공통 ---------- */

export const FaqTag = styled.span`
  flex-shrink: 0;
  display: inline-block;
  height: fit-content;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${c.line};
  color: ${c.sub};
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
`;

export const FaqSectionTitle = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 14px;
  color: ${c.ink};
  font-size: 18px;
  font-weight: 700;

  small {
    color: ${c.muted};
    font-size: 13px;
    font-weight: 500;
  }
`;

export const FaqRowLink = styled.a`
  display: flex;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px solid ${c.line};
  text-decoration: none !important;

  > div {
    min-width: 0;
  }

  b {
    display: block;
    color: ${c.ink};
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  span.faq-summary {
    display: block;
    overflow: hidden;
    margin-top: 2px;
    color: ${c.muted};
    font-size: 13px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  mark {
    padding: 0 1px;
    background: #fff3bf;
    color: inherit;
  }

  &:hover b {
    color: ${c.accentDark};
  }
`;

export const FaqEmpty = styled.div`
  padding: 40px 16px;
  text-align: center;
  color: ${c.sub};

  .material-icons {
    color: ${c.faint};
    font-size: 36px;
  }

  h4 {
    margin: 10px 0 6px;
    color: ${c.ink};
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0 0 14px;
    font-size: 14px;
  }

  a {
    color: ${c.accentDark};
    font-weight: 700;
  }
`;

export const FaqSkeleton = styledTS<{ h?: number }>(styled.div)`
  height: ${(p) => p.h || 120}px;
  border-radius: 16px;
  background: linear-gradient(90deg, #eceef1 0%, #f4f5f7 50%, #eceef1 100%);
`;

/* ---------- 검색 ---------- */

export const FaqHeroWrapper = styled.div`
  position: relative;
  left: 50%;
  width: 100vw;
  margin: -32px 0 0 -50vw;
  padding: 48px 16px 44px;
  background: linear-gradient(160deg, #e8f0fe 0%, #eef0ff 55%, ${c.page} 100%);
  text-align: center;

  h1 {
    margin: 0 0 8px;
    color: ${c.ink};
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  > p {
    margin: 0 0 24px;
    color: #6b7684;
    font-size: 15px;
  }

  @media (max-width: ${MOBILE}) {
    margin-top: -16px;
    padding: 28px 16px 24px;

    h1 {
      font-size: 21px;
    }

    > p {
      margin-bottom: 16px;
      font-size: 13.5px;
    }
  }
`;

export const FaqSearchBox = styledTS<{ compact?: boolean }>(styled.div)`
  position: relative;
  width: 100%;
  max-width: ${(p) => (p.compact ? 'none' : '620px')};
  margin: ${(p) => (p.compact ? '0' : '0 auto')};
  text-align: left;

  .faq-search-field {
    display: flex;
    align-items: center;
    gap: 10px;
    height: ${(p) => (p.compact ? 48 : 56)}px;
    padding: 0 8px 0 18px;
    border: 1px solid ${(p) => (p.compact ? c.border : 'transparent')};
    border-radius: 14px;
    background: #fff;
    box-shadow: ${(p) => (p.compact ? 'none' : '0 2px 10px rgba(15, 23, 42, 0.06)')};

    &:focus-within {
      border-color: ${c.accent};
    }
  }

  .faq-search-icon {
    color: ${c.muted};
    font-size: 22px;
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: ${c.ink};
    font-size: 16px;

    &::placeholder {
      color: ${c.muted};
    }
  }

  .faq-search-clear {
    padding: 4px;
    border: 0;
    border-radius: 50%;
    background: none;
    color: ${c.muted};
    line-height: 0;
    cursor: pointer;

    .material-icons {
      font-size: 18px;
    }
  }

  .faq-search-submit {
    flex-shrink: 0;
    height: ${(p) => (p.compact ? 34 : 40)}px;
    padding: 0 16px;
    border: 0;
    border-radius: 10px;
    background: ${c.accent};
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      background: ${c.accentDark};
    }
  }

  > ul {
    top: calc(100% + 6px);
    right: 0;
    border-radius: 12px;
  }

  @media (max-width: ${MOBILE}) {
    .faq-search-field {
      height: 48px;
      padding-left: 14px;
    }

    input {
      font-size: 16px;
    }

    .faq-search-submit {
      height: 34px;
      padding: 0 12px;
    }
  }
`;

export const FaqChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;

  a {
    padding: 6px 13px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.8);
    color: ${c.sub};
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;

    &:hover {
      background: #fff;
      color: ${c.accentDark};
    }
  }
`;
