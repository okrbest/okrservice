import styled from 'styled-components';
import styledTS from 'styled-components-ts';
import { faqColors as c } from '../faqStyles';

// FAQ 첫 화면(시안 A) 스타일
const MOBILE = '768px';

export const FaqHomeBody = styled.div`
  display: grid;
  gap: 36px;
  padding: 34px 0 8px;

  @media (max-width: ${MOBILE}) {
    gap: 28px;
    padding-top: 20px;
  }
`;

export const FaqTileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: ${MOBILE}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
`;

export const FaqTile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 18px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  transition:
    box-shadow 0.15s,
    transform 0.15s;

  &:hover {
    box-shadow:
      0 0 0 2px ${c.accent},
      0 10px 24px rgba(49, 130, 246, 0.16);
    transform: translateY(-1px);
  }

  > a {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: ${c.ink};
    text-decoration: none !important;
  }

  h4 {
    margin: 0;
    overflow: hidden;
    color: ${c.ink};
    font-size: 15.5px;
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .faq-tile-count {
    color: ${c.muted};
    font-size: 12.5px;
    font-weight: 500;
  }

  ul {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: ${c.sub};
    font-size: 12.5px;

    &::before {
      content: '· ';
      color: ${c.faint};
    }

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        color: ${c.accentDark};
      }
    }
  }

  @media (max-width: ${MOBILE}) {
    padding: 13px;

    ul {
      display: none;
    }
  }
`;

export const FaqTileIcon = styledTS<{ bg: string; fg: string }>(styled.span)`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${(p) => p.bg};
  color: ${(p) => p.fg};

  .material-icons {
    font-size: 21px;
  }

  @media (max-width: ${MOBILE}) {
    width: 32px;
    height: 32px;
    border-radius: 10px;

    .material-icons {
      font-size: 18px;
    }
  }
`;

export const FaqAllTile = styled.a`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 100%;
  padding: 18px;
  border-radius: 16px;
  background: ${c.accentSoft};
  color: ${c.accentDark} !important;
  text-align: center;
  text-decoration: none !important;

  .material-icons {
    font-size: 24px;
  }

  b {
    font-size: 15.5px;
  }

  span.faq-tile-count {
    color: ${c.accentDark};
    opacity: 0.85;
    font-size: 12.5px;
  }

  &:hover {
    background: #d6e8ff;
  }
`;

export const FaqPopularGrid = styled.div<{ $rows: number }>`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(${(p) => p.$rows}, auto);
  grid-auto-flow: column;
  column-gap: 28px;
  padding: 6px 22px;
  border-radius: 16px;
  background: #fff;

  > a:nth-child(${(p) => p.$rows}n),
  > a:last-child {
    border-bottom: 0;
  }

  @media (max-width: ${MOBILE}) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: none;
    grid-auto-flow: row;
    padding: 4px 16px;

    > a:nth-child(n) {
      border-bottom: 1px solid ${c.line};
    }

    > a:last-child {
      border-bottom: 0;
    }
  }
`;

export const FaqPopularItem = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 0;
  border-bottom: 1px solid ${c.line};
  color: ${c.ink} !important;
  font-size: 14.5px;
  text-decoration: none !important;

  i {
    flex-shrink: 0;
    width: 18px;
    color: ${c.accent};
    font-style: normal;
    font-weight: 800;
  }

  .faq-popular-title {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &:hover .faq-popular-title {
    color: ${c.accentDark};
  }
`;

export const FaqHelpBox = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px 18px;
  padding: 20px 24px;
  border-radius: 16px;
  background: #fff;

  b {
    display: block;
    color: ${c.ink};
    font-size: 15px;
  }

  span {
    color: #6b7684;
    font-size: 13px;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
    padding: 10px 16px;
    border-radius: 10px;
    background: ${c.accentSoft};
    color: ${c.accentDark} !important;
    font-size: 13.5px;
    font-weight: 700;
    text-decoration: none !important;

    .material-icons {
      font-size: 15px;
    }
  }
`;
