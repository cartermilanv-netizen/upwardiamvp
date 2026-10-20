import type { Metadata } from "next";
import { AssessmentApp } from "@/components/assessment-app";

export const metadata: Metadata = {
  title: "Household assessment | Upwardia",
  description: "A private, on-device household assessment.",
};

export default function AssessmentPage() {
  return <AssessmentApp />;
}
