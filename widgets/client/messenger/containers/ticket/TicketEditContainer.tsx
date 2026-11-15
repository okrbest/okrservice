import * as React from 'react';
import { useMutation, useQuery } from '@apollo/client';

import { TICKET_EDIT } from '../../graphql/mutations';
import { TICKET_EDIT_STATE } from '../../graphql/queries';
import TicketSubmitForm from '../../components/ticket/TicketSubmitForm';
import { FileWithUrl } from '../../components/ticket/useAttachUpload';
import {
  EDIT_STAGE_LOCKED,
  EditDraft,
  LOCKED_NOTICE,
  buildEditVariables,
  descriptionToText,
  editErrorNotice,
  hasEditError,
} from '../../components/ticket/editHelpers';
import { connection } from '../../connection';
import { useRouter } from '../../context/Router';
import { useTicket } from '../../context/Ticket';

type Props = {
  loading?: boolean;
};

// 접수한 티켓 고치기: 접수 화면을 수정 모드로 쓴다. 고칠 수 있는지는 서버가 정하고, 저장할 때 다시 확인한다
const TicketEditContainer = (_props: Props) => {
  const { setRoute } = useRouter();
  const { ticketData, setTicketData } = useTicket();
  const { customerId } = connection.data;
  const ticketId = ticketData && ticketData._id;

  const [initial, setInitial] = React.useState<EditDraft | null>(null);
  const [formData, setFormData] = React.useState({
    ticketType: '',
    title: '',
    description: '',
    visibility: 'public',
  });
  const [files, setFiles] = React.useState<FileWithUrl[]>([]);
  const [error, setError] = React.useState('');

  // 고치기 전 최신 값으로 채운다(목록에서 받은 값은 오래됐을 수 있음)
  const { data, loading, refetch } = useQuery(TICKET_EDIT_STATE, {
    variables: { customerId, ticketId },
    fetchPolicy: 'network-only',
    skip: !customerId || !ticketId,
  });
  const state = data && data.widgetsTicketEditState;
  const canEditContent = Boolean(state && state.canEditContent);

  React.useEffect(() => {
    if (!state || initial) {
      return;
    }

    if (!state.canEdit || !state.ticket) {
      setRoute('ticket-progress');
      return;
    }

    const { ticket } = state;
    const draft: EditDraft = {
      ticketType: ticket.type || 'inquiry',
      description: descriptionToText(ticket.description),
      visibility: ticket.visibility || 'public',
      attachments: ticket.attachments || [],
    };

    setInitial(draft);
    setFormData({
      ticketType: draft.ticketType,
      title: ticket.name || '',
      description: draft.description,
      visibility: draft.visibility,
    });
    setFiles(draft.attachments as FileWithUrl[]);
  }, [state, initial, setRoute]);

  const [ticketEdit, { loading: saving }] = useMutation(TICKET_EDIT, {
    onCompleted(result) {
      const ticket = result?.widgetsTicketEdit?.ticket;

      if (ticket) {
        // 진행 상황 카드가 바로 바뀐 값을 그리도록(구분은 requestType을 먼저 본다)
        setTicketData({ ...ticketData, ...ticket, requestType: ticket.type });
      }

      setRoute('ticket-progress');
    },
    onError(e) {
      // 쓴 내용은 그대로 두고 안내만. 처리가 시작됐으면 공개 설정만 고치는 화면으로 바꾼다
      setError(editErrorNotice(e));

      if (hasEditError(e, EDIT_STAGE_LOCKED)) {
        refetch().catch(() => undefined);
      }
    },
  });

  const handleChange = (e: any) => {
    const { id, value } = e.target;

    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const onSubmit = (e: any) => {
    e.preventDefault();

    if (!initial || saving) {
      return;
    }

    setError('');

    const variables = buildEditVariables({
      customerId,
      ticketId,
      canEditContent,
      initial,
      form: {
        ticketType: formData.ticketType,
        description: formData.description,
        visibility: formData.visibility,
        attachments: files,
      },
    });

    // 바뀐 것이 없으면 저장하지 않고 돌아간다
    if (Object.keys(variables).length === 2) {
      setRoute('ticket-progress');
      return;
    }

    ticketEdit({ variables });
  };

  const notice = error
    ? { text: error, error: true }
    : !canEditContent && initial
      ? { text: LOCKED_NOTICE }
      : undefined;

  return (
    <TicketSubmitForm
      mode="edit"
      contentLocked={!canEditContent}
      notice={notice}
      isSubmitted={false}
      loading={saving}
      formData={formData}
      ticketNumber=""
      handleSubmit={onSubmit}
      handleChange={handleChange}
      handleButtonClick={() => undefined}
      handleFiles={setFiles}
      files={files}
      customerLoading={loading && !initial}
    />
  );
};

export default TicketEditContainer;
