import {
  Armchair,
  Car,
  HandCoins,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBasket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TransactionCategory } from "@/lib/types";

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  vente: "Vente",
  salaire: "Salaire",
  transport: "Transport",
  nourriture: "Nourriture",
  logement: "Logement",
  sante: "Santé",
  famille: "Famille",
  materiel: "Matériel",
  autre: "Autre",
};

export const CATEGORY_ICONS: Record<TransactionCategory, LucideIcon> = {
  vente: HandCoins,
  salaire: Wallet,
  transport: Car,
  nourriture: ShoppingBasket,
  logement: Home,
  sante: HeartPulse,
  famille: Users,
  materiel: Armchair,
  autre: Receipt,
};
