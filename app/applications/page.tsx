import type { Metadata } from "next";
import { ApplicationsDashboard } from "@/components/applications-dashboard";

export const metadata: Metadata = {
  title: "My applications | Upwardia",
  description: "Demonstration applications. These are not real government forms.",
};

export default function ApplicationsPage() {
  return <ApplicationsDashboard />;
}
