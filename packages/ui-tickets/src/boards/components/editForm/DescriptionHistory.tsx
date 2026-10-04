// 티켓 설명 임시저장함 — 저장·취소를 누를 때, 쓰는 동안, 직접 저장할 때 남긴 글을 보여 주고 편집창에 다시 넣는다.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@erxes/ui/src/components/Button';
import Popover from '@erxes/ui/src/components/Popover';
import { __ } from 'coreui/utils';
import dayjs from 'dayjs';
import styled from 'styled-components';

import {
  DescriptionHistoryKind,
  DescriptionHistoryMeta,
} from '../../descriptionHistory';
import {
  RecordHistoryResult,
  loadDescriptionHistory,
  recordDescriptionHistory,
} from '../../descriptionHistoryStore';

const KIND_LABELS: Record<DescriptionHistoryKind, string> = {
  save: 'On save',
  cancel: 'On cancel',
  auto: 'Auto-saved',
  restore: 'Before loading',
  manual: 'Saved by you',
};

const RESULT_MESSAGES: Record<RecordHistoryResult, string> = {
  saved: 'Saved to the draft box.',
  same: 'The same text is already saved.',
  empty: 'There is nothing to save.',
  failed: 'Could not save in this browser.',
};

const List = styled.div`
  width: 340px;
  max-width: 80vw;
  max-height: 320px;
  overflow-y: auto;
  text-align: left;
`;

const Hint = styled.div`
  padding: 8px 12px;
  font-size: 11px;
  color: #888;
  border-bottom: 1px solid #eee;
`;

const SaveNow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  font-size: 12px;
  color: #555;
`;

const Empty = styled.div`
  padding: 12px;
  font-size: 12px;
  color: #888;
`;

const Row = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f3f3;

  &:hover {
    background: #f6f7fb;
  }
`;

const RowMeta = styled.div`
  font-size: 11px;
  color: #888;
`;

const RowPreview = styled.div`
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** 그 티켓의 기록 목록과 "기록 남기기"를 돌려준다. active(편집 중)일 때만 목록을 읽는다. */
export const useDescriptionHistory = (itemKey: string, active: boolean) => {
  const [entries, setEntries] = useState<DescriptionHistoryMeta[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 마지막으로 요청한 목록만 반영한다(응답 순서가 뒤바뀌어도 옛 목록이 덮지 않게)
  const loadSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const list = await loadDescriptionHistory(itemKey);

    if (mountedRef.current && seq === loadSeqRef.current) {
      setEntries(list);
    }
  }, [itemKey]);

  const record = useCallback(
    async (
      content: string | null | undefined,
      kind: DescriptionHistoryKind,
    ): Promise<RecordHistoryResult> => {
      const result = await recordDescriptionHistory(itemKey, content, kind);
      await refresh();

      return result;
    },
    [itemKey, refresh],
  );

  useEffect(() => {
    if (active) {
      refresh();
    }
  }, [active, refresh]);

  return { entries, record };
};

type Props = {
  entries: DescriptionHistoryMeta[];
  onSelect: (entry: DescriptionHistoryMeta) => void;
  // 지금 편집창의 글을 임시저장함에 직접 남긴다
  onSaveNow: () => Promise<RecordHistoryResult>;
};

// 임시저장함을 열 때마다 새로 그려진다 — 직접 저장 결과 안내도 열 때마다 비워진다
const DraftBoxPanel = ({
  entries,
  onSelect,
  onSaveNow,
  close,
}: Props & { close: () => void }) => {
  const [result, setResult] = useState<RecordHistoryResult | null>(null);
  // 버튼을 비활성화하면 초점이 임시저장함 밖으로 빠져 Esc가 티켓 창 닫기로 간다 — 중복 클릭만 막는다
  const savingNowRef = useRef(false);

  const saveNow = async () => {
    if (savingNowRef.current) {
      return;
    }

    savingNowRef.current = true;
    const nextResult = await onSaveNow();
    savingNowRef.current = false;
    setResult(nextResult);
  };

  return (
    <List>
      <SaveNow>
        <Button btnStyle="primary" size="small" icon="save" onClick={saveNow}>
          {__('Save current text')}
        </Button>
        {result && <span role="status">{__(RESULT_MESSAGES[result])}</span>}
      </SaveNow>
      <Hint>
        {__(
          'Kept only in this browser and not visible to others. Pick one to put it back in the editor — what you are writing now is kept here too.',
        )}
      </Hint>
      {entries.length === 0 && <Empty>{__('No drafts saved yet.')}</Empty>}
      {entries.map((entry) => (
        <Row
          key={entry.id}
          role="button"
          onClick={() => {
            onSelect(entry);
            close();
          }}
        >
          <RowMeta>
            {dayjs(entry.savedAt).format('MM/DD HH:mm')} ·{' '}
            {__(KIND_LABELS[entry.kind])}
            {entry.imageCount > 0 && ` · ${__('Photo')} ${entry.imageCount}`}
          </RowMeta>
          <RowPreview>{entry.preview || `(${__('Photo')})`}</RowPreview>
        </Row>
      ))}
    </List>
  );
};

const DescriptionHistoryButton = (props: Props) => (
  <Popover
    placement="top-start"
    closeAfterSelect={true}
    // 취소·저장 버튼과 같은 줄에 놓는다
    style={{ display: 'inline-block', marginRight: 8 }}
    trigger={
      <Button btnStyle="simple" size="small" icon="history">
        {__('Draft box')}
      </Button>
    }
  >
    {(close) => <DraftBoxPanel {...props} close={close} />}
  </Popover>
);

export default DescriptionHistoryButton;
