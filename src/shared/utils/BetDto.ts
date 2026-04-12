export interface PlaceBetDto {
  priceChange?: number;
  betType: number;
  freeBetType: number;
  alternativeOddsId: string | null;
  alternativePrice: number | null;
  betAmount: BetAmount;
  betItems: BetItem[];
}

export interface BetAmount {
  currency: string;
  value: number;
  precision: number;
}


export interface BetItem {
  eventId: number;
  marketId: number;
  selectionId: number;
  racingSelection?: number;
  price: number;
}

export interface BetPlayer {
  deviceId: string;
  languageId: string;
  ip: string;
  segmentId: number;
}

export interface Odds88BetRequestDto {
  id: string;
  player: BetPlayer;
  priceChange: number;
  items: BetItem[];
  alternativeOddsId: string | null;
  betType: number;
  freeBetType: number;
  amount: BetAmount;
}
