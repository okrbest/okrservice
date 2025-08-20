import { IItem, IItemParams } from '../boards/types';

export interface ITicket extends IItem {
  source?: string;
  requestType?: string;
}

export interface ITicketParams extends IItemParams {
  source?: string;
  requestType?: string;
}

export type TicketsQueryResponse = {
  tickets: ITicket[];
  loading: boolean;
  refetch: () => void;
  fetchMore: any;
};

export type TicketsTotalCountQueryResponse = {
  ticketsTotalCount: number;
  loading: boolean;
  refetch: () => void;
  fetchMore: any;
};
