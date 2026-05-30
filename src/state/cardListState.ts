import { signal } from "@preact/signals";
import {
  cardListTemp,
  type tCard,
} from "@/app/components/CardListSection/tCard";

export const cardListState = signal<tCard[]>(cardListTemp);
