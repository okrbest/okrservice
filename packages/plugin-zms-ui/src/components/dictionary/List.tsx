import Button from '@erxes/ui/src/components/Button';
import { IDictionary, IParent } from '../../types';
import Row from './Row';
import { IButtonMutateProps } from '@erxes/ui/src/types';
import { __ } from 'coreui/utils';
import React from 'react';
import Form from './Form';
import { Title } from '@erxes/ui-settings/src/styles';
import ModalTrigger from '@erxes/ui/src/components/ModalTrigger';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';
import Table from '@erxes/ui/src/components/table';
import DataWithLoader from '@erxes/ui/src/components/DataWithLoader';
import asyncComponent from '@erxes/ui/src/components/AsyncComponent';

type Props = {
  dictionaries: IDictionary[];
  types: IParent[];
  parentId: string;
  renderButton: (props: IButtonMutateProps) => JSX.Element;
  remove: (zms: IDictionary) => void;
  loading: boolean;
};

function List({
  dictionaries,
  parentId,
  types,
  remove,
  renderButton,
  loading
}: Props) {
  const trigger = (
    <Button id={'AddDictionaryButton'} btnStyle="success" icon="plus-circle">
      Add Dictionary
    </Button>
  );

  const modalContent = props => (
    <Form
      {...props}
      types={types}
      parentId={parentId}
      renderButton={renderButton}
    />
  );

  const actionBarRight = (
    <ModalTrigger
      title={__('Add Dictionary')}
      trigger={trigger}
      content={modalContent}
      enforceFocus={false}
    />
  );

  const title = <Title capitalize={true}>{__('Parent')}</Title>;

  const actionBar = (
    <Wrapper.ActionBar left={title} right={actionBarRight} wideSpacing />
  );
  const content = (
    <Table>
      <thead>
        <tr>
          <th>{__('Startted')}</th>
          <th>{__('Code')}</th>
          <th>{__('Type')}</th>
          <th>{__('Actions')}</th>
        </tr>
      </thead>
      <tbody id={'ZmssShowing'}>
        {dictionaries.map(dictionary => {
          return (
            <Row
              space={0}
              key={dictionary._id}
              dictionary={dictionary}
              parentId={parentId}
              remove={remove}
              renderButton={renderButton}
              dictionaries={dictionaries}
              parents={types}
            />
          );
        })}
      </tbody>
    </Table>
  );

  const SideBarList = asyncComponent(() =>
    import(
      /* webpackChunkName: "List - Zmss" */ '../../containers/dictionary/SideBarList'
    )
  );

  return (
    <Wrapper
      header={
        <Wrapper.Header
          title={__('Zmss')}
          submenu={[
            { title: 'Zms', link: '/plugin-zms/zms' },
            { title: 'Dictionary', link: '/plugin-zms/dictionary' }
          ]}
        />
      }
      actionBar={actionBar}
      content={
        <DataWithLoader
          data={content}
          loading={loading}
          count={dictionaries.length}
          emptyText={__('Theres no zms')}
          emptyImage="/images/actions/8.svg"
        />
      }
      leftSidebar={<SideBarList currentTypeId={parentId} />}
      transparent={true}
      hasBorder
    />
  );
}

export default List;
