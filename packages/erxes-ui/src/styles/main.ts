import { colors, dimensions, typography } from '../styles';
import styled, { css, keyframes } from 'styled-components';

import { Popover } from '@headlessui/react';
import { SelectWrapper } from '../components/form/styles';
import { SidebarContent } from '@erxes/ui-forms/src/settings/properties/styles';
import { rgba } from '../styles/ecolor';
import styledTS from 'styled-components-ts';

const placeHolderShimmer = keyframes`
  0% { background-position: -468px 0 }
  100% { background-position: 468px 0 }
`;

const Flex = styled.div`
  display: flex;
`;

const FlexHeight = styled(Flex)`
  height: 100%;
`;

const FlexCenter = styled(Flex)`
  align-items: center;
`;

const Actions = styledTS<{ isSmall?: boolean }>(styled.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 ${dimensions.coreSpacing}px ${dimensions.unitSpacing}px;

  a, button {
    flex: 1;

    i {
      font-size: 12px;
      line-height: 16px;
    }
  }

  > div {
    margin-left: ${dimensions.unitSpacing}px;
    position: relative;
  }

  [id^="headlessui-menu-items-"] {
    display: ${(props) => (props.isSmall ? 'inline-block' : 'block')};
  }

  > div:first-child {
    margin: 0;
  }
`;

const PopoverButton = styled.div`
  display: inline-block;
  position: relative;

  > * {
    display: inline-block;
  }

  > i {
    margin-left: 3px;
    margin-right: -4px;
    transition: all ease 0.3s;
    color: ${colors.colorCoreGray};
  }

  &:hover {
    cursor: pointer;
  }
`;

const PopoverHeader = styled.h3`
  display: block;
  border-bottom: 1px solid ${colors.borderPrimary};
  padding: 10px 20px;
  background: ${colors.colorWhite};
  font-size: 13px;
  text-transform: capitalize;
  border-radius: 4px 4px 0 0;
  margin: 0;
  font-weight: 600;

  > a {
    color: ${colors.colorCoreGray};
    float: right;
  }
`;

const PopoverPanel = styled(Popover.Panel)`
  max-width: fit-content;
`;

const TipContent = styled.div`
  white-space: nowrap;
  z-index: 99;
  background: #fff;
  box-shadow:
    rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
    rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
  padding: 4px 7px !important;
  font-weight: 400 !important;
  border-radius: 4px;
  color: #000 !important;
`;

const FullContent = styledTS<{ $center: boolean; $align?: boolean }>(
  styled.div,
)`
  flex: 1;
  display: flex;
  min-height: 100%;
  justify-content: ${(props) => props.$center && 'center'};
  align-items: ${(props) => (props.$align ? 'flex-start' : 'center')};
`;

const MiddleContent = styledTS<{ $transparent?: boolean; $shrink?: boolean }>(
  styled.div,
)`
  width: 900px;
  background: ${(props) => !props.$transparent && colors.colorWhite};
  margin: 10px 0;

  ${(props) =>
    !props.$shrink &&
    css`
      height: 100%;
      height: calc(100% - 20px);
    `};

  @media (max-width: 900px) {
    width: 100%;
  }
`;

const BoxRoot = styledTS<{ $selected?: boolean }>(styled.div)`
  text-align: center;
  float: left;
  background: ${colors.colorLightBlue};
  box-shadow: ${(props) =>
    props.$selected
      ? `0 10px 20px ${rgba(colors.colorCoreDarkGray, 0.12)}`
      : `0 6px 10px 1px ${rgba(colors.colorCoreDarkGray, 0.08)}`} ;
  margin-right: ${dimensions.coreSpacing}px;
  margin-bottom: ${dimensions.coreSpacing}px;
  border-radius: ${dimensions.unitSpacing / 2 - 1}px;
  transition: all 0.25s ease;
  border: 1px ${(props) => (props.$selected ? 'solid' : 'dashed')}
    ${(props) =>
      props.$selected ? colors.colorSecondary : 'rgba(0, 0, 0, 0.12)'};

  > a {
    display: block;
    padding: ${dimensions.coreSpacing}px;
    text-decoration: none;

    &:focus {
      text-decoration: none;
    }
  }

  img {
    width: 83px;
    transition: all 0.5s ease;
  }

  span {
    color: ${colors.colorCoreGray};
    display: block;
    margin-top: ${dimensions.unitSpacing}px;
  }

  &:hover {
    cursor: pointer;
    box-shadow: 0 10px 20px ${rgba(colors.colorCoreDarkGray, 0.12)};

    span {
      font-weight: 500;
    }

    img {
      transform: scale(1.1);
    }
  }

  @media (max-width: 780px) {
    width: 100%;
  }
`;

const Info = styled.div`
  margin-top: 5px;
  white-space: normal;

  > span {
    font-weight: normal;
  }
`;

const InfoTitle = styled.span`
  font-weight: 500;
  margin-bottom: 5px;
  margin-right: 10px;
`;

const InfoWrapper = styled.div`
  padding: 20px 20px 30px 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  ${Actions} {
    padding: 0;
  }
`;

const Links = styled.div`
  margin-top: 5px;

  a {
    color: ${colors.colorCoreLightGray};
    margin-right: 10px;

    &:hover {
      color: ${colors.colorCoreGray};
    }

    i {
      font-size: 14px;
    }
  }
`;

const FormWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;

  img {
    display: block;
    width: 100px;
    height: 100px;
    border-radius: 50px;
    background-color: ${colors.colorCoreGray};
  }
`;

const FormColumn = styledTS<{ maxwidth?: string }>(styled.div)`
  flex: 1;
  padding-right: 40px;
  max-width: ${(props) => props.maxwidth};

  &:last-of-type {
    padding: 0;
  }
`;

const ModalFooter = styled.div`
  text-align: right;
  margin-top: 30px;
`;

const CenterContent = styled.div`
  text-align: center;
  margin-top: 10px;
`;

const ActivityContent = styledTS<{ $isEmpty: boolean }>(styled.div)`
  position: relative;
  height: ${(props) => props.$isEmpty && '360px'};
`;

const DropIcon = styledTS<{ $isOpen: boolean }>(styled.span)`
  font-size: 18px;
  line-height: 22px;

  &:after {
    cursor: pointer;
    content: '\\e9a6';
    font-family: 'erxes';
    float: right;
    transition: all ease 0.3s;
    margin-left: ${dimensions.unitSpacing - 2}px;
    transform: ${(props) => props.$isOpen && `rotate(180deg)`};
  }
`;

const HomeContainer = styled.div`
  width: 320px;
`;

const CloseModal = styled.div`
  position: absolute;
  right: -40px;
  width: 30px;
  height: 30px;
  background: ${rgba(colors.colorBlack, 0.3)};
  line-height: 30px;
  border-radius: 15px;
  text-align: center;
  color: ${colors.colorWhite};

  &:hover {
    background: ${rgba(colors.colorBlack, 0.4)};
    cursor: pointer;
  }

  @media screen and (max-width: 1092px) {
    right: 10px;
    top: 10px;
  }
`;

const DateWrapper = styled.time`
  font-size: 12px;
`;

const ScrollWrapper = styledTS<{ calcHeight?: string }>(styled.div)`
  height: 50vh;
  height: ${(props) =>
    props.calcHeight
      ? `calc(100vh - ${props.calcHeight}px)`
      : 'calc(100vh - 280px)'};
  overflow: auto;
  padding: 5px 10px 0 20px;
  margin-left: -20px;
  margin-right: -10px;
  margin-top: -5px;
`;

const DateContainer = styled.div`
  .form-control {
    box-shadow: none;
    border-radius: 0;
    border: none;
    background: none;
    border-bottom: 1px solid ${colors.colorShadowGray};
    padding: 5px 0;
    font-size: ${typography.fontSizeBody}px;

    &:focus {
      box-shadow: none;
      border-color: ${colors.colorSecondary};
    }
  }
`;

const TabContent = styled.div`
  margin-top: ${dimensions.coreSpacing}px;
`;

const ButtonRelated = styledTS<{ type?: string }>(styled.div)`
  text-align: center;
  padding: 16px 0;
  font-size: 12px;

  span {
    background: ${props => props.type === "primary" ? colors.colorSecondary : "rgba(0, 0, 0, 0.06)"};
    padding: 4px 16px;
    color: ${props => props.type === "primary" ? colors.colorWhite : colors.colorCoreGray};
    border-radius: 25px;
    transition: all 0.3s ease;

    &:hover {
      cursor: pointer;
      background: rgba(0, 0, 0, 0.1);
      color: ${colors.textSecondary};
    }
  }
`;

const SimpleButton = styledTS<{ $isActive?: boolean }>(styled.div)`
  font-size: 15px;
  background: ${(props) => props.$isActive && colors.bgGray};
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 2px;
  transition: background ease 0.3s;

  &:hover {
    background: ${colors.bgActive};
    cursor: pointer;
  }
`;

const TopHeader = styled.div`
  padding: 18px 20px;
`;

const Title = styledTS<{ capitalize?: boolean }>(styled.div)`
  font-size: 24px;
  margin: 20px 0;
  display: flex;
  line-height: 30px;
  text-transform: ${(props) => props.capitalize && 'capitalize'};

  > span {
    font-size: 75%;
    color: #666;
    margin-left: 10px;
    margin-top: 2px;
  }
`;

const Count = styled.div`
  font-size: 15px;
  font-weight: bold;
  margin: 10px 20px;
  color: #666;
`;

const Limited = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const ColorPick = styled.div`
  border-radius: 4px;
  display: inline-block;
  padding: 3px;
  border: 1px solid ${colors.borderDarker};
  cursor: pointer;
`;

const ColorPicker = styled.div`
  width: 80px;
  height: 27px;
  border-radius: 2px;
`;

const LinkButton = styled.a`
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const EllipsisContent = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const CustomerName = styled(FlexCenter)`
  overflow: hidden;

  time {
    padding-left: 5px;
    color: ${colors.colorCoreGray};
    font-size: 12px;
  }
`;

const PluginLayout = styled(Flex)`
  max-height: 100%;
  flex: 1;
  padding-top: ${dimensions.headerSpacing}px;
`;

const Column = styled.div`
  flex: 1;
`;

const Wrapper = styled.div`
  padding: ${dimensions.coreSpacing}px;
`;

const Pin = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  position: absolute;
  transform: rotate(-45deg);
  left: 50%;
  top: 50%;
  margin: -20px 0 0 -20px;
  animation-name: bounce;
  animation-fill-mode: both;
  animation-duration: 1s;
  &::after {
    content: '';
    width: 14px;
    height: 14px;
    margin: 8px 0 0 8px;
    background: #ffffff;
    position: absolute;
    border-radius: 50%;
  }

  @keyframes bounce {
    0% {
      opacity: 0;
      transform: translateY(-2000px) rotate(-45deg);
    }
    60% {
      opacity: 1;
      transform: translateY(30px) rotate(-45deg);
    }
    80% {
      transform: translateY(-10px) rotate(-45deg);
    }
    100% {
      transform: translateY(0) rotate(-45deg);
    }
  }
`;

const MapContainer = styled.div<{ fullHeight?: boolean }>`
  width: 100%;
  height: ${(props) => (props.fullHeight ? '100%' : '250px')};
`;

const ImageWrapper = styled.div`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 20px;
`;

const TextWrapper = styled.div`
  max-width: 400px;
  h1 {
    font-weight: 400;
    font-size: 24px;
  }

  p {
    font-size: 14px;
    margin-bottom: 20px;
  }

  img {
    max-width: 100%;
    max-width: calc(100% + 40px);
    box-shadow: 0 0 20px 5px rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    margin-left: -20px;
  }
`;

const Loader = styledTS<{
  height?: string;
  width?: string;
  color?: string;
  $round?: boolean;
  margin?: string;
  marginRight?: string;
  isBox?: boolean;
  withImage?: boolean;
}>(styled.div)`
  animation-duration: 1.25s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: ${placeHolderShimmer};
  animation-timing-function: linear;
  background: linear-gradient(to right, 
    ${(props) => (props.color ? props.color : colors.borderPrimary)} 8%, 
    ${(props) => (props.color ? colors.bgLight : colors.borderDarker)} 18%, 
    ${(props) => (props.color ? props.color : colors.borderPrimary)} 33%);
  background-size: 800px 200px;
  width: ${(props) => (props.width ? props.width : '100%')};
  height: ${(props) => (props.height ? props.height : '100%')};
  border-radius: ${(props) => (props.$round ? '50%' : '2px')};
  margin-right: ${(props) => props.marginRight};
  margin: ${(props) => props.margin};
  position: relative;
  float: left;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1050;
  width: 100%;
  height: 100%;
  background: rgba(48, 67, 92, 0.5);
`;

const DialogContent = styled.div`
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  text-align: center;

  .dialog-description {
    padding: 20px 30px 30px;
    margin: 0;
  }
`;

const DialogWrapper = styled.div`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  z-index: 1050;
`;

const MenuDivider = styled.div`
  height: 0;
  margin: 0.5rem 0;
  overflow: hidden;
  border-top: 1px solid #e9ecef;
`;

const UploadBtn = styled.div`
  position: relative;
  min-height: 30px;
  margin-top: 10px;
  label {
    padding: 7px 15px;
    background: ${rgba(colors.colorCoreDarkBlue, 0.05)};
    border-radius: 4px;
    font-weight: 500;
    transition: background 0.3s ease;
    display: inline-block;
    &:hover {
      background: ${rgba(colors.colorCoreDarkBlue, 0.1)};
      cursor: pointer;
    }
  }
  input[type='file'] {
    display: none;
  }
`;

const AttachmentContainer = styled.div`
  margin-top: 20px;
`;

const DynamicContent = styled.div`
  display: grid;
  grid-template-columns: 250px 2fr;
  height: 100%;
`;

const DynamicContentLeft = styled.div`
  border-right: 1px solid ${colors.borderPrimary};
  margin-right: ${dimensions.coreSpacing}px;
  padding-right: ${dimensions.coreSpacing}px;

  .custom-title {
    padding: ${dimensions.unitSpacing - 2}px ${dimensions.coreSpacing}px;
    font-weight: 500;
    color: #666;
    line-height: ${dimensions.coreSpacing - 5}px;

    &.active {
      background: rgba(119, 99, 241, 0.1);
      color: #7763F1;
      border-radius: ${dimensions.unitSpacing - 6}px;
    }
  }

  .custom-child-title {
    padding: ${dimensions.unitSpacing - 2}px ${dimensions.coreSpacing}px ${dimensions.unitSpacing - 2}px ${dimensions.coreSpacing + dimensions.unitSpacing}px;
    color: ${colors.colorCoreGray};
  }
`;

const DynamicContentLeftButtonWrapper = styled.div`
  margin-top: ${dimensions.unitSpacing}px;
`;

const DynamicContentRight = styledTS<{ overflow?: boolean }>(styled.div)`
  height: calc(100% - 25px);
  overflow: ${props => props.overflow ? 'auto' : 'initial'}
`;

const DynamicTableWrapper = styled.div`
  background: ${colors.colorWhite};
  overflow-x: auto;
  border-radius: 4px;

  .empty {
    padding: ${dimensions.coreSpacing}px;
  }

  > div, #hurData > div {
    padding: 0;

    .salary {
      color: ${colors.colorCoreRed};

      &.paid {
        color: ${colors.colorCoreGreen};
      }
    }

    .salary-center {
      th {
        text-transform: inherit;
        font-size: 12px;
        line-height: 12px;
        text-align: center;
      }
    }

    > table td:first-child {
      padding-left: ${dimensions.coreSpacing}px;
    }
  }

  #hurData > h4 {
    margin: 0;
    padding: ${dimensions.unitSpacing}px ${dimensions.coreSpacing}px;
    font-size: 15px;
  }
`;

const XypTitle = styled.div`
  display: flex;
  padding: ${dimensions.unitSpacing - 5}px ${dimensions.coreSpacing}px;
  transition: all ease .3s;
  cursor: pointer;

  &:hover {
    background: ${colors.bgLight};
  }
`;

const DynamicComponentList = styledTS<{$hasMargin?: boolean}>(styled.div)`
  border-radius: ${dimensions.unitSpacing + 2}px;
  background: #F2F4F7;
  color: ${colors.textPrimary};
  box-shadow: 0px 1px 3px 0px rgba(16, 24, 40, 0.10), 0px 1px 2px 0px rgba(16, 24, 40, 0.06);
  margin: ${props => props.$hasMargin && `${dimensions.coreSpacing}px 0`};
  padding: ${dimensions.unitSpacing - 5}px;

  > h4 {
    margin: 0;
    padding: ${dimensions.unitSpacing}px ${dimensions.coreSpacing}px;
    color: #666;
    font-size: 15px;
  }

  ${SidebarContent} {
    background: ${colors.colorWhite};
    border-radius: 8px;
    padding: ${dimensions.unitSpacing}px ${dimensions.coreSpacing}px;

    ${SelectWrapper} {
      border: 0;
      border-radius: 4px;
      height: auto;

      select {
        padding: 0 ${dimensions.unitSpacing}px;
      }
    }

    input, select, textarea {
      background: #F2F4F7;
      border-radius: 4px;
      border-bottom: 0;
      padding: ${dimensions.unitSpacing}px;
      margin-top: 5px;
    }

    label {
      text-transform: initial;
      font-size: 13px;
      color: ${colors.colorCoreGray};
    }
  }
`;

const ProductFormContainer = styled.div`
  margin-bottom: ${dimensions.coreSpacing + dimensions.unitSpacing}px;

  .flex-wrap {
    flex-wrap: wrap;
  }

  thead th {
    z-index: 0 !important;
  }
`;

export {
  Actions,
  PopoverButton,
  PopoverHeader,
  BoxRoot,
  ColorPick,
  ColorPicker,
  FullContent,
  ModalFooter,
  Info,
  InfoTitle,
  InfoWrapper,
  Links,
  FormWrapper,
  FormColumn,
  CenterContent,
  ActivityContent,
  DropIcon,
  MenuDivider,
  MiddleContent,
  HomeContainer,
  DateWrapper,
  CloseModal,
  DynamicComponentList,
  ScrollWrapper,
  DateContainer,
  TabContent,
  ButtonRelated,
  Loader,
  SimpleButton,
  TopHeader,
  Title,
  Count,
  Limited,
  Flex,
  FlexHeight,
  LinkButton,
  FlexCenter,
  EllipsisContent,
  CustomerName,
  PluginLayout,
  Column,
  Wrapper,
  Pin,
  ModalOverlay,
  MapContainer,
  ImageWrapper,
  TextWrapper,
  DialogWrapper,
  DynamicTableWrapper,
  DialogContent,
  PopoverPanel,
  TipContent,
  UploadBtn,
  AttachmentContainer,
  DynamicContent,
  DynamicContentLeft,
  DynamicContentRight,
  DynamicContentLeftButtonWrapper,
  ProductFormContainer,
  XypTitle
};
