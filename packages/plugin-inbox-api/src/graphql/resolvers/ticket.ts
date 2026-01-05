import { IContext } from '../../connectionResolver';

export default {
  async customerName(ticket: any, _args, { subdomain }: IContext) {
    // customerName은 이미 widgetsTicketList resolver에서 반환된 데이터에 포함되어 있습니다
    // GraphQL이 자동으로 필드를 매핑하지만, 명시적으로 반환합니다
    return ticket.customerName || null;
  },
};

