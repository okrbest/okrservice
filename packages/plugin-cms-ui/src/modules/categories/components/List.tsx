import Button from '@erxes/ui/src/components/Button';
import DataWithLoader from '@erxes/ui/src/components/DataWithLoader';
import ModalTrigger from '@erxes/ui/src/components/ModalTrigger';
import Pagination from '@erxes/ui/src/components/pagination/Pagination';
import Submenu from '@erxes/ui/src/components/subMenu/Submenu';
import Table from '@erxes/ui/src/components/table';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';
import { BarItems, Contents } from '@erxes/ui/src/layout/styles';
import { __ } from 'coreui/utils';
import React from 'react';
import { menu } from '../../../routes';
import { EmptyState, EmptyText, EmptyTitle } from '../../../styles';
import { IWebSite } from '../../../types';
import CategoryForm from '../containers/Form';
import Row from './Row';

type Props = {
  website: IWebSite;
  clientPortalId: string;
  categoryTree: any[];
  totalCount: number;
  queryParams: any;
  loading: boolean;
  remove: (productId: string) => void;
  refetch?: () => void;
};

const List = (props: Props) => {
  const { totalCount, queryParams, loading, categoryTree, remove } = props;

  const renderRow = (categories, level = 0) => {
    return categories.map((category) => (
      <React.Fragment key={category._id}>
        <Row category={category} remove={remove} level={level} />
        {category.children.length > 0 &&
          renderRow(category.children, level + 1)}
      </React.Fragment>
    ));
  };

  //   queryParams.loadingMainQuery = loading;
  //   const actionBarLeft: React.ReactNode;

  const trigger = (
    <Button btnStyle='primary' size='small' icon='plus-circle'>
      Add category
    </Button>
  );

  const formContent = (formProps) => (
    <CategoryForm
      {...formProps}
      clientPortalId={props.clientPortalId}
      refetch={props.refetch}
    />
  );

  const righActionBar = (
    <BarItems>
      <ModalTrigger
        size='lg'
        title='Add category'
        autoOpenKey='showAppAddModal'
        trigger={trigger}
        content={formContent}
      />
    </BarItems>
  );

  const breadcrumb = [
    { title: 'Websites', link: '/cms' },
    {
      title: props.website?.name,
      link: '/cms/website/' + props.clientPortalId + '/categories',
    },
    { title: __('Categories') },
  ];

  const leftActionBar = (
    <BarItems>
      <Submenu items={menu(props.clientPortalId)} />
    </BarItems>
  );

  const actionBar = (
    <Wrapper.ActionBar right={righActionBar} left={leftActionBar} />
  );

  const content = (
    <Contents $hasBorder={true}>
      <div style={{ flex: 1 }}>
        <Table $whiteSpace='nowrap' $hover={true}>
          <thead>
            <tr>
              <th>{__('Name')}</th>
              <th>{__('Slug')}</th>
              <th>{__('Description')}</th>
              <th>{__('Last modified date')}</th>
              <th>{__('Last modified by')}</th>
              <th>{__('Actions')}</th>
            </tr>
          </thead>
          <tbody>{renderRow(categoryTree)}</tbody>
        </Table>
      </div>
    </Contents>
  );

  return (
    <>
      <Wrapper
        transparent={false}
        header={
          <Wrapper.Header
            title={__('Category')}
            queryParams={queryParams}
            breadcrumb={breadcrumb}
          />
        }
        actionBar={actionBar}
        footer={<Pagination count={totalCount} />}
        content={
          <DataWithLoader
            data={content}
            loading={loading}
            count={props.totalCount}
            emptyContent={
              <EmptyState>
                <EmptyTitle>No Categories Yet</EmptyTitle>
                <EmptyText>Create your first category</EmptyText>
              </EmptyState>
            }
          />
        }
      />
    </>
  );
};

export default List;
