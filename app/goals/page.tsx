import type { Metadata } from "next";
import { GoalsView } from "@/components/journey/goals-view";

export const metadata: Metadata = {
  title: "My Goals | Upwardia",
  description: "Priority goals and smaller tasks for the demonstration resident.",
};

export default function GoalsPage() {
  return <GoalsView />;
}
