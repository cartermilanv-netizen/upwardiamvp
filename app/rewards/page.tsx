import type { Metadata } from "next";
import { RewardsView } from "@/components/journey/rewards-view";

export const metadata: Metadata = {
  title: "My Rewards | Upwardia",
  description: "A fictional reward pilot. Amounts are not real money and are not paid out.",
};

export default function RewardsPage() {
  return <RewardsView />;
}
