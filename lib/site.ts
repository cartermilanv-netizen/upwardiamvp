import { resumeScreen } from "@/lib/flow";
import type { DraftAssessment } from "@/lib/types";

export const routes = {
  home: "/",
  assessment: "/assessment",
  resources: "/resources",
  plan: "/plan",
  about: "/#about",
  privacy: "/privacy",
  accessibility: "/accessibility",
  contact: "/contact",
} as const;

export const hero = {
  tagline: "Building Better Pathways to Upward Mobility",
  headline: "The resources you need. A clear path forward.",
  body: "Upwardia connects community members to resources and helps them navigate the steps needed to access support.",
  primaryLabel: "Find My Resources",
  primaryHref: routes.assessment,
  secondaryLabel: "Explore Resources",
  secondaryHref: routes.resources,
} as const;

export const howItWorks = [
  { title: "Tell Us About Yourself", body: "Answer a short household assessment. You can skip any question." },
  { title: "Discover Resources", body: "Browse categories, or see what might fit from a verified catalog." },
  { title: "Create Your Plan", body: "A plan lists next steps from your answers. It does not guess programs." },
  { title: "Take Action", body: "Work through a few small steps. Your progress stays on this device." },
] as const;

export const desktopNav = [
  { href: routes.home, label: "Home" },
  { href: routes.resources, label: "Find Resources" },
  { href: routes.assessment, label: "My Assessment" },
  { href: routes.plan, label: "My Plan" },
  { href: routes.about, label: "About" },
] as const;

export const mobileNav = [
  { href: routes.home, label: "Home" },
  { href: routes.resources, label: "Resources" },
  { href: routes.assessment, label: "Assessment" },
  { href: routes.plan, label: "My Plan" },
] as const;

/** Links that belong in the mobile menu because the bottom bar does not already show them. */
export function mobileMenuLinks() {
  const bottom = new Set<string>(mobileNav.map((item) => item.href));
  return desktopNav.filter((item) => !bottom.has(item.href));
}

export const footerLinks = [
  { href: routes.privacy, label: "Privacy", note: "Not finished" },
  { href: routes.accessibility, label: "Accessibility", note: "Not finished" },
  { href: routes.contact, label: "Contact", note: "Not finished" },
] as const;

export type AssessmentPresence = "none" | "in_progress" | "ready";

export function assessmentPresence(draft: DraftAssessment | null): AssessmentPresence {
  if (!draft) return "none";
  return resumeScreen(draft) === "review" ? "ready" : "in_progress";
}

export function prominentCta(presence: AssessmentPresence): { href: string; label: string } | null {
  if (presence === "ready") return null;
  if (presence === "in_progress") return { href: routes.assessment, label: "Continue My Assessment" };
  return { href: routes.assessment, label: "Get Started" };
}
