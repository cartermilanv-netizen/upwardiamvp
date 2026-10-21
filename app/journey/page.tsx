import type { Metadata } from "next";
import { JourneyHome } from "@/components/journey/home-view";

export const metadata: Metadata = {
  title: "My Journey | Upwardia",
  description: "A demonstration path for Avery Example, with goals, today's steps, and a fictional reward pilot.",
};

export default function JourneyPage() {
  return <JourneyHome />;
}
