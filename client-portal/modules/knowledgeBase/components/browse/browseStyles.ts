import styled from 'styled-components';
import styledTS from 'styled-components-ts';
import { faqColors as c } from '../faqStyles';

// 전체·분류·검색 화면(시안 C) 스타일
const MOBILE = '768px';

export const FaqBrowseLayout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 220px;
  gap: 24px;
  align-items: start;

  @media (max-width: 1280px) {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  @media (max-width: ${MOBILE}) {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
`;

export const FaqBrowseSide = styled.aside`
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;

  @media (max-width: ${MOBILE}) {
    display: none;
  }
`;

export const FaqBrowseRight = styled.aside`
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;

  @media (max-width: 1280px) {
    display: none;
  }
`;

export const FaqBrowseMain = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
`;

export const FaqMobileChips = styled.nav`
  display: none;

  @media (max-width: ${MOBILE}) {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin: 0 -2% 12px;
    padding: 2px 2% 4px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const FaqMobileChip = styledTS<{ active?: boolean }>(styled.a)`
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: ${(p) => (p.active ? c.ink : '#fff')};
  color: ${(p) => (p.active ? '#fff' : c.sub)} !important;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  text-decoration: none !important;

  small {
    margin-left: 4px;
    color: ${(p) => (p.active ? c.faint : c.muted)};
    font-size: 12px;
    font-weight: 500;
  }
`;

export const FaqCrumb = styled.div`
  color: ${c.muted};
  font-size: 13px;

  a {
    color: ${c.muted};
    text-decoration: none;

    &:hover {
      color: ${c.accentDark};
    }
  }

  b {
    color: ${c.sub};
    font-weight: 600;
  }
`;

export const FaqGroup = styled.section`
  padding: 20px 22px 6px;
  border-radius: 16px;
  background: #fff;

  @media (max-width: ${MOBILE}) {
    padding: 16px 16px 4px;
  }
`;

export const FaqGroupHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  color: ${c.ink};
  font-size: 17px;
  font-weight: 700;

  small {
    margin-left: auto;
    color: ${c.muted};
    font-size: 13px;
    font-weight: 500;
  }
`;

export const FaqGroupIcon = styledTS<{ bg: string; fg: string }>(styled.span)`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${(p) => p.bg};
  color: ${(p) => p.fg};

  .material-icons {
    font-size: 18px;
  }
`;

export const FaqSeeAll = styled.a`
  display: block;
  padding: 12px 0 14px;
  border-top: 1px solid ${c.line};
  color: ${c.accentDark} !important;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none !important;
`;
