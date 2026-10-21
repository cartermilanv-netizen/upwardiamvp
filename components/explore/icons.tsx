import {
  Accessibility,
  Baby,
  Banknote,
  BookOpen,
  Brain,
  Briefcase,
  Bus,
  FileText,
  GraduationCap,
  Hammer,
  HandCoins,
  HeartPulse,
  House,
  KeyRound,
  Landmark,
  Laptop,
  LifeBuoy,
  Pill,
  Receipt,
  ShieldPlus,
  ShoppingBasket,
  Smile,
  Stethoscope,
  Tent,
  Ticket,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ResourceCategoryId, ResourceNeedId } from "@/lib/resources";

const categoryIcons: Record<ResourceCategoryId, LucideIcon> = {
  "health-wellness": HeartPulse,
  "financial-assistance": Wallet,
  "housing-food": House,
  "education-employment": GraduationCap,
  transportation: Bus,
  "digital-access": Laptop,
};

const needIcons: Record<ResourceNeedId, LucideIcon> = {
  "health-insurance": ShieldPlus,
  "primary-care-doctor": Stethoscope,
  "mental-health": Brain,
  "dental-care": Smile,
  "pregnancy-family-health": Baby,
  prescriptions: Pill,
  "cash-assistance": Banknote,
  "help-paying-bills": Receipt,
  "debt-financial-counseling": HandCoins,
  "tax-assistance": Landmark,
  "emergency-financial-support": LifeBuoy,
  "food-groceries": ShoppingBasket,
  "rent-assistance": KeyRound,
  "affordable-housing": House,
  "homelessness-prevention": HeartPulse,
  "emergency-shelter": Tent,
  utilities: Zap,
  "job-opportunities": Briefcase,
  "job-training": Hammer,
  "adult-education": BookOpen,
  "college-support": GraduationCap,
  "childcare-assistance": Baby,
  "discounted-public-transit": Ticket,
  "transportation-to-healthcare": Bus,
  "senior-disability-transportation": Accessibility,
  "affordable-home-internet": Wifi,
  "free-public-wifi": Wifi,
  "computers-devices": Laptop,
  "help-online-forms": FileText,
};

export function CategoryIcon({ id, className }: { id: ResourceCategoryId; className?: string }) {
  const Icon = categoryIcons[id];
  return <Icon aria-hidden className={className} />;
}

export function NeedIcon({ id, className }: { id: ResourceNeedId; className?: string }) {
  const Icon = needIcons[id];
  return <Icon aria-hidden className={className} />;
}
