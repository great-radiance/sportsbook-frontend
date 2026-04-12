import { BASE_ASSET_PUBLIC_URL } from "@/shared/config/appConfig";

export interface Sport {
    id: number;
    name: string;
    icon?: string;
}

export const sidebarItemsCybet: Sport[] = [
    { id: 0, name: 'All', icon: `${BASE_ASSET_PUBLIC_URL}/icons/all-sports.png` }, // "All" option - you may need to create this icon
    { id: 1, name: "Soccer", icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Soccer.png` },
    { id: 2, name: 'Basketball', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Basketball.png` },
    { id: 3, name: 'Tennis', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Tennis.png` },
    { id: 4, name: 'Volleyball', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Volleyball.png` },
    { id: 6, name: 'Table Tennis', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Table Tennis.png` },
    { id: 5, name: 'Ice Hockey', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Ice Hockey.png` },
    { id: 9, name: 'Baseball', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Baseball.png` },
    { id: 7, name: 'Handball', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Handball.png` },
    { id: 8, name: 'Badminton', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Badminton.png` },
    { id: 12, name: 'American Football', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/American Football.png` },
    { id: 35, name: 'Aussie Rules', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Aussie Rules.png` },
    { id: 45, name: 'Bandy', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Bandy.png` },
    { id: 48, name: 'Biathlon', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Biathlon.png` },
    { id: 14, name: 'Boxing', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Boxing.png` },
    { id: 24, name: 'Dota 2', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Dota 2.png` },
    { id: 23, name: 'League Of Legends', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/League of legends.png` },
    { id: 21, name: 'Counter Strike', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Counter-Strike 2.png` },
    { id: 65, name: 'Call Of Duty', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Call of Duty.png` },
    { id: 38, name: 'Chess', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Chess.png` },
    { id: 19, name: 'Cricket', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Cricket.png` },
    { id: 42, name: 'Cycling', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Cycling.png` },
    { id: 17, name: 'Darts', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Darts.png` },
    { id: 26, name: 'Floorball', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Floorball.png` },
    { id: 34, name: 'Formula 1', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Formula 1.png` },
    { id: 10, name: 'Futsal', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Futsal.png` },
    { id: 36, name: 'Golf', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Golf.png` },
    { id: 15, name: 'Mma', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/MMA.png` },
    { id: 37, name: 'Rugby League', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Rugby League.png` },
    { id: 27, name: 'Rugby Union', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Rugby Union.png` },
    { id: 16, name: 'Snooker', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Snooker.png` },
    { id: 13, name: 'Water Polo', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Water Polo.png` },
    { id: 50, name: 'Politics', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Politics.png` },
    { id: 111, name: 'Alpine Skiing', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Alpine Skiing.png` },
    { id: 46, name: 'Lacrosse', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Lacrosse.png` },
    { id: 102, name: 'Olympic Games', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Olympics.png` },
    { id: 51, name: 'Entertainment', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/TV Shows and Movies.png` },
    { id: 22, name: 'Valorant', icon: `${BASE_ASSET_PUBLIC_URL}/sportsicons/Valorant.png` },
];

export const sports: Sport[] = [
    {
        "id": 1,
        "name": "Soccer",
        "icon": "/sportsicons/football.png"
    },
    {
        "id": 2,
        "name": "Basketball",
        "icon": "/sportsicons/basketball.png"
    },
    {
        "id": 3,
        "name": "Tennis",
        "icon": "/sportsicons/tennis.png"
    },
    {
        "id": 4,
        "name": "Volleyball",
        "icon": "/sportsicons/Volleyball.png"
    },
    {
        "id": 5,
        "name": "Ice Hockey",
        "icon": "/sportsicons/Ice Hockey.png"
    },
    {
        "id": 6,
        "name": "Table Tennis",
        "icon": "/sportsicons/Table Tennis.png"
    },
    {
        "id": 7,
        "name": "Handball",
        "icon": "/sportsicons/Handball.png"
    },
    {
        "id": 8,
        "name": "Badminton",
        "icon": "/sportsicons/Badminton.png"
    },
    {
        "id": 9,
        "name": "Baseball",
        "icon": "/sportsicons/Baseball.png"
    },
    {
        "id": 10,
        "name": "Futsal",
        "icon": "/sportsicons/Futsal.png"
    },
    {
        "id": 11,
        "name": "Beach Volleyball",
        "icon": "/sportsicons/Volleyball.png"
    },
    {
        "id": 12,
        "name": "American Football",
        "icon": "/sportsicons/American Football.png"
    },
    {
        "id": 13,
        "name": "Water Polo",
        "icon": "/sportsicons/Water Polo.png"
    },
    {
        "id": 14,
        "name": "Boxing",
        "icon": "/sportsicons/Boxing.png"
    },
    {
        "id": 15,
        "name": "Mma",
        "icon": "/sportsicons/MMA.png"
    },
    {
        "id": 16,
        "name": "Snooker",
        "icon": "/sportsicons/Snooker.png"
    },
    {
        "id": 17,
        "name": "Darts",
        "icon": "/sportsicons/Darts.png"
    },
    {
        "id": 18,
        "name": "Field Hockey",
        "icon": "/sportsicons/Field hockey.png"
    },
    {
        "id": 19,
        "name": "Cricket",
        "icon": "/sportsicons/Cricket.png"
    },
    {
        "id": 20,
        "name": "Archery"
    },
    {
        "id": 21,
        "name": "Counter Strike",
        "icon": "/sportsicons/Counter-Strike 2.png"
    },
    {
        "id": 22,
        "name": "Valorant",
        "icon": "/sportsicons/Valorant.png"
    },
    {
        "id": 23,
        "name": "League Of Legends",
        "icon": "/sportsicons/League of legends.png"
    },
    {
        "id": 24,
        "name": "Dota 2",
        "icon": "/sportsicons/Dota 2.png"
    },
    {
        "id": 25,
        "name": "King Of Glory"
    },
    {
        "id": 26,
        "name": "Floorball",
        "icon": "/sportsicons/Floorball.png"
    },
    {
        "id": 27,
        "name": "Rugby Union",
        "icon": "/sportsicons/Rugby Union.png"
    },
    {
        "id": 28,
        "name": "Archery Shooting"
    },
    {
        "id": 29,
        "name": "Pistol Shooting"
    },
    {
        "id": 30,
        "name": "Bowls"
    },
    {
        "id": 31,
        "name": "Horse Racing"
    },
    {
        "id": 32,
        "name": "Greyhounds"
    },
    {
        "id": 33,
        "name": "Trotting"
    },
    {
        "id": 34,
        "name": "Formula 1",
        "icon": "/sportsicons/Formula 1.png"
    },
    {
        "id": 35,
        "name": "Aussie Rules",
        "icon": "/sportsicons/Aussie Rules.png"
    },
    {
        "id": 36,
        "name": "Golf",
        "icon": "/sportsicons/Golf.png"
    },
    {
        "id": 37,
        "name": "Rugby League",
        "icon": "/sportsicons/Rugby League.png"
    },
    {
        "id": 38,
        "name": "Chess",
        "icon": "/sportsicons/Chess.png"
    },
    {
        "id": 39,
        "name": "Beach Soccer"
    },
    {
        "id": 40,
        "name": "Netball"
    },
    {
        "id": 41,
        "name": "Squash"
    },
    {
        "id": 42,
        "name": "Cycling",
        "icon": "/sportsicons/Cycling.png"
    },
    {
        "id": 43,
        "name": "Gaelic Football"
    },
    {
        "id": 44,
        "name": "Shooting"
    },
    {
        "id": 45,
        "name": "Bandy",
        "icon": "/sportsicons/Bandy.png"
    },
    {
        "id": 46,
        "name": "Lacrosse",
        "icon": "/sportsicons/Lacrosse.png"
    },
    {
        "id": 47,
        "name": "Kabaddi"
    },
    {
        "id": 48,
        "name": "Biathlon",
        "icon": "/sportsicons/Biathlon.png"
    },
    {
        "id": 49,
        "name": "Gaelic Hurling"
    },
    {
        "id": 50,
        "name": "Politics",
        "icon": "/sportsicons/Politics.png"
    },
    {
        "id": 51,
        "name": "Entertainment",
        "icon": "/sportsicons/TV Shows and Movies.png"
    },
    {
        "id": 52,
        "name": "Overwatch 2"
    },
    {
        "id": 53,
        "name": "StarCraft"
    },
    {
        "id": 54,
        "name": "Warcraft 3"
    },
    {
        "id": 55,
        "name": "Mobile Legends"
    },
    {
        "id": 56,
        "name": "Apex Legends"
    },
    {
        "id": 57,
        "name": "Rainbow Six"
    },
    {
        "id": 58,
        "name": "CrossFire"
    },
    {
        "id": 59,
        "name": "Rocket League"
    },
    {
        "id": 60,
        "name": "Arena Of Valor"
    },
    {
        "id": 63,
        "name": "StarCraft 2"
    },
    {
        "id": 64,
        "name": "Halo"
    },
    {
        "id": 65,
        "name": "Call Of Duty",
        "icon": "/sportsicons/Call of Duty.png"
    },
    {
        "id": 66,
        "name": "PUBG"
    },
    {
        "id": 67,
        "name": "World Of Warcraft"
    },
    {
        "id": 68,
        "name": "Age Of Empires"
    },
    {
        "id": 69,
        "name": "Brawl Stars"
    },
    {
        "id": 70,
        "name": "Wild Rift"
    },
    {
        "id": 71,
        "name": "Deadlock"
    },
    {
        "id": 72,
        "name": "GeoGuessr"
    },
    {
        "id": 73,
        "name": "PUBG Mobile"
    },
    {
        "id": 74,
        "name": "Free Fire"
    },
    {
        "id": 75,
        "name": "Call Of Duty Mobile"
    },
    {
        "id": 76,
        "name": "Hearthstone"
    },
    {
        "id": 77,
        "name": "Heroes Of The Storm"
    },
    {
        "id": 78,
        "name": "Super Smash Bros"
    },
    {
        "id": 79,
        "name": "Street Fighter"
    },
    {
        "id": 80,
        "name": "Clash Royale"
    },
    {
        "id": 81,
        "name": "Speedway"
    },
    {
        "id": 82,
        "name": "Fortnite"
    },
    {
        "id": 83,
        "name": "Motorbike"
    },
    {
        "id": 84,
        "name": "Motorsport"
    },
    {
        "id": 85,
        "name": "Gymnastics"
    },
    {
        "id": 86,
        "name": "Swimming"
    },
    {
        "id": 88,
        "name": "Winter Sports"
    },
    {
        "id": 89,
        "name": "Beach Handball"
    },
    {
        "id": 91,
        "name": "Poker"
    },
    {
        "id": 92,
        "name": "Pesapallo"
    },
    {
        "id": 93,
        "name": "Diving"
    },
    {
        "id": 94,
        "name": "Rowing"
    },
    {
        "id": 95,
        "name": "Triathlon"
    },
    {
        "id": 96,
        "name": "Canoeing"
    },
    {
        "id": 97,
        "name": "Softball"
    },
    {
        "id": 98,
        "name": "Sailing"
    },
    {
        "id": 99,
        "name": "Equestrian"
    },
    {
        "id": 100,
        "name": "Rugby Sevens"
    },
    {
        "id": 101,
        "name": "Winter Olympics"
    },
    {
        "id": 102,
        "name": "Olympic Games",
        "icon": "/sportsicons/Olympics.png"
    },
    {
        "id": 103,
        "name": "Artistic Swimming"
    },
    {
        "id": 105,
        "name": "Skateboarding"
    },
    {
        "id": 106,
        "name": "Sport Climbing"
    },
    {
        "id": 107,
        "name": "Weightlifting"
    },
    {
        "id": 108,
        "name": "Sepak Takraw"
    },
    {
        "id": 109,
        "name": "Basque Pelota"
    },
    {
        "id": 111,
        "name": "Alpine Skiing",
        "icon": "/sportsicons/Alpine Skiing.png"
    },
    {
        "id": 112,
        "name": "Athletics"
    },
    {
        "id": 113,
        "name": "Bobsleigh"
    },
    {
        "id": 114,
        "name": "Bowling"
    },
    {
        "id": 115,
        "name": "Combat Sports"
    },
    {
        "id": 116,
        "name": "Cross-Country Skiing"
    },
    {
        "id": 117,
        "name": "Fencing"
    },
    {
        "id": 118,
        "name": "Financials"
    },
    {
        "id": 119,
        "name": "Fistball"
    },
    {
        "id": 120,
        "name": "Figure Skating"
    },
    {
        "id": 121,
        "name": "Freestyle Skiing"
    },
    {
        "id": 122,
        "name": "Indoor Football"
    },
    {
        "id": 123,
        "name": "Luge"
    },
    {
        "id": 124,
        "name": "Marvel Rivals"
    },
    {
        "id": 125,
        "name": "Modern Pentathlon"
    },
    {
        "id": 126,
        "name": "Nordic Combined"
    },
    {
        "id": 127,
        "name": "Nordic Ski"
    },
    {
        "id": 128,
        "name": "Padel"
    },
    {
        "id": 129,
        "name": "Petanque"
    },
    {
        "id": 130,
        "name": "Pool",
        "icon": "/sportsicons/Pool.png"
    },
    {
        "id": 131,
        "name": "Rink Hockey"
    },
    {
        "id": 132,
        "name": "Short Track Speed Skating"
    },
    {
        "id": 133,
        "name": "Show Jumping"
    },
    {
        "id": 134,
        "name": "Skeleton"
    },
    {
        "id": 135,
        "name": "Ski Jumping",
        "icon": "/sportsicons/Ski Jumping.png"
    },
    {
        "id": 136,
        "name": "Snowboarding"
    },
    {
        "id": 137,
        "name": "Speed Skating"
    },
    {
        "id": 138,
        "name": "Surfing"
    },
    {
        "id": 139,
        "name": "Table Football"
    },
    {
        "id": 140,
        "name": "Tekken"
    },
    {
        "id": 141,
        "name": "Wrestling"
    }
]