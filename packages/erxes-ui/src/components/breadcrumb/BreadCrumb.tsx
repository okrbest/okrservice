import { IBreadCrumbItem } from '../../types';
import React from 'react';
import styled from 'styled-components';
import { dimensions } from '../../styles';
import BreadCrumbItem from './BreadCrumbItem';
import { __ } from 'coreui/utils';

const Items = styled.ul`
  display: inline-block;
  padding: 0;
  margin: 0 ${dimensions.coreSpacing}px 0 0;
  list-style: none;
  font-size: 14px;

  @media (max-width: 560px) {
    display: none;
  }
`;

class BreadCrumb extends React.Component<{
  breadcrumbs: IBreadCrumbItem[];
}> {
  render() {
    const { breadcrumbs } = this.props;

    return (
      <Items role="navigation" aria-label="breadcrumbs">
        {breadcrumbs.map(b => (
          <BreadCrumbItem to={b.link || ''} active={!b.link} key={b.title}>
            {__(b.title)}
          </BreadCrumbItem>
        ))}
      </Items>
    );
  }
}

export default BreadCrumb;
