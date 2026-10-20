import type { Metadata } from "next";
import { PlanView } from "@/components/plan-view";

export const metadata: Metadata = {
  title: "My plan | Upwardia",
  description: "Personalized next steps from the household assessment on this device.",
};

export default function PlanPage() {
  return <PlanView />;
}
