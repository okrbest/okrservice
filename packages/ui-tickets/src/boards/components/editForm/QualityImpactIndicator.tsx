import { ItemIndicator } from '../../styles/stage';
import React from 'react';
import { colors } from '@erxes/ui/src/styles';
import styled from 'styled-components';
import styledTS from 'styled-components-ts';

const Indicator = styled(ItemIndicator)`
  margin: 0 5px 0 0;
`;

const FullBackgrounded = styledTS<{ color: string }>(styled.span)`
  background-color: ${props => props.color};
  margin-left: 5px;
  padding: 5px 10px;
  border-radius: 300px;
  color: ${colors.colorWhite};
  font-weight: 450;
  font-size: 12px;
`;

type IProps = {
  value: string;
  isFullBackground?: boolean;
};

export default (props: IProps) => {
  const findColor = () => {
    switch (props.value) {
      case 'critical':
      case '치명적':
        return colors.colorCoreRed;
      case 'major':
      case '중대':
        return colors.colorCoreYellow;
      case 'minor':
      case '경미':
        return colors.colorCoreBlue;
      case 'visual':
      case '시각적':
        return colors.colorCoreLightGray;

      default:
        return colors.colorCoreLightGray;
    }
  };

  const getLabel = () => {
    switch (props.value) {
      case 'critical':
        return '치명적';
      case 'major':
        return '중대';
      case 'minor':
        return '경미';
      case 'visual':
        return '시각적';
      default:
        return props.value;
    }
  };

  if (props.isFullBackground) {
    return (
      <FullBackgrounded color={findColor()}>{getLabel()}</FullBackgrounded>
    );
  }

  return <Indicator color={findColor()} />;
};

