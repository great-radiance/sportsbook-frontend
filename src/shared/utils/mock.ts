import { NormalizedEvent } from "./EventsUtils";

export interface Sport {
  id: number;
  name: string;
  icon: string;
}
export interface SportData {
  id: number | null; // null for "All"
  name: string;
  icon: string;
}
export interface LeagueData {
  id: string;
  name: string;
  country: string;
  flagIcon?: string;
  events: NormalizedEvent[];
}

export interface SportGroupData {
  sport: SportData;
  leagues: LeagueData[];
}

export interface SportGroup {
  sport: SportData;
  leagues: LeagueData[];
}

export interface CompetitionData {
  id: string;
  name: string;
  count: number;
}



export interface RegionData {
  id: string;
  name: string;
  flagIcon?: string;
  competitions: CompetitionData[];
  count: number;
}

export interface SportSidebarData {
  sportId: number;
  regions: RegionData[];
  totalCount: number;
}

export const SidebarItems: SportData[] = [
  { id: null, name: 'All', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/all_sports.svg' }, // "All" option - you may need to create this icon
  { id: 1, name: 'Soccer', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/football.svg' },
  { id: 8, name: 'Basketball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/basketball.svg' },
  { id: 4, name: 'Tennis', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/tennis.svg' },
  { id: 11, name: 'Volleyball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/volley.svg' },
  { id: 2, name: 'Table Tennis', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/table_tennis.svg' },
  { id: 6, name: 'Ice Hockey', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/ice_hockey.svg' },
  { id: 14, name: 'American Football', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/american_football.svg' },
  { id: 20, name: 'Cricket', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/cricket.svg' },
  { id: 37, name: 'Counter Strike', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/counter_strike.svg' },
  { id: 18, name: 'Darts', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/darts.svg' },
  { id: 25, name: 'Boxing', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/boxing.svg' },
  { id: 45, name: 'DOTA 2', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/dota.svg' },
];

export const SportsInfo : SportData[] = [
  { id: 1, name: 'Soccer', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/football.svg' },
  { id: 2, name: 'Table Tennis', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/table_tennis.svg' },
  { id: 4, name: 'Tennis', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/tennis.svg' },
  { id: 5, name: 'Handball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/handball.svg' },
  { id: 6, name: 'Ice Hockey', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/ice_hockey.svg' },
  { id: 7, name: 'Baseball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/baseball.svg' },
  { id: 8, name: 'Basketball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/basketball.svg' },
  { id: 9, name: 'Formula 1', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/formula_1.svg' },
  { id: 11, name: 'Volleyball', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/volley.svg' },
  { id: 14, name: 'American Football', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/american_football.svg' },
  { id: 16, name: 'Golf', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/golf.svg' },
  { id: 17, name: 'MMA', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/mma.svg' },
  { id: 18, name: 'Darts', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/darts.svg' },
  { id: 20, name: 'Cricket', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/cricket.svg' },
  { id: 21, name: 'Futsal', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/futsal.svg' },
  { id: 25, name: 'Boxing', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/boxing.svg' },
  { id: 30, name: 'League of Legends', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/league_of_legends.svg' },
  { id: 45, name: 'DOTA 2', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/dota.svg' },
  { id: 31, name: 'Biathlon', icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/biathlon.svg' },
];






// export const SportsNavItems = [
//   {
//     id: 1,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/football.svg',
//     label: 'Soccer',
//     href: '/competitions/1/Competitions'
//   },
//   {
//     id: 2,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/basketball.svg',
//     label: 'Basketball',
//     href: '/competitions/2/Competitions'
//   },
//   {
//     id: 3,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/tennis.svg',
//     label: 'Tennis',
//     href: '/competitions/3/Competitions'
//   },
//   {
//     id: 4,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/volley.svg',
//     label: 'Volleyball',
//     href: '/competitions/4/Competitions'
//   },
//   {
//     id: 5,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/american_football.svg',
//     label: 'American Football',
//     href: '/competitions/5/Competitions'
//   },
//   {
//     id: 6,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/baseball.svg',
//     label: 'Baseball',
//     href: '/competitions/6/Competitions'
//   },
//   {
//     id: 7,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/table_tennis.svg',
//     label: 'Table Tennis',
//     href: '/competitions/7/Competitions'
//   },
//   {
//     id: 8,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/formula_1.svg',
//     label: 'Formula 1',
//     href: '/competitions/8/Competitions'
//   },
//   {
//     id: 9,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/league_of_legends.svg',
//     label: 'League of Legends',
//     href: '/competitions/9/Competitions'
//   },
//   {
//     id: 10,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/counter_strike.svg',
//     label: "Counter Strike",
//     href: '/competitions/10/Competitions'
//   },
//   {
//     id: 11,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/dota.svg',
//     label: "Dota 2",
//     href: '/competitions/11/Competitions'
//   },
//   {
//     id: 12,
//       icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/ice_hockey.svg',
//     label: "Ice Hockey",
//     href: '/competitions/12/Competitions'
//   },
//   {
//     id: 13,
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/handball.svg',
//     label: "Handball",
//     href: '/competitions/13/Competitions'
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/futsal.svg',
//     label: "Futsal",
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/mma.svg',
//     label: "MMA",
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/boxing.svg',
//     label: "Boxing",
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/water_polo.svg',
//     label: "Water Polo",
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/cricket.svg',
//     label: "Cricket",
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/darts.svg',
//     label: "Darts",
//     href: '/'
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/badminton.svg',
//     label: 'Badminton',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/cycling.svg',
//     label: 'Cycling',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/horse_race.svg',
//     label: 'Horse Racing',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/golf.svg',
//     label: 'Golf',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/gaelic_football.svg',
//     label: 'Gaelic Football',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/gaelic_hurling.svg',
//     label: 'Gaelic Hurling',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/politics.svg',
//     label: 'POlitics',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/olympic_games.svg',
//     label: 'Winter Olympic Games',
//     href: '/ '
//   },
//   {
//     icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/entertainment.svg',
//     label: 'Entertainment',
//     href: '/ '
//   },
// ];

export const VirtualsItems = [
  {
    icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/football_virtual.svg',
    label: 'Football League',
    href: '/'
  },
  {
    icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/basketball_virtual.svg',
    label: 'Basketball League',
    href: '/'
  },
  {
    icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/tennis_virtual.svg',
    label: 'Tennis',
    href: '/ '
  },
  {
    icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/horse_race_virtual.svg',
    label: 'Horse Racing',
    href: '/ '
  },
  {
    icon: 'https://tekio.s3.eu-north-1.amazonaws.com/sportsbook/icons/vector_virtual.svg',
    label: 'Virtual Games',
    href: '/ '
  },
]

// Static sidebar data for sports -> regions -> competitions
export const SidebarSportsData: Map<number, RegionData[]> = new Map([
  [
    1, // Soccer/Football
    [
      {
        id: 'turkiye',
        name: 'Turkiye',
        flagIcon: 'https://flagcdn.com/w40/tr.png',
        count: 12,
        competitions: [
          { id: 'super-lig', name: 'Super Lig', count: 8 },
          { id: '1-lig', name: '1. Lig', count: 4 },
        ],
      },
      {
        id: 'world',
        name: 'World',
        flagIcon: 'https://flagcdn.com/w40/un.png',
        count: 51,
        competitions: [
          { id: 'world-cup', name: 'World Cup', count: 25 },
          { id: 'champions-league', name: 'Champions League', count: 26 },
        ],
      },
      {
        id: 'europe',
        name: 'Europe',
        flagIcon: 'https://flagcdn.com/w40/eu.png',
        count: 40,
        competitions: [
          { id: 'euro', name: 'European Championship', count: 20 },
          { id: 'europa-league', name: 'Europa League', count: 20 },
        ],
      },
      {
        id: 'south-america',
        name: 'South America',
        flagIcon: 'https://flagcdn.com/w40/co.png',
        count: 23,
        competitions: [
          { id: 'copa-america', name: 'Copa America', count: 12 },
          { id: 'libertadores', name: 'Copa Libertadores', count: 11 },
        ],
      },
      {
        id: 'england',
        name: 'England',
        flagIcon: 'https://flagcdn.com/w40/gb-eng.png',
        count: 151,
        competitions: [
          { id: 'premier-league', name: 'Premier League', count: 38 },
          { id: 'championship', name: 'Championship', count: 46 },
          { id: 'fa-cup', name: 'FA Cup', count: 32 },
          { id: 'league-one', name: 'League One', count: 35 },
        ],
      },
      {
        id: 'spain',
        name: 'Spain',
        flagIcon: 'https://flagcdn.com/w40/es.png',
        count: 125,
        competitions: [
          { id: 'la-liga', name: 'La Liga', count: 13 },
          { id: 'copa-del-rey', name: 'Copa Del Rey', count: 1 },
          { id: 'supercopa', name: 'Supercopa', count: 2 },
          { id: 'segunda-division', name: 'Segunda Division', count: 12 },
          { id: 'segunda-federacion', name: 'Segunda Federacion', count: 22 },
          { id: 'tercera-federacion', name: 'Tercera Federacion', count: 62 },
          { id: 'division-honor-juvenil', name: 'Division De Honor Juvenil', count: 4 },
          { id: 'la-liga-outright', name: 'La Liga. Outright', count: 1 },
        ],
      },
    ],
  ],
  [
    8, // Basketball
    [
      {
        id: 'usa',
        name: 'USA',
        flagIcon: 'https://flagcdn.com/w40/us.png',
        count: 85,
        competitions: [
          { id: 'nba', name: 'NBA', count: 45 },
          { id: 'ncaa', name: 'NCAA', count: 40 },
        ],
      },
      {
        id: 'spain',
        name: 'Spain',
        flagIcon: 'https://flagcdn.com/w40/es.png',
        count: 32,
        competitions: [
          { id: 'acb', name: 'ACB Liga', count: 18 },
          { id: 'euroleague', name: 'Euroleague', count: 14 },
        ],
      },
      {
        id: 'europe',
        name: 'Europe',
        flagIcon: 'https://flagcdn.com/w40/eu.png',
        count: 28,
        competitions: [
          { id: 'eurocup', name: 'Eurocup', count: 15 },
          { id: 'fibacl', name: 'FIBA Champions League', count: 13 },
        ],
      },
    ],
  ],
  [
    4, // Tennis
    [
      {
        id: 'world',
        name: 'World',
        flagIcon: 'https://flagcdn.com/w40/un.png',
        count: 67,
        competitions: [
          { id: 'atp', name: 'ATP Tour', count: 35 },
          { id: 'wta', name: 'WTA Tour', count: 32 },
        ],
      },
      {
        id: 'grand-slams',
        name: 'Grand Slams',
        flagIcon: 'https://flagcdn.com/w40/un.png',
        count: 24,
        competitions: [
          { id: 'wimbledon', name: 'Wimbledon', count: 6 },
          { id: 'us-open', name: 'US Open', count: 6 },
          { id: 'french-open', name: 'French Open', count: 6 },
          { id: 'australian-open', name: 'Australian Open', count: 6 },
        ],
      },
    ],
  ],
  [
    11, // Volleyball
    [
      {
        id: 'world',
        name: 'World',
        flagIcon: 'https://flagcdn.com/w40/un.png',
        count: 42,
        competitions: [
          { id: 'world-championship', name: 'World Championship', count: 22 },
          { id: 'world-league', name: 'World League', count: 20 },
        ],
      },
      {
        id: 'europe',
        name: 'Europe',
        flagIcon: 'https://flagcdn.com/w40/eu.png',
        count: 28,
        competitions: [
          { id: 'cev', name: 'CEV Champions League', count: 15 },
          { id: 'euro-volley', name: 'European Championship', count: 13 },
        ],
      },
    ],
  ],
  [
    2, // Table Tennis
    [
      {
        id: 'world',
        name: 'World',
        flagIcon: 'https://flagcdn.com/w40/un.png',
        count: 35,
        competitions: [
          { id: 'ittf', name: 'ITTF World Tour', count: 20 },
          { id: 'world-championship', name: 'World Championship', count: 15 },
        ],
      },
      {
        id: 'china',
        name: 'China',
        flagIcon: 'https://flagcdn.com/w40/cn.png',
        count: 18,
        competitions: [
          { id: 'chinese-super-league', name: 'Chinese Super League', count: 18 },
        ],
      },
    ],
  ],
  [
    6, // Ice Hockey
    [
      {
        id: 'usa',
        name: 'USA',
        flagIcon: 'https://flagcdn.com/w40/us.png',
        count: 52,
        competitions: [
          { id: 'nhl', name: 'NHL', count: 32 },
          { id: 'ahl', name: 'AHL', count: 20 },
        ],
      },
      {
        id: 'europe',
        name: 'Europe',
        flagIcon: 'https://flagcdn.com/w40/eu.png',
        count: 38,
        competitions: [
          { id: 'khl', name: 'KHL', count: 20 },
          { id: 'shl', name: 'SHL', count: 18 },
        ],
      },
    ],
  ],
]);

// export const SidebarItems = [
//   // {
//   //   label: 'Sports',
//   //   items: SportsItems
//   // },
//   // {
//   //   label: 'Virtuals',
//   //   items: VirtualsItems
//   // },
//   { icon: '⚽', label: 'Sports', href: '/sports' },
//   { icon: '🎰', label: 'Casino', href: '/casino' },
//   { icon: '🎲', label: 'Live Casino', href: '/live-casino' },
//   { icon: '🎮', label: 'Games', href: '/games' },
//   { icon: '💰', label: 'Promotions', href: '/promotions' },
// ]

// Popular Competitions static data
export const PopularCompetitionsData: any[] = [
  { id: 'premier-league', name: 'Premier League', sportId: 1, sportName: 'Soccer', count: 38, region: 'England' },
  { id: 'la-liga', name: 'La Liga', sportId: 1, sportName: 'Soccer', count: 13, region: 'Spain' },
  { id: 'champions-league', name: 'Champions League', sportId: 1, sportName: 'Soccer', count: 26, region: 'Europe' },
  { id: 'bundesliga', name: 'Bundesliga', sportId: 1, sportName: 'Soccer', count: 34, region: 'Germany' },
  { id: 'serie-a', name: 'Serie A', sportId: 1, sportName: 'Soccer', count: 38, region: 'Italy' },
  { id: 'nba', name: 'NBA', sportId: 8, sportName: 'Basketball', count: 45, region: 'USA'  },
  { id: 'wimbledon', name: 'Wimbledon', sportId: 4, sportName: 'Tennis', count: 6, region: 'England' },
  { id: 'us-open', name: 'US Open', sportId: 4, sportName: 'Tennis', count: 6, region: 'International' },
  { id: 'nhl', name: 'NHL', sportId: 6, sportName: 'Ice Hockey', count: 32, region: 'USA' },
  { id: 'world-cup', name: 'World Cup', sportId: 1, sportName: 'Soccer', count: 25, region: 'International' },
];