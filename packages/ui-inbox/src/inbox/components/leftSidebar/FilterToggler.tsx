import { GroupTitle } from './styles';
import Icon from '@erxes/ui/src/components/Icon';
import { Link } from 'react-router-dom';
import React from 'react';
import { __ } from 'coreui/utils';

type Props = {
  groupText: string;
  isOpen: boolean;
  toggle: (params: { isOpen: boolean }) => void;
  manageUrl?: string;
  children: React.ReactNode;
};

type State = {
  isOpen: boolean;
};

export default class FilterToggler extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { isOpen: props.isOpen };
  }

  onClick = (e) => {
    const { isOpen } = this.state;

    this.setState({ isOpen: !isOpen }, () => {
      this.props.toggle({ isOpen: !isOpen });
    });
  };

  render() {
    const { groupText, children, manageUrl } = this.props;
    const { isOpen } = this.state;

    return (
      <>
        <GroupTitle $isOpen={isOpen}>
          <span onClick={this.onClick}>
            {__(groupText)}
            <Icon icon="angle-down" />
          </span>
          {manageUrl && (
            <Link to={manageUrl}>
              <Icon icon="cog" size={14} />
            </Link>
          )}
        </GroupTitle>
        {this.state.isOpen && children}
      </>
    );
  }
}
