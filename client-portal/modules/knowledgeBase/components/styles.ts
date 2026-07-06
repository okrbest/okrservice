import { colors, dimensions, typography } from "../../styles";
import { darken, rgba } from "../../styles/ecolor";
import styled, { css } from "styled-components";

import styledTS from "styled-components-ts";

const silverGrey = "#6c718b";

const Header = styledTS<{ color?: string; backgroundImage?: string }>(
  styled.div
)`
  padding: 30px;
  color: ${colors.colorWhite};
  font-size: ${typography.fontSizeBody};

  background-color: ${(props) =>
    props.color ? props.color : colors.colorWhite};
  background-image: ${(props) =>
    props.backgroundImage && `url(${props.backgroundImage})`};

  h3 {
    font-size: 1.75rem;
    font-weight: ${typography.fontWeightLight};
    padding: 20px 0;
  }
`;

const CategoryItem = styled.div`
  display: flex;
  background-color: ${colors.colorWhite};
  margin-bottom: 16px;
  padding: 24px;
  border: 0;
  box-shadow: 0px 0 15px -10px rgba(0, 0, 0, 0.35);
  border-radius: 5px;
  transition: 0.4s;
  cursor: pointer;

  &:hover {
    box-shadow: 0px 4px 30px -13px rgba(0, 0, 0, 0.25);
    transition: 0.4s;
  }

  align-items: center;
`;

const CategoryIcon = styled.div`
  font-size: 48px;
  color: ${silverGrey};
  text-align: center;
  width: 120px;
  margin-right: 10px;
`;

const CategoryContent = styledTS<{ color?: string }>(styled.div)`
  flex: 1;

  h5 {
    color: ${(props) => props.color || colors.colorSecondary};
    font-weight: ${typography.fontWeightMedium};
    margin: 0 0 2px;
    font-size: 18px;
  }

  p {
    color: ${colors.colorCoreGray};
    margin: 5px 0px 11px;
    text-decoration: none;
    display: block;
    line-height: 1.4;
    font-weight: 300;
  }
`;

const VideoTutorial = styled.div`
  text-align: center;
  margin-top: 50px;

  h4 {
    font-size: ${typography.fontSizeHeading5}px;
    font-weight: ${typography.fontWeightMedium};
  }

  p {
    color: ${silverGrey};
    margin-bottom: 30px;

    a {
      color: ${colors.colorCoreBlue};
    }
  }
`;

const Avatars = styled.div`
  display: flex;
  align-items: center;
  margin-top: 10px;

  img {
    background: rgb(240, 240, 240);
    border: 1px solid ${colors.borderPrimary};
    margin-left: -12px;
    font-size: 10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    object-fit: cover;

    &:first-child {
      margin-left: 0;
    }
  }

  &:first-child {
    > img {
      margin-left: 0;
    }
  }

  .avatar-info {
    color: #888;
    margin-left: 10px;
    font-size: 13px;
    flex: 1;

    > div {
      margin-right: ${dimensions.unitSpacing}px;

      > div {
        margin-right: ${dimensions.unitSpacing + 5}px;
      }

      :first-child {
        width: 250px;
      }
    }

    .darker {
      display: inline;
    }

    span {
      color: ${silverGrey};
      margin-left: 5px;
      font-weight: 500;
    }
  }
`;

const CategoryLeft = styled.div``;

const Sidebar = styled.div`
  h6 {
    text-transform: uppercase;
    color: ${silverGrey};
    font-weight: 400;
    font-size: 12px;
  }
`;

const Container = styled.div`
  display: flex;
  margin-bottom: 1px;

  ${CategoryLeft} {
    flex: 0 0 75%;
    max-width: 75%;
    padding-right: 30px;
  }

  ${Sidebar} {
    flex: 0 0 25%;
    max-width: 25%;
  }
`;

const SidebarIcon = styled.div`
  font-size: 20px;
`;

const SidebarContent = styled.div`
  overflow: hidden;
  h6 {
    margin-bottom: 0;
    margin-top: 0.5rem;
    font-weight: 400;
  }

  p {
    font-weight: 300;
    font-size: 14px;
    margin: 0.5rem 0;
  }
`;

const SidebarItem = styledTS<{ active?: boolean }>(styled.div)`
  padding: 2px 10px;
  border-radius: 5px;
  color: ${silverGrey};
  margin: 2px 0;
  cursor: pointer;
  font-size: 14px;
  transition: 0.4s;
  margin-bottom: 20px;

  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e4eaf0;
    transition: 0.4s;
  }

  ${(props) =>
    props.active &&
    `
      font-weight: 500;
      background: #e4eaf0;
      transition: 0.4s;

      h6 {
        font-weight: 500;
      }
    `}


  ${SidebarIcon} {
    flex: 0 0 18%;
    max-width: 18%;
    height: 100%;
    text-align: center;
  }

  ${SidebarContent} {
    flex: 0 0 82%;
    max-width: 82%;
    flex-wrap: nowrap;
  }
`;

const ArticleWrapper = styled.div`
  padding: 50px 80px;
  border: 0;
  padding: 1.5rem;
  background: ${colors.colorWhite};
  box-shadow: 0px 0 15px -10px rgba(0, 0, 0, 0.25);
  border-radius: 5px;
  transition: 0.4s;
  width: 100%;
  height: 100%;
  overflow-x: auto;

  > h4 {
    color: #036;
    font-size: 24px;
    font-weight: 400;
  }

  .content {
    font-size: 14px;
    line-height: 1.8;
    color: #62667a;

    p > img {
      max-width: 100%;
      height: auto !important;
      padding: 10px 0;
      border-radius: 5px;
      border: 1px solid #eee;
      padding: 5px;

      &:hover {
        cursor: zoom-in;
        opacity: 0.7;
      }
    }

    a {
      color: #6569df;
      text-decoration: underline;
    }

    h1 {
      font-size: 25px !important;
    }

    h2 {
      font-size: 22px !important;
    }

    h3 {
      font-size: 20px !important;
    }

    h4 {
      font-size: 18px !important;
    }

    h5 {
      font-size: 16px !important;
    }

    h6 {
      font-size: 15px !important;
    }

    ol,
    ul {
      padding-left: 20px;

      > li > p {
        margin-bottom: 5px !important;
      }
    }

    pre {
      background: #f6f8fa;
      border-radius: 8px;
      padding: 16px 20px;
      overflow-x: auto;
      margin: 12px 0;

      code {
        background: transparent;
        color: #374151;
        font-size: 13px;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        padding: 0;
      }
    }

    code {
      background: #f1f5f9;
      color: #e11d48;
      font-size: 13px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    blockquote {
      border-left: 3px solid #e5e7eb;
      padding: 4px 0 4px 16px;
      margin: 12px 0;
      color: #6b7280;
    }
  }
`;

const CategoryListWrapper = styledTS<{
  baseColor?: string;
  linkColor?: string;
  headingColor?: string;
  linkHoverColor?: string;
}>(styled.div)`
  max-width: 1000px;
  margin: 0 auto;

  ${(props) =>
    props.baseColor &&
    css`
      .base-color {
        color: ${props.baseColor} !important;
      }
    `};

  ${(props) =>
    (props.linkColor || props.linkHoverColor) &&
    css`
      .link-color {
        color: ${props.linkColor} !important;
        transition: all ease 0.3s;

        &:hover {
          color: ${props.linkHoverColor
            ? props.linkHoverColor
            : colors.colorSecondary} !important;
        }
      }
    `};

  .categories-wrapper {
    .knowledge-base {
      margin: 20px 0 50px;
    }

    .category-knowledge-list {
      > p {
        color: ${colors.colorCoreGray};
        font-size: 15px;
        margin-bottom: 30px;
      }
    }
    
    .list-category-title {
      font-size: 26px;
      font-weight: 400;
      margin-bottom: 5px;
      text-transform: capitalize;
    }

    .category-col {
      margin-bottom: 30px;
    }

    .category-item {
      height: 100%;

      .icon-wrapper {
        margin-bottom: ${dimensions.unitSpacing}px;
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        border-radius: ${dimensions.unitSpacing}px;
        border: 1px solid ${props => rgba(props.baseColor ? props.baseColor : colors.colorSecondary, 0.08)};
        background: ${props => rgba(props.baseColor ? props.baseColor : colors.colorSecondary, 0.08)};

        i {
          font-size: 18px;
          transition: all ease .3s;
          color: ${(props) =>
            props.baseColor
              ? props.baseColor
              : colors.colorSecondary} !important;
        }
      }

      .tab-content {
        h5 {
          font-size: 16px;
          color: ${colors.textPrimary};
          text-transform: capitalize;
          transition: all ease .3s;
        }
  
        p {
          font-size: 14px;
          color: #6c718b;
          font-weight: 400;
          margin: 0;
        }

        .authors {
          margin-top: ${dimensions.unitSpacing - 2}px;
          font-size: 13px;
          color: #6c718b;

          > span {
            margin-right: ${dimensions.coreSpacing + dimensions.unitSpacing}px;
          }
        }
      }
    }

    .avatars {
      flex-flow: row wrap;
      justify-content: center;

      .avatar-info {
        margin-left: 0;
      }
    }

    .card {
      width: 100%;
      background: ${colors.colorWhite};
      border: 1px solid rgba(60, 72, 88, 0.08);
      box-shadow: 0 0 15px -10px rgba(60, 72, 88, 0.15);
      position: relative;
      min-height: 160px;
      padding: 24px;
      border-radius: 12px;
      animation: all ease 0.5s;
      margin-bottom: 10px;
      
      &:hover {
        box-shadow: 0 4px 30px -13px rgba(60, 72, 88, 0.2);
        transition: 0.4s;
      }

      &:hover > * {
        .tab-content h5 {
          color: ${(props) =>
            props.linkHoverColor ? props.linkHoverColor : props.baseColor ? darken(props.baseColor, .7) :"#6569df"} !important;
        }
      }
    }

    a:hover {
      text-decoration: none;
    }
  }
`;

const SidebarList = styledTS<{ baseColor?: string }>(styled.div)`
  min-height: 60vh;

  .item {
    cursor: pointer;
    font-size: 14px;
    transition: all ease 0.3s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    color: #7E8299;

    > div {
      display: flex;
      align-items: center;

      > span {
        width: ${dimensions.coreSpacing}px;
        color: ${colors.colorCoreGray};
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        margin-right: ${dimensions.unitSpacing}px;
      }

      > h6 {
        margin: 0;
        font-size: 14px;
        transition: all ease .3s;
      }

      .icon-wrapper {
        margin-right: ${dimensions.unitSpacing}px;
        width: 30px;
        height: 30px;
        flex-shrink: 0;
        border-radius: ${dimensions.unitSpacing}px;
        border: 1px solid ${props => rgba(props.baseColor ? props.baseColor : colors.colorSecondary, 0.08)};
        background: ${props => rgba(props.baseColor ? props.baseColor : colors.colorSecondary, 0.08)};

        i {
          font-size: 13px;
          transition: all ease .3s;
          color: ${(props) =>
            props.baseColor
              ? props.baseColor
              : colors.colorSecondary} !important;
        }
      }
    }

    > span {
      color: ${colors.colorCoreGray};
      margin-left: 5px;
      font-size: 13px;
    }

    &.active {
      color: ${(props) => (props.baseColor ? props.baseColor : `#6569df`)};

      &:hover {
        h6 {
          color: ${(props) => (props.baseColor ? props.baseColor : `#6569df`)};
        }
      }
    }

    &:hover {
      h6 {
        color: ${colors.textPrimary};
      }
    }
  }
`;

const SubCategories = styledTS<{ baseColor?: string }>(styled.div)`
  margin-bottom: ${dimensions.coreSpacing}px;
  
  .item {
    padding: 4px 0 6px ${dimensions.unitSpacing}px;
    border-radius: ${dimensions.unitSpacing - 2}px;
    margin: 0;

    &.active {
      color: ${props => props.baseColor ? props.baseColor : colors.colorSecondary};
      // background: ${props => rgba(props.baseColor ? props.baseColor : colors.colorSecondary, 0.1)};

      h6, span {
        color: ${props => props.baseColor ? props.baseColor : colors.textPrimary};
      }
    }

    &:hover {
      background: ${colors.bgActive};
    }
    
    > div > i {
      margin-right: 2px !important;
    }
  }
`;

const SubMenu = styled.ul`
  list-style: none;
  padding-left: 10px;
  margin-left: 5px;
  border-left: 1px solid #e1e1e1;

  li {
    font-size: 13px;
    margin-bottom: 8px;
    cursor: pointer;

    &.active {
      color: #6569df;
    }
  }
`;

const SidebarNav = styled.nav`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;

  .nav-label {
    font-size: 11px;
    font-weight: 600;
    color: #9ca3af;
    padding: 0 12px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    color: #374151;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s;
    margin-bottom: 2px;

    i,
    .material-icons {
      font-size: 18px;
      color: #9ca3af;
      flex-shrink: 0;
      width: 20px;
      text-align: center;
    }

    .nav-item-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-item-count {
      font-size: 11px;
      font-weight: 600;
      color: #9ca3af;
      background: #f3f4f6;
      border-radius: 10px;
      padding: 1px 7px;
      flex-shrink: 0;
    }

    &:hover {
      background: #f3f4f6;
      color: #374151;
      text-decoration: none;
    }

    &.active {
      color: #2563eb;
      background: #eff6ff;

      i,
      .material-icons {
        color: #3b82f6;
      }

      .nav-item-count {
        background: #dbeafe;
        color: #3b82f6;
      }
    }

    &.nav-item-child {
      padding-left: 36px;
      font-size: 13px;
      font-weight: 400;
    }
  }
`;

const Feedback = styled.div`
  .reactions {
    display: flex;
    justify-content: center;

    span {
      margin-right: 10px;
      width: 44px;
      cursor: pointer;

      &.active img,
      img:hover {
        height: 38px;
        width: 38px;
      }

      &.active img {
        box-shadow: 0 3px 8px rgba(101, 105, 223, 0.5),
          0 3px 8px rgba(0, 0, 0, 0.15);
      }

      img {
        height: 34px;
        width: 34px;
        padding: 3px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08), 0 3px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }
    }
  }
`;

const PageAnchor = styled.div`
  position: sticky;
  top: 20px;
  padding-top: 10px;

  h6 {
    font-weight: 500;
    text-transform: uppercase;
    font-size: 14px;
  }

  ul {
    margin-top: 10px;
    list-style-type: none;
    padding-left: 20px;
    position: relative;
    height: 100%;

    &::before {
      content: "";
      height: 100%;
      border-left: 2px solid #d6d6d6;
      position: absolute;
      left: 0;
    }

    li {
      position: relative;
      line-height: 17px;
      padding-bottom: 10px;

      h2 {
        line-height: 1.6;
        margin: 0;
        font-size: 14px;
      }

      &::before {
        content: "";
        position: absolute;
        left: -20px;
        height: 100%;
      }

      a {
        font-size: 14px;
        color: #444;
        font-weight: 400;
        transition: all ease 0.3s;

        &:hover {
          text-decoration: none;
        }
      }

      &:hover {
        a {
          font-weight: 500;
        }

        &:before {
          border-left: 2px solid #979797;
        }
      }

      &.active {
        a {
          color: #6569df;
          font-weight: 500;
          position: relative;
        }

        &::before {
          border-left: 2px solid #6569df;
        }
      }
    }
  }
`;

const Modal = styled.div`
  visibility: hidden;
  position: fixed;
  z-index: 1000;
  padding-top: 40px;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(48, 67, 92, 0.8);
  cursor: zoom-out;

  span {
    position: absolute;
    top: 10px;
    right: 10px;
    color: #fff;
    font-size: 40px;
    cursor: pointer;
    transition: all ease 0.3s;
    opacit: 0.8;
  }

  img {
    width: auto;
    max-width: 80%;
    max-height: 80vh;
    box-shadow: 0 2px 10px -3px rgba(0, 0, 0, 0.5);
    transition: max-width 0.1s ease, max-height 0.1s ease;
    animation: zoom 0.8s ease-in-out;
  }
`;

export const HeroSearchWrapper = styled.div`
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  padding: 48px 16px;
  text-align: center;
  width: 100vw;
  position: relative;
  left: 50%;
  margin-left: -50vw;
  margin-top: -32px;
  margin-bottom: 32px;

  h2 {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .search-box {
    position: relative;
    max-width: 768px;
    margin: 0 auto;
    display: flex;

    .input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;

      input {
        width: 100%;
        padding: 14px 40px 14px 20px;
        border: none;
        border-radius: 12px 0 0 12px;
        font-size: 16px;
        outline: none;
        color: #1e293b;

        &::placeholder {
          color: #94a3b8;
        }
      }

      .clear-btn {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 14px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        border-radius: 50%;

        &:hover {
          color: #475569;
          background: #f1f5f9;
        }
      }
    }

    button:not(.clear-btn) {
      padding: 0 24px;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 0 12px 12px 0;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        background: #2563eb;
      }
    }
  }

  @media (max-width: 480px) {
    padding: 32px 16px;
    margin-top: -16px;

    h2 {
      font-size: 18px;
      margin-bottom: 12px;
    }

    .search-box {
      .input-wrapper input {
        padding: 12px 36px 12px 14px;
        font-size: 15px;
      }

      button:not(.clear-btn) {
        padding: 0 16px;
        font-size: 13px;
      }
    }
  }
`;

export const AutocompleteList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 88px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  list-style: none;
  padding: 4px 0;
  margin: 0;
  z-index: 100;
`;

export const AutocompleteItem = styled.li`
  padding: 10px 16px;
  font-size: 15px;
  color: #374151;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background: #f1f5f9;
    color: #2563eb;
  }
`;

export const ArticleListItemWrapper = styled.div`
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  h3 {
    font-size: 20px;
    font-weight: 400;
    color: #2563eb;
    margin-bottom: 6px;
    line-height: 1.5;
    transition: color 0.15s;

    mark {
      background: #fef08a;
      color: inherit;
      padding: 0 1px;
      border-radius: 2px;
    }
  }

  p {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.625;
    margin: 0;
    font-weight: 300;

    mark {
      background: #fef08a;
      color: inherit;
      padding: 0 1px;
      border-radius: 2px;
    }
  }

  &:hover h3 {
    text-decoration: underline;
  }
`;

export const CategoryBadge = styled.span`
  display: inline-block;
  margin-bottom: 6px;
  padding: 2px 8px;
  background: #f0f4ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  font-size: 11px;
  color: #4f46e5;
  font-weight: 500;
`;

export const ArticleListWrapper = styled.div`
  width: 100%;
`;

export const ResultBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
  color: #4b5563;

  strong {
    color: #2563eb;
    font-weight: 700;
  }

  .sort-group {
    display: flex;
    gap: 16px;
  }
`;

export const SortButton = styledTS<{ active?: boolean }>(styled.button)`
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  cursor: pointer;
  color: ${(props) => (props.active ? '#111827' : '#9ca3af')};
  font-weight: ${(props) => (props.active ? '600' : '400')};
  outline: none;

  &:hover {
    color: #111827;
  }
`;

export const RightPanelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const RightPanelSection = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;

  h6 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    margin-bottom: 12px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  li a {
    font-size: 13px;
    color: #4b5563;
    text-decoration: none;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.15s;

    &:hover {
      color: #2563eb;
    }
  }
`;

export const HomeCategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 24px 0 32px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const HomeCategoryCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
  align-items: center;
  transition: box-shadow 0.15s, border-color 0.15s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #bfdbfe;
  }

  .card-icon {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: #eff6ff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .material-icons {
      font-size: 26px;
      color: #3b82f6;
    }
  }

  .card-body {
    flex: 1;
    min-width: 0;

    h5 {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 6px;
      line-height: 1.4;
    }

    p {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 8px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .article-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #9ca3af;

      .material-icons {
        font-size: 15px;
      }
    }
  }
`;

export const ArticleFeedback = styled.div`
  margin-top: 24px;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: center;

  p {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin: 0 0 12px;
  }

  p.thanks {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0;
    color: #16a34a;

    .material-icons {
      font-size: 20px;
    }
  }

  .buttons {
    display: flex;
    justify-content: center;
    gap: 10px;

    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      border: 1px solid;
      cursor: pointer;
      transition: all 0.15s;

      .material-icons {
        font-size: 16px;
      }
    }

    .btn-yes {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #16a34a;

      &:hover {
        background: #dcfce7;
      }
    }

    .btn-no {
      background: #fff7ed;
      border-color: #fed7aa;
      color: #ea580c;

      &:hover {
        background: #ffedd5;
      }
    }
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
  text-align: center;
  color: #6b7280;

  > .material-icons {
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: #6b7280;
    margin: 0 0 20px;
  }

  .contact-hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 16px;

    .material-icons {
      font-size: 16px;
    }
  }
`;

const skeletonAnimation = css`
  @keyframes skeleton-pulse {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;

export const SkeletonLine = styled.div<{ width?: string; height?: string }>`
  ${skeletonAnimation}
  height: ${props => props.height || '14px'};
  width: ${props => props.width || '100%'};
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton-pulse 1.4s ease infinite;
`;

export const SkeletonItem = styled.div`
  padding: 20px 0;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &:last-child {
    border-bottom: none;
  }
`;

export const KbPageContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px 32px;

  @media (max-width: 768px) {
    padding: 0 12px 24px;
  }
`;

export const TocWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .toc-item {
    font-size: 12px;
    color: #374151;
    text-decoration: none;
    line-height: 1.5;
    padding: 2px 0;
    border-left: 2px solid transparent;
    padding-left: 8px;
    transition: color 0.15s, border-color 0.15s;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;

    &:hover {
      color: #2563eb;
      border-left-color: #93c5fd;
    }

    &.level-3 {
      padding-left: 16px;
      font-size: 11px;
      color: #6b7280;
    }
  }
`;

export const MobileCategoryNav = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 0 0 12px;
    margin-bottom: 12px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const MobileCategoryTab = styled.a<{ active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: ${props => props.active ? '600' : '400'};
  white-space: nowrap;
  text-decoration: none;
  flex-shrink: 0;
  background: ${props => props.active ? '#dbeafe' : '#fff'};
  color: ${props => props.active ? '#1d4ed8' : '#6b7280'};
  border: 1px solid ${props => props.active ? '#93c5fd' : '#e5e7eb'};
  transition: all 0.15s;

  &:hover {
    text-decoration: none;
    background: ${props => props.active ? '#bfdbfe' : '#f3f4f6'};
    color: ${props => props.active ? '#1e40af' : '#374151'};
    border-color: ${props => props.active ? '#60a5fa' : '#d1d5db'};
  }
`;

export const KbThreeCol = styled.div`
  display: flex;
  gap: 32px;
  align-items: flex-start;
  margin-top: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0;
  }
`;

export const KbLeftCol = styled.div`
  width: 256px;
  flex-shrink: 0;
  position: sticky;
  top: 96px;

  @media (max-width: 768px) {
    display: none;
  }
`;

export const KbCenterCol = styled.div`
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;

  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 8px;
  }
`;

export const KbRightCol = styled.div`
  width: 192px;
  flex-shrink: 0;
  position: sticky;
  top: 96px;

  @media (max-width: 1280px) {
    display: none;
  }
`;

export {
  Header,
  CategoryItem,
  CategoryIcon,
  CategoryContent,
  VideoTutorial,
  Avatars,
  CategoryLeft,
  Sidebar,
  Container,
  SidebarList,
  SidebarNav,
  SidebarItem,
  SidebarIcon,
  SidebarContent,
  ArticleWrapper,
  CategoryListWrapper,
  SubCategories,
  SubMenu,
  Feedback,
  PageAnchor,
  Modal,
};
