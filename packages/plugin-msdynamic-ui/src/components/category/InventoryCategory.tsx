import { __ } from 'coreui/utils';
import React from 'react';
import { Wrapper } from '@erxes/ui/src/layout';
import {
  CollapseContent,
  DataWithLoader,
  Pagination,
  Table,
} from '@erxes/ui/src/components';
import Button from '@erxes/ui/src/components/Button';
import { BarItems } from '@erxes/ui/src/layout/styles';
import { menuDynamic } from '../../constants';
import Row from './InventoryCategoryRow';
import SelectBrands from '@erxes/ui/src/brands/containers/SelectBrands';
import SelectProductCategory from '@erxes/ui-products/src/containers/SelectProductCategory';

type Props = {
  queryParams: any;
  loading: boolean;
  setBrand: (brandId: string) => void;
  setCategory: (brandId: string) => void;
  toCheckCategory: () => void;
  toSyncCategory: (action: string, categories: any[]) => void;
  items: any;
};

const InventoryCategory = ({
  items,
  loading,
  queryParams,
  setBrand,
  setCategory,
  toCheckCategory,
  toSyncCategory,
}: Props) => {
  const checkButton = (
    <BarItems>
      <span>{items && items.matched && `Matched: ${items.matched.count}`}</span>
      <SelectProductCategory
        label="Choose product category"
        name="productCategoryId"
        initialValue={queryParams.categoryId || ''}
        customOption={{
          value: '',
          label: '...Clear product category filter',
        }}
        onSelect={(category) => setCategory(category as string)}
        multi={false}
      />

      <SelectBrands
        label={__('Choose brands')}
        onSelect={(brand) => setBrand(brand as string)}
        initialValue={queryParams.brandId}
        multi={false}
        name="selectedBrands"
        customOption={{
          label: __('No Brand (noBrand)'),
          value: '',
        }}
      />

      <Button
        btnStyle="warning"
        size="small"
        icon="check-1"
        onClick={toCheckCategory}
      >
        Check
      </Button>
    </BarItems>
  );

  const header = <Wrapper.ActionBar right={checkButton} />;

  const calculatePagination = (data: any) => {
    if (Object.keys(queryParams).length !== 1) {
      if (queryParams.perPage !== undefined && queryParams.page === undefined) {
        data = data.slice(queryParams.perPage * 0, queryParams.perPage * 1);
      }

      if (queryParams.page !== undefined) {
        if (queryParams.perPage !== undefined) {
          data = data.slice(
            Number(queryParams.page - 1) * queryParams.perPage,
            Number((queryParams.page - 1) * queryParams.perPage) +
              Number(queryParams.perPage),
          );
        } else {
          data = data.slice(
            (queryParams.page - 1) * 20,
            (queryParams.page - 1) * 20 + 20,
          );
        }
      }
    } else {
      data = data.slice(0, 20);
    }

    return data;
  };

  const renderTable = (data: any, action: string) => {
    data = calculatePagination(data);

    const excludeSyncTrue = (syncData: any) => {
      return syncData.filter((d) => d.syncStatus === false);
    };

    const onClickSync = () => {
      data = excludeSyncTrue(data);
      toSyncCategory(action, data);
    };

    const renderRow = (rowData: any, rowSction: string) => {
      if (rowData.length > 100) {
        rowData = rowData.slice(0, 100);
      }

      return rowData.map((p) => (
        <Row key={p.code} category={p} action={rowSction} />
      ));
    };

    const syncButton = (
      <>
        <Button
          btnStyle="primary"
          size="small"
          icon="check-1"
          onClick={onClickSync}
        >
          Sync
        </Button>
      </>
    );

    const subHeader = <Wrapper.ActionBar right={syncButton} />;
    return (
      <>
        {subHeader}
        <Table $hover={true}>
          <thead>
            <tr>
              <th>{__('Code')}</th>
              <th>{__('Name')}</th>
              <th>{__('Description')}</th>
              {action === 'UPDATE' ? <th>{__('Update Status')}</th> : <></>}
              {action === 'CREATE' ? <th>{__('Create Status')}</th> : <></>}
              {action === 'DELETE' ? <th>{__('Delete Status')}</th> : <></>}
            </tr>
          </thead>
          <tbody>{renderRow(data, action)}</tbody>
        </Table>
      </>
    );
  };

  const content = (
    <>
      {header}
      <br />
      <CollapseContent
        title={__(
          'Create categories' +
            (items.create ? ':  ' + items.create.count : ''),
        )}
      >
        <>
          <DataWithLoader
            data={
              items.create ? renderTable(items.create?.items, 'CREATE') : []
            }
            loading={false}
            emptyText={__('Please check first.')}
            emptyIcon="leaf"
            size="large"
            objective={true}
          />
          <Pagination count={items.create?.count || 0} />
        </>
      </CollapseContent>
      <CollapseContent
        title={__(
          'Update categories' +
            (items.update ? ':  ' + items.update.count : ''),
        )}
      >
        <>
          <DataWithLoader
            data={
              items.update ? renderTable(items.update?.items, 'UPDATE') : []
            }
            loading={false}
            emptyText={__('Please check first.')}
            emptyIcon="leaf"
            size="large"
            objective={true}
          />
          <Pagination count={items.update?.count || 0} />
        </>
      </CollapseContent>
      <CollapseContent
        title={__(
          'Delete categories' +
            (items.delete ? ':  ' + items.delete.count : ''),
        )}
      >
        <>
          <DataWithLoader
            data={
              items.delete ? renderTable(items.delete?.items, 'DELETE') : []
            }
            loading={false}
            emptyText={'Please check first.'}
            emptyIcon="leaf"
            size="large"
            objective={true}
          />
          <Pagination count={items.delete?.count || 0} />
        </>
      </CollapseContent>
    </>
  );

  return (
    <Wrapper
      header={
        <Wrapper.Header
          title={__('Check category')}
          queryParams={queryParams}
          submenu={menuDynamic}
        />
      }
      content={
        <DataWithLoader
          data={content}
          loading={loading}
          count={1}
          emptyImage="/images/actions/1.svg"
        />
      }
      transparent={true}
      hasBorder={true}
    />
  );
};

export default InventoryCategory;
