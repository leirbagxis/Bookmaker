import type { OddSelection } from "./odds";

export type ClientMessage = {
  type: 'GET_TODAY_MATCHES' | 'GET_EVENT_ODDS' | 'UNSUBSCRIBE_EVENT' | 'PING' | 'LOGIN' | 'PLACE_BET' | string;
  event_id?: number;
  username?: string;
  amount?: number;
  selections?: OddSelection[];
};

export type ServerMessage =
  | { type: 'TODAY_MATCHES'; data: unknown }
  | { type: 'MATCHES_UPDATED'; data: unknown }
  | { type: 'EVENT_ODDS'; event_id: number; data: unknown }
  | { type: 'ODDS_UPDATED'; event_id: number; data: unknown }
  | { type: 'LOGIN_SUCCESS'; data: any }
  | { type: 'BALANCE_UPDATE'; data: any }
  | { type: 'BET_PLACED'; message: string; data?: any }
  | { type: 'MY_BETS'; data: any }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';
