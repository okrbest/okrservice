import React from 'react';
import styled from 'styled-components';
import Button from '@erxes/ui/src/components/Button';

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff3cd;
  border-bottom: 2px solid #ffc107;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
`;

const DATE_OPTIONS = [
  { value: '', label: '전체' },
  { value: '30', label: '30일 이상' },
  { value: '60', label: '60일 이상' },
  { value: '90', label: '90일 이상' },
];

type Props = {
  selectedCount: number;
  onArchive: () => void;
  onCancel: () => void;
  dateThreshold: string;
  onDateThresholdChange: (value: string) => void;
};

export default function BulkSelectBar({
  selectedCount,
  onArchive,
  onCancel,
  dateThreshold,
  onDateThresholdChange,
}: Props) {
  return (
    <Bar>
      <strong style={{ color: '#856404' }}>
        {selectedCount > 0 ? `✓ ${selectedCount}개 선택됨` : '카드를 선택하세요'}
      </strong>
      <span style={{ color: '#856404' }}>|</span>
      <span style={{ color: '#495057' }}>날짜 조건:</span>
      <select
        value={dateThreshold}
        onChange={(e) => onDateThresholdChange(e.target.value)}
        style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ced4da' }}
      >
        {DATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <Button
        btnStyle='danger'
        size='small'
        onClick={onArchive}
        disabled={selectedCount === 0}
      >
        선택 항목 아카이브
      </Button>
      <Button btnStyle='simple' size='small' onClick={onCancel}>
        취소
      </Button>
    </Bar>
  );
}
