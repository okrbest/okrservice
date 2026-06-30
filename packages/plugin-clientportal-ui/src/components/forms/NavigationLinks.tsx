import Button from '@erxes/ui/src/components/Button';
import FormControl from '@erxes/ui/src/components/form/Control';
import FormGroup from '@erxes/ui/src/components/form/Group';
import ControlLabel from '@erxes/ui/src/components/form/Label';
import { __ } from 'coreui/utils';
import React from 'react';
import { Block } from '../../styles';

type LinkRow = {
  label: string;
  url: string;
};

type Props = {
  externalLinks?: Record<string, string>;
  handleFormChange: (name: string, value: Record<string, string>) => void;
};

const toRows = (externalLinks?: Record<string, string>): LinkRow[] => {
  if (!externalLinks || Object.keys(externalLinks).length === 0) {
    return [{ label: '', url: '' }];
  }

  return Object.entries(externalLinks).map(([label, url]) => ({
    label,
    url,
  }));
};

const toExternalLinks = (rows: LinkRow[]): Record<string, string> =>
  rows.reduce<Record<string, string>>((acc, row) => {
    const label = row.label.trim();
    const url = row.url.trim();

    if (label && url) {
      acc[label] = url;
    }

    return acc;
  }, {});

function NavigationLinks({ externalLinks, handleFormChange }: Props) {
  const [rows, setRows] = React.useState<LinkRow[]>(() =>
    toRows(externalLinks)
  );

  const syncParent = (nextRows: LinkRow[]) => {
    handleFormChange('externalLinks', toExternalLinks(nextRows));
  };

  const updateRows = (nextRows: LinkRow[]) => {
    setRows(nextRows);
    syncParent(nextRows);
  };

  const onChangeRow = (index: number, field: keyof LinkRow, value: string) => {
    const nextRows = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );

    updateRows(nextRows);
  };

  const onAddRow = (e: React.MouseEvent) => {
    e.preventDefault();
    updateRows([...rows, { label: '', url: '' }]);
  };

  const onRemoveRow = (index: number) => {
    const nextRows = rows.filter((_, i) => i !== index);
    updateRows(nextRows.length > 0 ? nextRows : [{ label: '', url: '' }]);
  };

  return (
    <Block>
      <h4>{__('Header menu links')}</h4>
      <p>
        {__(
          'Links shown in the client portal header menu (hamburger). External URLs open in a new tab.'
        )}
      </p>
      {rows.map((row, index) => (
        <FormGroup key={`nav-link-${index}`}>
          <FlexRow>
            <FormGroup>
              <ControlLabel>{__('Label')}</ControlLabel>
              <FormControl
                value={row.label}
                placeholder={__('5240 Manual')}
                onChange={(e: React.FormEvent<HTMLElement>) =>
                  onChangeRow(
                    index,
                    'label',
                    (e.target as HTMLInputElement).value
                  )
                }
              />
            </FormGroup>
            <FormGroup>
              <ControlLabel>{__('URL')}</ControlLabel>
              <FormControl
                value={row.url}
                placeholder="https://docs.5240.cloud/"
                onChange={(e: React.FormEvent<HTMLElement>) =>
                  onChangeRow(
                    index,
                    'url',
                    (e.target as HTMLInputElement).value
                  )
                }
              />
            </FormGroup>
            <Button
              btnStyle="link"
              icon="times"
              type="button"
              onClick={() => onRemoveRow(index)}
            />
          </FlexRow>
        </FormGroup>
      ))}
      <Button
        btnStyle="simple"
        icon="plus-circle"
        type="button"
        onClick={onAddRow}
      >
        {__('Add link')}
      </Button>
    </Block>
  );
}

const FlexRow = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-end',
    }}
  >
    {children}
  </div>
);

export default NavigationLinks;
