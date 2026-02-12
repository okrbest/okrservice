import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "@erxes/ui/src/components/Button";
import { __ } from "coreui/utils";
import styled from "styled-components";

const StyledModal = styled(Modal)`
  .modal-dialog {
    max-width: 330px;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 15px;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #eee;
  margin-top: 15px;
  display: flex;
  justify-content: center;
  gap: 10px;
`;

const ActionButton = styled(Button)`
  min-width: 85px;
`;

export type DescriptionConflictChoice = "reload" | "overwrite" | "cancel";

type Props = {
  show: boolean;
  onChoose: (choice: DescriptionConflictChoice) => void;
};

export default function DescriptionConflictModal({ show, onChoose }: Props) {
  return (
    <StyledModal
      show={show}
      onHide={() => onChoose("cancel")}
      backdrop="static"
      keyboard={false}
      size="sm"
      centered
    >
      <Modal.Body as={ModalBody}>
        {__("최신 내용이 아니에요.")}
        <br />
        {__("새로 불러올까요?")}
      </Modal.Body>
      <Modal.Footer as={ModalFooter}>
        <ActionButton
          btnStyle="success"
          size="small"
          onClick={() => onChoose("reload")}
        >
          {__("불러오기")}
        </ActionButton>
        <ActionButton
          btnStyle="warning"
          size="small"
          onClick={() => onChoose("overwrite")}
        >
          {__("덮어쓰기")}
        </ActionButton>
        <ActionButton
          btnStyle="simple"
          size="small"
          onClick={() => onChoose("cancel")}
        >
          {__("취소")}
        </ActionButton>
      </Modal.Footer>
    </StyledModal>
  );
}
