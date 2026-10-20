import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "My profile | Upwardia",
  description: "A fictional demonstration profile. It is not stored in this browser.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
