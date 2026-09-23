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
  saveItem: (doc, callback?: (item) => void) => void;
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
  const itemIdRef = useRef(item._id);
  itemIdRef.current = item._id;

  useEffect(() => {
    // 증상 3(작성 중 창이 갑자기 닫히고 보드로 이동) 진단용 -
    // X버튼/ESC/오버레이 클릭 등 명시적으로 닫은 경우가 아닌데 언마운트되면 breadcrumb를 남김
    return () => {
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

  const saveItemHandler = (doc: { [key: string]: any }) => {
    saveItem(doc, (updatedItem) => {
      setUpdatedItem(updatedItem);
    });
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

    localStorage.removeItem(`${options.type}_description_${item._id}`);
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
          <CloseModal onClick={onHideModal}>
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
          type="button"
          onClick={onHideModal}
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
            <Dialog.Panel className={` dialog-size-xl`}>
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
