import React, { useState } from "react";
import styled, { css } from "styled-components";
import { __ } from "coreui/utils";

import { Disclosure } from "@headlessui/react";
import Icon from "./Icon";
import colors from "../styles/colors";
import { dimensions } from "../styles";
import { rgba } from "../styles/ecolor";
import styledTS from "styled-components-ts";

const Title = styledTS<{
  $compact?: boolean;
  $hasImage?: boolean;
  $background?: string;
}>(styled.a)`
  padding: ${(props) => (props.$compact ? "10px 20px" : "20px")};
  transition: background 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  color: ${colors.textPrimary};
  cursor: pointer;

  h4 {
    margin: 0;
    font-weight: 400;
  }

  ${(props) =>
    props.$hasImage &&
    css`
      &:after {
        content: "";
        display: block;
        position: absolute;
        border-radius: 100% 12%;
        width: 300px;
        height: 200%;
        background-color: ${rgba(props.$background, 0.13)};
        right: -40px;
        top: -30px;
      }

      img {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        height: 100%;
        max-width: 40%;
        padding: 10px 10px 0 10px;
        z-index: 2;
      }
    `};
`;

const Left = styled.div`
  display: flex;
  align-items: center;

  .description {
    color: ${colors.colorCoreGray};
  }

  > i {
    margin-right: ${dimensions.unitSpacing}px;
    transform: none !important;
  }
`;

const Container = styledTS<{ $open: boolean; $transparent?: boolean }>(
  styled.div
)`
  margin-bottom: 10px;
  box-shadow: ${(props) =>
    props.$transparent ? "none" : "0 0 6px 1px rgba(0,0,0,0.08)"};
  border-radius: 4px;
  background: ${(props) => (props.$open ? colors.bgLight : colors.colorWhite)};
  border-bottom: ${(props) =>
    props.$transparent && !props.$open
      ? `1px solid ${colors.borderPrimary}`
      : "none"};

  &:last-child {
    margin-bottom: 0;
  }

  > ${Title} i {
    font-size: 20px;
    transition: transform ease 0.3s;
    transform: ${(props) => props.$open && "rotate(180deg)"};
    line-height: ${dimensions.coreSpacing}px;
  }
`;

const Content = styledTS<{ $full: boolean }>(styled.div)`
  padding: ${(props) => (props.$full ? "0" : "20px")};
  border-top: 1px solid ${colors.borderPrimary};
  background: ${colors.colorWhite};
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;

  ${Container} {
    box-shadow: none;
    border-radius: 0;
    background: ${colors.colorWhite};
    border-bottom: 1px solid ${colors.borderPrimary};
    margin: 0;
  }
`;

type Props = {
  contendId?: string;
  title: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  open?: boolean;
  compact?: boolean;
  image?: string;
  beforeTitle?: React.ReactNode;
  onClick?: () => void;
  imageBackground?: string;
  id?: string;
  full?: boolean;
  transparent?: boolean;
};

function CollapseContent({
  open,
  onClick,
  image,
  imageBackground,
  transparent,
  contendId,
  compact,
  beforeTitle,
  description,
  title,
  full,
  id,
  children,
}: Props) {
  const [toggleOpen, toggleCollapse] = useState<boolean>(open || false);

  const onTitleClick = () => {
    toggleCollapse(!toggleOpen);

    if (onClick) {
      onClick();
    }
  };

  const hasImage = image ? true : false;

  return (
    <Disclosure as={Container} id={id} $transparent={transparent} defaultOpen={open}>
      <Disclosure.Button
        as={Title}
        href={contendId && `#${contendId}`}
        id={contendId}
        onClick={onTitleClick}
        $compact={compact}
        $hasImage={hasImage}
        $background={imageBackground}
      >
        <Left>
          {beforeTitle}
          <div>
            <h4>{__(title)}</h4>
            <span className="description">{__(description)}</span>
          </div>
        </Left>
        {hasImage ? (
          <img alt="heading" src={image} />
        ) : (
          <Icon icon="angle-down" />
        )}
      </Disclosure.Button>
      <Disclosure.Panel>
        <div>
          <Content $full={hasImage || full || false}>{children}</Content>
        </div>
      </Disclosure.Panel>
    </Disclosure>
  );
}

export default CollapseContent;
