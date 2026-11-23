import type { ISODate } from "../types";

interface RewardsProgram {
  issuerUrl: string;
  benefits: { title: string; detail: string }[];
}

type CardRewards = RewardsProgram & (
  | {
      kind: "points";
      earnedLastStatement: number;
      expiry: { points: number; date: ISODate };
      quarter: { eligibleSpend: number; target: number; voucher: number; endsOn: ISODate };
    }
  | {
      kind: "cashback";
      lastCredit: { amount: number; date: ISODate };
      creditedThisFY: number;
    }
);

/** Sample rewards snapshots and public issuer terms for the demo cards. */
export const CARD_REWARDS: Record<string, CardRewards | undefined> = {
  "hdfc-cc": {
    kind: "points",
    issuerUrl: "https://www.hdfc.bank.in/credit-cards/regalia-gold-credit-card",
    earnedLastStatement: 1320,
    expiry: { points: 950, date: "2026-12-31" },
    quarter: { eligibleSpend: 84320, target: 150000, voucher: 1500, endsOn: "2026-12-31" },
    benefits: [
      { title: "Earning points", detail: "5 points per ₹200 on eligible retail purchases, with bonus points at select merchants." },
      { title: "SmartBuy redemption", detail: "₹0.50 per point for eligible flights and hotels, ₹0.65 in the Gold Catalogue, and up to ₹0.20 as statement credit." },
      { title: "Airport lounges", detail: "Domestic visits depend on prior-quarter spending. International visits use Priority Pass." },
      { title: "Renewal fee", detail: "₹2,500 plus taxes. Waived at ₹4 lakh of eligible annual spend." },
    ],
  },
  "icici-cc": {
    kind: "cashback",
    issuerUrl: "https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card",
    lastCredit: { amount: 428, date: "2026-11-03" },
    creditedThisFY: 3482,
    benefits: [
      { title: "Amazon.in purchases", detail: "Up to 5% cashback for Prime members and up to 3% for other members on eligible purchases." },
      { title: "Partner and other spends", detail: "2% with Login and Pay with Amazon at eligible partners. 1% on other eligible spends." },
      { title: "Annual fee", detail: "₹0 joining fee and ₹0 annual fee." },
    ],
  },
};
