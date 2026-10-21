import type { Metadata } from "next";
import { ActionsView } from "@/components/journey/actions-view";

export const metadata: Metadata = {
  title: "My Actions | Upwardia",
  description: "Steps on the demonstration journey. Completing a step is not a payment.",
};

export default function ActionsPage() {
  return <ActionsView />;
}
