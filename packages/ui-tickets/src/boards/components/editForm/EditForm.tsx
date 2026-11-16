import { IEditFormContent, IItem, IItemParams, IOptions } from '../../types';
import { __ } from 'coreui/utils';
import { router as routerUtils } from '@erxes/ui/src/utils';

import { ArchiveStatus } from '../../styles/item';
import { CloseModal } from '@erxes/ui/src/styles/main';
import Icon from '@erxes/ui/src/components/Icon';
import React, { useState, useEffect, Fragment, useRef } from 'react';
import { confirm } from '@erxes/ui/src/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  DialogContent,
  DialogWrapper,
  ModalOverlay,
} from '@erxes/ui/src/styles/main';
import { colors } from '@erxes/ui/src/styles';
import { rgba } from '@erxes/ui/src/styles/ecolor';
import styled from 'styled-components';
import * as Sentry from '@sentry/react';
import { parseDescriptionDraft } from '@erxes/ui/src/utils/descriptionDraft';
import { recordDescriptionHistory } from '../../descriptionHistoryStore';
import { isEditorEscapeToClose } from '../../editorEscape';
import {
  describeElement,
  findCoveredCloseButton,
} from '../../closeButtonDiagnostics';

// X를 누르고 이만큼 지나도 창이 남아 있으면 "안 닫힘"으로 기록한다(닫힘 애니메이션 200ms)
const CLOSE_STUCK_CHECK_MS = 1000;

const Relative = styled.div`
  position: relative;
`;

const DesktopCloseButton = styled.div`
  @media (max-width: 1024px) {
    display: none;
  }
`;

const MobileCloseBar = styled.div`
  display: none;

  @media (max-width: 1024px) {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 20;
    background: ${colors.colorWhite};
    padding: 0 0 12px;
    margin: 0 0 8px;
    border-bottom: 1px solid ${colors.borderPrimary};
  }
`;

const MobileCloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 18px;
  background: ${rgba(colors.colorBlack, 0.08)};
  color: ${colors.colorCoreDarkGray};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: ${rgba(colors.colorBlack, 0.14)};
  }

  i {
    font-size: 18px;
    line-height: 1;
  }
`;

type Props = {
  options: IOptions;
  item: IItem;
  addItem: (doc: IItemParams, callback: () => void, msg?: string) => void;
  synchSingleCard: (itemId: string) => void;
  removeItem: (itemId: string, callback: () => void) => void;
  copyItem: (itemId: string, callback: () => void, msg?: string) => void;
  beforePopupClose: (afterPopupClose?: () => void) => void;
  formContent: ({ state, copy, remove }: IEditFormContent) => React.ReactNode;
  onUpdate: (item: IItem, prevStageId?) => void;
  saveItem: (doc, callback?: (item) => void, onError?: () => void) => void;
  isPopupVisible?: boolean;
  hideHeader?: boolean;
  refresh: boolean;
  descriptionConflictPending?: {
    doc: any;
    callback: (item: any) => void;
  } | null;
};

function EditForm(props: Props) {
  const {
    item,
    saveItem,
    onUpdate,
    removeItem,
    copyItem,
    options,
    beforePopupClose,
    refresh,
    descriptionConflictPending,
  } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const [stageId, setStageId] = useState(item.stageId);
  const [updatedItem, setUpdatedItem] = useState(item);
  const [prevStageId, setPrevStageId] = useState<string>('');
  const descriptionDirtyRef = useRef<(() => boolean) | null>(null);
  const intentionalCloseRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const hideModalRef = useRef<() => void>(() => undefined);
  const desktopCloseRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const stuckCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemIdRef = useRef(item._id);
  itemIdRef.current = item._id;

  useEffect(() => {
    // 증상 3(작성 중 창이 갑자기 닫히고 보드로 이동) 진단용 -
    // X버튼/ESC/오버레이 클릭 등 명시적으로 닫은 경우가 아닌데 언마운트되면 breadcrumb를 남김
    return () => {
      if (stuckCloseTimerRef.current) {
        clearTimeout(stuckCloseTimerRef.current);
      }

      if (!intentionalCloseRef.current) {
        Sentry.addBreadcrumb({
          category: 'modal',
          message: 'ticket detail modal closed unexpectedly',
          level: 'warning',
          data: { itemId: itemIdRef.current },
        });
      }
    };
  }, []);

  useEffect(() => {
    if (item.stageId !== stageId) {
      setPrevStageId(item.stageId);

      saveItem({ stageId }, (updatedItem) => {
        if (onUpdate) {
          onUpdate(updatedItem, prevStageId);
        }
      });
    }
  }, [stageId]);

  const onChangeStage = (stageId: string) => {
    setStageId(stageId);
    const { item, saveItem, onUpdate } = props;

    if (item.stageId !== stageId) {
      setPrevStageId(item.stageId);
    }
  };

  const saveItemHandler = (
    doc: { [key: string]: any },
    callback?: (item) => void,
    onError?: () => void,
  ) => {
    saveItem(
      doc,
      (updatedItem) => {
        setUpdatedItem(updatedItem);

        if (callback) {
          callback(updatedItem);
        }
      },
      onError,
    );
  };

  const remove = (id: string) => {
    removeItem(id, closeModal);
  };

  const copy = () => {
    copyItem(item._id, closeModal, options.texts.copySuccessText);
  };

  const closeModal = (afterPopupClose?: () => void) => {
    intentionalCloseRef.current = true;

    if (beforePopupClose) {
      beforePopupClose(afterPopupClose);
    } else if (afterPopupClose) {
      afterPopupClose();
    }
  };

  const clearDescriptionDraft = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const draftKey = `${options.type}_description_${item._id}`;
    const stored = localStorage.getItem(draftKey);
    const draft = stored ? parseDescriptionDraft(stored) : null;

    // "저장하지 않고 닫기"로 버리는 글도 임시저장함에 남겨 되찾을 수 있게 한다
    if (draft) {
      recordDescriptionHistory(draftKey, draft.content, 'cancel');
    }

    localStorage.removeItem(draftKey);
  };

  const performClose = () => {
    if (refresh) {
      routerUtils.setParams(navigate, location, { key: Math.random() });
    }

    closeModal(() => {
      if (updatedItem) {
        const itemName = localStorage.getItem(`${updatedItem._id}Name`) || '';

        if (itemName && updatedItem.name !== itemName) {
          saveItemHandler({ itemName });
        }

        localStorage.removeItem(`${updatedItem._id}Name`);
      }
      props.synchSingleCard(updatedItem._id);

      // if (updatedItem && props.onUpdate) {
      //   props.onUpdate(updatedItem, prevStageId);
      // }
    });
  };

  const onHideModal = () => {
    const isDescriptionDirty = descriptionDirtyRef.current?.() ?? false;

    if (isDescriptionDirty) {
      confirm(
        __(
          'You have unsaved description changes. Are you sure you want to close without saving?',
        ),
        {
          okLabel: __('Close without saving'),
          cancelLabel: __('Keep editing'),
          size: 'md',
        },
      ).then(() => {
        clearDescriptionDraft();
        performClose();
      });
      return;
    }

    performClose();
  };

  hideModalRef.current = onHideModal;

  // 설명 편집기에 커서가 있으면 Dialog가 ESC를 무시한다 — 편집기보다 먼저 받아 닫기로 넘긴다
  useEffect(() => {
    if (!props.isPopupVisible) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditorEscapeToClose(event, panelRef.current)) {
        hideModalRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);

    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [props.isPopupVisible]);

  // "X를 눌러도 반응 없음" 진단용 — X 자리를 눌렀는데 다른 요소가 클릭을 받으면 기록
  useEffect(() => {
    if (!props.isPopupVisible) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;

      // 확인 창(미저장 안내 등)이 떠 있을 때의 클릭은 제외
      if (target?.closest?.('.modal')) {
        return;
      }

      const covered = findCoveredCloseButton(
        [desktopCloseRef.current, mobileCloseRef.current],
        event.clientX,
        event.clientY,
        target,
      );

      if (covered) {
        Sentry.captureMessage('티켓 창 X가 다른 요소에 가려져 눌리지 않음', {
          level: 'warning',
          tags: { ticket_close: 'covered' },
          extra: {
            itemId: itemIdRef.current,
            coveredBy: describeElement(target),
            viewportWidth: window.innerWidth,
          },
        });
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);

    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [props.isPopupVisible]);

  // X를 눌렀는데 창도 그대로고 미저장 확인 창도 안 떴으면 기록(확인 창이 떠 있으면 정상)
  const onCloseButtonClick = () => {
    const isDescriptionDirty = descriptionDirtyRef.current?.() ?? false;

    onHideModal();

    if (stuckCloseTimerRef.current) {
      clearTimeout(stuckCloseTimerRef.current);
    }

    stuckCloseTimerRef.current = setTimeout(() => {
      stuckCloseTimerRef.current = null;

      const isConfirmShown = !!document.querySelector('.modal.show');

      if (panelRef.current?.isConnected && !isConfirmShown) {
        Sentry.captureMessage('티켓 창 X를 눌렀는데 닫히지 않음', {
          level: 'warning',
          tags: { ticket_close: 'stuck' },
          extra: {
            itemId: itemIdRef.current,
            descriptionDirty: isDescriptionDirty,
            viewportWidth: window.innerWidth,
          },
        });
      }
    }, CLOSE_STUCK_CHECK_MS);
  };

  const renderArchiveStatus = () => {
    if (item.status === 'archived') {
      return (
        <ArchiveStatus>
          <Icon icon="archive-alt" />
          <span>{__('This card is archived.')}</span>
        </ArchiveStatus>
      );
    }

    return null;
  };

  const renderHeader = () => {
    if (props.hideHeader) {
      return (
        <DesktopCloseButton>
          <CloseModal ref={desktopCloseRef} onClick={onCloseButtonClick}>
            <Icon icon="times" />
          </CloseModal>
        </DesktopCloseButton>
      );
    }

    return (
      <Dialog.Title as="h3">
        {__('Edit')}
        <Icon icon="times" size={24} onClick={onHideModal} />
      </Dialog.Title>
    );
  };

  const renderMobileCloseBar = () => {
    if (!props.hideHeader) {
      return null;
    }

    return (
      <MobileCloseBar>
        <MobileCloseButton
          ref={mobileCloseRef}
          type="button"
          onClick={onCloseButtonClick}
          aria-label={__('Close')}
        >
          <Icon icon="times" />
        </MobileCloseButton>
      </MobileCloseBar>
    );
  };

  return (
    <Transition appear show={props.isPopupVisible} as={Fragment}>
      {/* ESC 키와 오버레이 탭 모두 onClose로 들어온다. onHideModal이
            미저장 본문 변경을 확인 후 닫으므로 실수로 작업이 날아가지 않는다. */}
      <Dialog as="div" onClose={onHideModal} className={` relative z-10`}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ModalOverlay />
        </Transition.Child>
        <DialogWrapper>
          <DialogContent>
            <Dialog.Panel ref={panelRef} className={` dialog-size-xl`}>
              {renderArchiveStatus()}

              <Transition.Child>
                <Relative>
                  {renderHeader()}
                  <div className="dialog-description">
                    {renderMobileCloseBar()}
                    {props.formContent({
                      state: { stageId, updatedItem, prevStageId },
                      saveItem: saveItemHandler,
                      onChangeStage,
                      copy,
                      remove,
                      descriptionConflictPending:
                        descriptionConflictPending ?? null,
                      descriptionDirtyRef,
                    })}
                  </div>
                </Relative>
              </Transition.Child>
            </Dialog.Panel>
          </DialogContent>
        </DialogWrapper>
      </Dialog>
    </Transition>
  );
}

export default EditForm;
