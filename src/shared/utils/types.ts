export type MessageType =
  | 1 // Message contains fixture, market and live data.
  | 2 // Message contains all available info for this fixture, such messages can be produced through template changes or snapshot requests.
  | 3 // Message contains live and stats data.
  | 8; // Message contains settlement data

export type FixtureStatus =
  | "In progress" // The fixture is Live. Display fixture in Live section of your sportsbook.
  | "Not started yet" // The fixture is Pre-Game. Display fixture in Pre-Game section of your sportsbook.
  | "Finished" // The fixture is finished. Remove the fixture from your sportsbook.
  | "Prefinished" // The Pre-Game state of the fixture is finished. Remove the fixture from your sportsbook.
  | "Coverage lost" // There is no coverage for this fixture. You should remove it from your sportsbook. You will receive a full snapshot for the fixture once it's available.
  | "Suspended"; // The fixture is suspended. You should remove it from your sportsbook. In most cases after a Suspended message you will receive a Finished message for the fixture.

export type MarketStatus = "nu" | "new" | "suspended" | "deleted"; //

export type OddStatus = "nu" | "new" | "suspended" | "deleted";

export type Sport = {
  id: number;
  name: string;
};

export type Region = {
  seqId: number;
  id: number | null;
  name: string | null;
  providerId?: number;
  providerName?: string;
};

export type Competition = {
  seqId: number;
  id: number | null;
  name: string | null;
  providerId?: number;
  providerName?: string;
};

export type Participant = {
  seqId: number;
  id: number | null;
  name: string | null;
  providerId: number;
  providerName: string;
  home?: boolean;
};

export type FixtureProperties = {
  eventType: number;
  eventName: string;
  eventRound: string;
  counter?: number;
};

export type Fixture = {
  eventId: number;
  id: number | null;
  providerId: number;
  virtualCourtId: string;
  sportRadarId: number | null;
  betGeniusId: number | null;
  startDate: number; // timestamp in milliseconds
  properties: FixtureProperties;
  outright: boolean;
  racing: boolean;
  status: FixtureStatus;
  sport: Sport;
  region: Region;
  competition: Competition;
  participants: Participant[];
  participantsInfo: any[];
  uc?: number | null;
};

export type ParticipantInfo = {
  description: string;
  horseName: string;
};

export type MarketProperties = {
  id: number;
  uni_name: string;
  name_template: string;
  groups: number[];
  column: number;
  numbers: (number | string)[];
  sort: number;
  category: string;
  betradar_id: number | null;
  pi: {
    l: number; // Total value of liquidity
    v: number; // Lifetime trading volume
    s: number; // Spread. Difference between best ask and best bid
    bb: number; // Best bid. Highest current buy price
    ba: number; // Best ask. Lowest current sell price
  };
};

export type OddProperties = {
  description: string;
  h?: string; // Indicates whether this odd is part of the main line of the market. In case there is no value the field will be null or missing.
  o?: string; // 	Necessary information about the odd as documented for different market categories. In case there is no value the field will be null or missing.
  e?: string; // Necessary information about the odd as documented for different market categories. In case there is no value the field will be null or missing.
  uuid: string;
};

export type Odd = {
  name: string;
  sort: number;
  column: number;
  value: number;
  odd: number;
  impliedOdd: number | null;
  status: OddStatus;
  history?: any[]; // Previous values of odd. Available for racing events only.
  info: string;
  sp: boolean;
  properties: OddProperties;
  mv: -1 | 0 | 1; // -1: The odd's value is lower than the previous value. 0: The odd's value is the same as the previous value. 1: The odd's value is greater than the previous value.
  ml?: boolean; // Indicates whether this odd is part of the main line of the market. In case there is no value the field will be null or missing.
};

export type Market = {
  slug?: string;
  marketId: string;
  name: string;
  providerName: string;
  status: string;
  properties: MarketProperties;
  odds: Odd[];
  isBettable?: number;
};

export type ScoreBoardValue = {
  description: string;
  h: number;
  g: number;
};

export type PenaltyPeriod = {
  score: {
    h: number;
    g: number;
  };
  penalties: {
    h: any[];
    g: any[];
  };
};

export type ScoreBoard =
  | SoccerScoreboard
  | BasketballScoreboard
  | TennisScoreboard
  | VolleyballScoreboard
  | TableTennisScoreboard
  | IceHockeyScoreboard
  | BadmintonScoreboard
  | FutsalScoreboard
  | WaterPoloScoreboard
  | BaseballScoreboard
  | SnookerScoreboard
  | BeachVolleyballScoreboard
  | CriketScoreboard
  | ArcheryScoreboard
  | LeagueOfLegendsScoreboard
  | Dota2Scoreboard
  | HandballScoreboard
  | ValorantScoreboard
  | CounterStrikeScoreboard
  | AmericanFootballScoreboard
  | FloorballScoreboard
  | FieldHockeyScoreboard
  | RugbyUnionScoreboard
  | ArcheryShootingScoreboard
  | PistolShootingScoreboard
  | AussieRulesScoreboard
  | RugbyLeagueScoreboard
  | BeachSoccerScoreboard
  | SquashScoreboard
  | BandyScoreboard
  | DartsScoreboard
  | NetballScoreboard
  | ShootingScoreboard
  | KingOfGloryScoreboard
  | MobileLegendsScoreboard
  | RainBowSixScoreboard
  | CrossFireScoreboard
  | HaloScoreboard
  | Overwatch2Scoreboard
  | Starcraft2Scoreboard
  | ArenaOfValorScoreboard;

export type SoccerScoreboard = {
  time: string;
  freeKicks: ScoreBoardValue;
  goalKicks: ScoreBoardValue;
  goals: ScoreBoardValue;
  corners: StatsValue;
  penalties: StatsValue;
  reds: StatsValue;
  yellows: StatsValue;
  throwIns: StatsValue;
  half: StatsValue;
  half2: StatsValue;
  half_extra_time: StatsValue;
  substitutions: StatsValue;
  offsides: StatsValue;
  shotsOffTarget: StatsValue;
  shotsOnTarget: StatsValue;
  fouls: StatsValue;
  penalty_period: PenaltyPeriod;
  state: string;
};

export type BasketballScoreboard = {
  time: string;
  half: StatsValue;
  q1: StatsValue;
  q2: StatsValue;
  q3: StatsValue;
  q4: StatsValue;
  total: StatsValue;
  overtime: StatsValue;
  possession: StatsValue;
  state: string;
};

export type TennisScoreboard = {
  points: ScoreBoardValue;
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  servis: ScoreBoardValue;
  serviceGames: ScoreBoardValue;
  state: string;
};

export type VolleyballScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  servis: ScoreBoardValue;
  sets: ScoreBoardValue;
  state: string;
};

export type TableTennisScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  s6: ScoreBoardValue;
  s7: ScoreBoardValue;
  servis: ScoreBoardValue;
  sets: ScoreBoardValue;
  state: string;
};

export type IceHockeyScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  penalties: ScoreBoardValue;
  over_time: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type BadmintonScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  sets: ScoreBoardValue;
  servis: ScoreBoardValue;
  state: string;
};

export type FutsalScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  total: ScoreBoardValue;
  corners: ScoreBoardValue;
  penalties: ScoreBoardValue;
  reds: ScoreBoardValue;
  extra_time: ScoreBoardValue;
  half: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type WaterPoloScoreboard = {
  q1: ScoreBoardValue;
  q2: ScoreBoardValue;
  q3: ScoreBoardValue;
  q4: ScoreBoardValue;
  half: ScoreBoardValue;
  total: ScoreBoardValue;
  over_time: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type BaseballScoreboard = {
  cur_inning: number;
  balls: number; // minium: 0, maximum: 4, default: -1, Number of balls in current at-bat
  strikes: number;
  outs: number;
  runs: ScoreBoardValue;
  hits: ScoreBoardValue;
  possession: ScoreBoardValue;
  i1: ScoreBoardValue;
  i2: ScoreBoardValue;
  i3: ScoreBoardValue;
  i4: ScoreBoardValue;
  i5: ScoreBoardValue;
  i6: ScoreBoardValue;
  i7: ScoreBoardValue;
  i8: ScoreBoardValue;
  i9: ScoreBoardValue;
  state: string;
};

export type SnookerScoreboard = {
  frames: ScoreBoardValue;
  points: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type BeachVolleyballScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  sets: ScoreBoardValue;
  servis: ScoreBoardValue;
  state: string;
};

export type CriketScoreboard = {
  cur_inning: number;
  over: number;
  delivery: number;
  i1: ScoreBoardValue;
  i2: ScoreBoardValue;
  runs: ScoreBoardValue;
  possession: ScoreBoardValue;
  state: string;
};

export type ArcheryScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  s6: ScoreBoardValue;
  s7: ScoreBoardValue;
  total: ScoreBoardValue;
  currentSet: number; // minimum: 1, maximum: 7, default: -1, the current set number (1-7), with a default of -1, indicates the absence of data
  possession: ScoreBoardValue;
  time: string;
};

export type LeagueOfLegendsScoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type Dota2Scoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  p4: ScoreBoardValue;
  p5: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type HandballScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  half: ScoreBoardValue;
  extra_time: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type ValorantScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  sets: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type CounterStrikeScoreboard = {
  m1: ScoreBoardValue;
  m2: ScoreBoardValue;
  m3: ScoreBoardValue;
  m4: ScoreBoardValue;
  m5: ScoreBoardValue;
  maps: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type AmericanFootballScoreboard = {
  half: ScoreBoardValue;
  q1: ScoreBoardValue;
  q2: ScoreBoardValue;
  q3: ScoreBoardValue;
  q4: ScoreBoardValue;
  total: ScoreBoardValue;
  over_time: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type FloorballScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  total: ScoreBoardValue;
  time: string;
};

export type FieldHockeyScoreboard = {
  half: ScoreBoardValue;
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  p4: ScoreBoardValue;
  total: ScoreBoardValue;
  over_time: ScoreBoardValue;
  time: string;
};

export type RugbyUnionScoreboard = {
  h1: ScoreBoardValue;
  h2: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type ArcheryShootingScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  s6: ScoreBoardValue;
  sets: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type PistolShootingScoreboard = {
  sets: ScoreBoardValue;
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
};

export type AussieRulesScoreboard = {
  time: string;
  half: ScoreBoardValue;
  q1: ScoreBoardValue;
  q2: ScoreBoardValue;
  q3: ScoreBoardValue;
  q4: ScoreBoardValue;
  total: ScoreBoardValue;
  behinds: ScoreBoardValue;
  scores: ScoreBoardValue;
  goal: ScoreBoardValue;
  extra_time: ScoreBoardValue;
};

export type RugbyLeagueScoreboard = {
  h1: ScoreBoardValue;
  h2: ScoreBoardValue;
  total: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type BeachSoccerScoreboard = {
  p1: ScoreBoardValue;
  p2: ScoreBoardValue;
  p3: ScoreBoardValue;
  goals: ScoreBoardValue;
  time: string;
};

export type SquashScoreboard = {
  s1: ScoreBoardValue;
  s2: ScoreBoardValue;
  s3: ScoreBoardValue;
  s4: ScoreBoardValue;
  s5: ScoreBoardValue;
  total: ScoreBoardValue;
  games: ScoreBoardValue;
  servis: ScoreBoardValue;
  time: string;
  state: string;
};

export type BandyScoreboard = {
  half1: ScoreBoardValue;
  half2: ScoreBoardValue;
  total: ScoreBoardValue;
  extra_time1: ScoreBoardValue;
  extra_time2: ScoreBoardValue;
  time: string;
  state: string;
};

export type DartsScoreboard = {
  time: string;
  leg: ScoreBoardValue;
  total180s: ScoreBoardValue;
  shots: ScoreBoardValue;
  maxCheckout: ScoreBoardValue;
  servis: ScoreBoardValue;
  state: string;
};

export type NetballScoreboard = {
  q1: ScoreBoardValue;
  q2: ScoreBoardValue;
  q3: ScoreBoardValue;
  q4: ScoreBoardValue;
  half: ScoreBoardValue;
  over_time: ScoreBoardValue;
  total: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
};

export type ShootingScoreboard = {
  total: ScoreBoardValue;
  sets: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  currentSet: number;
};

export type KingOfGloryScoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  g8: ScoreBoardValue;
  games: ScoreBoardValue;
  possession: ScoreBoardValue;
  time: string;
  state: string;
};

export type MobileLegendsScoreboard = {
  time: string;
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  games: ScoreBoardValue;
  state: string;
};

export type RainBowSixScoreboard = {
  time: string;
  m1: ScoreBoardValue;
  m2: ScoreBoardValue;
  m3: ScoreBoardValue;
  m4: ScoreBoardValue;
  m5: ScoreBoardValue;
  m6: ScoreBoardValue;
  m7: ScoreBoardValue;
  maps: ScoreBoardValue;
  state: string;
};

export type CrossFireScoreboard = {
  time: string;
  m1: ScoreBoardValue;
  m2: ScoreBoardValue;
  m3: ScoreBoardValue;
  m4: ScoreBoardValue;
  m5: ScoreBoardValue;
  maps: ScoreBoardValue;
  state: string;
};

export type HaloScoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type Overwatch2Scoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type Starcraft2Scoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  g8: ScoreBoardValue;
  g9: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type ArenaOfValorScoreboard = {
  g1: ScoreBoardValue;
  g2: ScoreBoardValue;
  g3: ScoreBoardValue;
  g4: ScoreBoardValue;
  g5: ScoreBoardValue;
  g6: ScoreBoardValue;
  g7: ScoreBoardValue;
  games: ScoreBoardValue;
  time: string;
  possession: ScoreBoardValue;
  state: string;
};

export type TimelineEvent = {
  id: number;
  type: string;
  description: string;
  source: string;
};

export type JerseyColors = {
  h: string;
  g: string;
};

export type Clock = {
  clock_status: string;
  clock_direction: string;
  clock_seconds: number;
  clock_tm: number;
};

export type StatsValue = {
  h: number;
  g: number;
};

export type LiveStats = any;
// export type LiveStats = SoccerStats;
export type SoccerStats = {
  description: string;
  attacks: ScoreBoardValue;
  dangerousAttacks: ScoreBoardValue;
  goals: ScoreBoardValue;
  possession: ScoreBoardValue;
  penalties: ScoreBoardValue;
  corners: ScoreBoardValue;
  yellowCards: ScoreBoardValue;
  redCards: ScoreBoardValue;
  totalShots: ScoreBoardValue;
  shotsOnTarget: ScoreBoardValue;
  shotsOffTarget: ScoreBoardValue;
  throwIns: ScoreBoardValue;
  freeKicks: ScoreBoardValue;
  goalKicks: ScoreBoardValue;
  substitutions: ScoreBoardValue;
  actionArea: ScoreBoardValue;
  expectedGoals: ScoreBoardValue;
  passes: ScoreBoardValue;
  goalkeeperSaves: ScoreBoardValue;
  passingAccuracy: ScoreBoardValue;
  crosses: ScoreBoardValue;
  offsides: ScoreBoardValue;
  ballSafe: ScoreBoardValue;
  shotsBlocked: ScoreBoardValue;
  injuryBreaks: ScoreBoardValue;
  missedPenalties: ScoreBoardValue;
  kickoffs: ScoreBoardValue;
  players: any;
  lineups: any;
};

export type BasketballStats = {
  description: string;
  fouls: ScoreBoardValue;
  freeThrows: ScoreBoardValue;
  freeThrowsScoredPerc: ScoreBoardValue;
  twoPointers: ScoreBoardValue;
  threePointers: ScoreBoardValue;
  timeoutsTaken: ScoreBoardValue;
  timeoutsRemaining: ScoreBoardValue;
  jumpBalls: ScoreBoardValue;
  assists: ScoreBoardValue;
  offensiveRebounds: ScoreBoardValue;
  defensiveRebounds: ScoreBoardValue;
  totalRebounds: ScoreBoardValue;
  turnovers: ScoreBoardValue;
  steals: ScoreBoardValue;
  blocks: ScoreBoardValue;
  playersDisqualified: ScoreBoardValue;
  players: any;
};

export type TennisStats = {
  serviceFaults: ScoreBoardValue;
  doubleFaults: ScoreBoardValue;
  aces: ScoreBoardValue;
  breakPoints: ScoreBoardValue;
  breakPointsConversion: ScoreBoardValue;
  winFirstservePerc: ScoreBoardValue;
  winSecondServePerc: ScoreBoardValue;
  pointsOnOwnServe: ScoreBoardValue;
  totalPointsWon: ScoreBoardValue;
};

export type VolleyballStats = {
  longestStreak: ScoreBoardValue;
  pointsWonOnOwnServe: ScoreBoardValue;
  pointsWonOnOpponentServe: ScoreBoardValue;
  aces: ScoreBoardValue;
  serviceErrors: ScoreBoardValue;
};

export type CricketStats = {
  description: string;
  currentInning: number;
  currentOver: any;
  innings: any;
  players: any;
};

// export type AmericanFootballStats = {
//   description: string;
//   rushYards: ScoreBoardValue;

// }

export type LiveStatus = {
  info: string;
  time: number;
};

export type Live = {
  scoreBoard: ScoreBoard;
  stats: LiveStats;
  timeline: TimelineEvent[];
  jerseyColors: JerseyColors;
  status: LiveStatus;
  clock: Clock;
  incidents: any | null;
  // virtualCourt: boolean;
  // virtualCourtId: number;
};

export type Incident = {
  description: string;
  whistle: string;
  whistleId: number;
  par: 1 | 2 | null; // 1 Home Participant, 2 Away Participant - null
  player: string;
  ballPos: BallPos;
  info: string;
  type: string;
};

export type BallPos = {
  description: string;
  X: number;
  Y: number;
};

export type MessageHeader = {
  type: MessageType;
  stm: number; // server timestamp
};

export type MessageBody = {
  fixture: Fixture;
  markets: Market[];
  live?: Live;
};

export type MessagePayload = {
  header: MessageHeader;
  body: MessageBody | any;
};

export type Message = {
  routingKey: string;
  exchange: string;
  payload: MessagePayload;
};

export type MessageWrapper = {
  timestamp: string;
  timestampMs: number;
  message: Message;
};
