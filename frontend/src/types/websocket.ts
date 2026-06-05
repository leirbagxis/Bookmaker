export type ClientMessage = {
  type: 'GET_TODAY_MATCHES' | 'GET_EVENT_ODDS' | 'PING' | string;
  event_id?: number;
};

export type ServerMessage =
  | { type: 'TODAY_MATCHES'; data: unknown }
  | { type: 'EVENT_ODDS'; event_id: number; data: unknown }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';
