export type OddSelection = {
  id: string;
  eventId: number;
  marketId: string;
  marketName: string;
  name: string;
  price: number;
  homeTeam?: string;
  awayTeam?: string;
};

export type OddsMarket = {
  id: string;
  name: string;
  selections: OddSelection[];
};
