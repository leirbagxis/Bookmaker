export type Match = {
  eventId: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startTime: string;
  status?: string;
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  homeScore?: number;
  awayScore?: number;
  liveMinute?: number;
  clock?: string;
};

export type CompetitionGroup = {
  name: string;
  priority: number;
  matches: Match[];
};
