export type Answer<T> =
  | { status: "answered"; value: T }
  | { status: "skipped" }
  | { status: "not_sure" }
  | { status: "prefer_not_to_answer" }
  | { status: "not_applicable" };

export type EmploymentStatus =
  | "full_time"
  | "part_time"
  | "looking"
  | "not_working"
  | "self_employed";

export type IncomeRange =
  | "under_15k"
  | "15_to_29k"
  | "30_to_49k"
  | "50_to_74k"
  | "75k_or_more";

export type HousingSituation =
  | "rent"
  | "own"
  | "staying_with_someone"
  | "temporary"
  | "unhoused"
  | "other";

export type Hardship = "yes" | "sometimes" | "no";
export type FoodSecurity = "enough" | "sometimes_not_enough" | "often_not_enough";
export type FoodBarrier = "cost" | "transport" | "no_kitchen" | "benefits_stopped" | "other";
export type UtilityType = "electric" | "gas" | "water" | "phone" | "internet";
export type InsuranceStatus =
  | "employer_or_family"
  | "medi_cal"
  | "medicare"
  | "marketplace"
  | "other"
  | "none";
export type YesNo = "yes" | "no";
export type CareAccess = "yes" | "no" | "not_needed";
export type CareBarrier =
  | "cost"
  | "no_insurance"
  | "transport"
  | "hours"
  | "appointment"
  | "language"
  | "childcare"
  | "portal";
export type SocialNeed =
  | "food"
  | "housing"
  | "utilities"
  | "transportation"
  | "family_care"
  | "coverage_or_doctor"
  | "none";
export type EducationLevel =
  | "less_than_hs"
  | "hs_or_ged"
  | "some_college"
  | "certificate"
  | "associate"
  | "bachelor_or_higher";
export type TrainingNeed =
  | "ged"
  | "english"
  | "certificate"
  | "digital_skills"
  | "resume"
  | "business"
  | "none";
export type EmploymentBarrier =
  | "schedule"
  | "childcare"
  | "transportation"
  | "skills"
  | "language"
  | "health_or_disability"
  | "background_check"
  | "no_computer"
  | "none";
export type TransportMode =
  | "own_car"
  | "ride"
  | "transit"
  | "bike_or_walk"
  | "rideshare"
  | "cannot_get_there";
export type Reliability = "usually" | "sometimes" | "rarely";
export type Destination = "work" | "school" | "medical" | "grocery" | "benefits_office" | "not_hard";
export type DigitalAccess =
  | "wifi_home"
  | "wifi_elsewhere"
  | "smartphone"
  | "computer"
  | "tablet"
  | "shared_computer"
  | "none";
export type DigitalComfort = "comfortable" | "with_help" | "uncomfortable";
export type GoalId =
  | "housing"
  | "food"
  | "utilities"
  | "health"
  | "job"
  | "training"
  | "transportation"
  | "digital"
  | "family_care"
  | "other";
export type Urgency = "this_week" | "this_month" | "planning_ahead";

export type PrototypeStorage = "memory_only" | "local_device";
export type SensitiveConsent = "granted" | "declined";

export type FinancialAnswers = {
  consent: "granted";
  employment: Answer<EmploymentStatus>;
  incomeRange: Answer<IncomeRange>;
  housingSituation: Answer<HousingSituation>;
  housingCostHardship: Answer<Hardship>;
  foodSecurity: Answer<FoodSecurity>;
  foodBarriers: Answer<FoodBarrier[]>;
  utilityTrouble: Answer<YesNo>;
  utilityTypes: Answer<UtilityType[]>;
};

export type HealthAnswers = {
  consent: "granted";
  insurance: Answer<InsuranceStatus>;
  hasPcp: Answer<YesNo>;
  wantsClinicHelp: Answer<YesNo>;
  careAccessDifficulty: Answer<CareAccess>;
  careBarriers: Answer<CareBarrier[]>;
  unmetSocialNeeds: Answer<SocialNeed[]>;
};

export type HouseholdAssessment = {
  schemaVersion: 1;
  id: string;
  locale: "en" | "es";
  createdAt: string;
  updatedAt: string;
  prototypeStorage: PrototypeStorage;
  sensitiveConsent: SensitiveConsent;
  household: {
    zip: Answer<string>;
    adults: Answer<number>;
    children: Answer<number>;
    otherDependents: Answer<number>;
  };
  financial: { consent: "declined" } | FinancialAnswers;
  health: { consent: "declined" } | HealthAnswers;
  educationEmployment: {
    highestEducation: Answer<EducationLevel>;
    trainingNeeds: Answer<TrainingNeed[]>;
    careerGoal: Answer<string>;
    employmentBarriers: Answer<EmploymentBarrier[]>;
  };
  transportation: {
    modes: Answer<TransportMode[]>;
    reliability: Answer<Reliability>;
    hardToReach: Answer<Destination[]>;
  };
  digital: {
    access: Answer<DigitalAccess[]>;
    comfort: Answer<DigitalComfort>;
  };
  priorities: {
    topGoals: Answer<GoalId[]>;
    otherGoalText: Answer<string>;
    urgency: Answer<Urgency>;
  };
};

export type FinancialDraft =
  | { consent: "declined" }
  | {
      consent: "granted";
      employment?: Answer<EmploymentStatus>;
      incomeRange?: Answer<IncomeRange>;
      housingSituation?: Answer<HousingSituation>;
      housingCostHardship?: Answer<Hardship>;
      foodSecurity?: Answer<FoodSecurity>;
      foodBarriers?: Answer<FoodBarrier[]>;
      utilityTrouble?: Answer<YesNo>;
      utilityTypes?: Answer<UtilityType[]>;
    };

export type HealthDraft =
  | { consent: "declined" }
  | {
      consent: "granted";
      insurance?: Answer<InsuranceStatus>;
      hasPcp?: Answer<YesNo>;
      wantsClinicHelp?: Answer<YesNo>;
      careAccessDifficulty?: Answer<CareAccess>;
      careBarriers?: Answer<CareBarrier[]>;
      unmetSocialNeeds?: Answer<SocialNeed[]>;
    };

export type DraftAssessment = {
  schemaVersion: 1;
  id: string;
  locale: "en" | "es";
  createdAt: string;
  updatedAt: string;
  prototypeStorage: PrototypeStorage;
  sensitiveConsent?: SensitiveConsent;
  household: {
    zip?: Answer<string>;
    adults?: Answer<number>;
    children?: Answer<number>;
    otherDependents?: Answer<number>;
  };
  financial?: FinancialDraft;
  health?: HealthDraft;
  educationEmployment: {
    highestEducation?: Answer<EducationLevel>;
    trainingNeeds?: Answer<TrainingNeed[]>;
    careerGoal?: Answer<string>;
    employmentBarriers?: Answer<EmploymentBarrier[]>;
  };
  transportation: {
    modes?: Answer<TransportMode[]>;
    reliability?: Answer<Reliability>;
    hardToReach?: Answer<Destination[]>;
  };
  digital: {
    access?: Answer<DigitalAccess[]>;
    comfort?: Answer<DigitalComfort>;
  };
  priorities: {
    topGoals?: Answer<GoalId[]>;
    otherGoalText?: Answer<string>;
    urgency?: Answer<Urgency>;
  };
};

export type CatalogCategory =
  | "food"
  | "housing"
  | "utilities"
  | "health_coverage"
  | "care_access"
  | "employment"
  | "training"
  | "transportation"
  | "digital"
  | "family_care";

export type Channel = "phone" | "in_person" | "online" | "mail";

export type OfficialLink = {
  url: string;
  note: string | null;
};

export type IncomeChartRow = {
  people: number;
  annual: string;
  monthly: string;
  twiceMonthly: string;
  biweekly: string;
  weekly: string;
};

export type IncomeChart = {
  effectiveFrom: string;
  effectiveTo: string;
  sourceUrl: string;
  rows: IncomeChartRow[];
};

export type VerifiedCatalogEntry = {
  id: string;
  name: string;
  verified: true;
  sourceName: string;
  sourceUrl: string;
  lastVerified: string;
  serviceAreaZips: string[] | "unknown";
  categories: CatalogCategory[];
  channels: Channel[];
  phone: string | null;
  eligibility: {
    incomeCeiling: IncomeRange | null;
    requiresZipInServiceArea: boolean;
    requiresChildren: boolean | null;
    statedRequirements: string[];
  };
  claimText: string;
  officialLinks?: OfficialLink[];
  applicationUrl?: string | null;
  applicationInstructions?: string | null;
  contactEmail?: string | null;
  contactHours?: string | null;
  documents?: string[];
  services?: string[];
  incomeChart?: IncomeChart | null;
  preparationNote?: string | null;
};

export type MissingFact =
  | "zip"
  | "children"
  | "income_range"
  | "insurance"
  | "catalog_service_area"
  | "catalog_income_rule";

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9";

export type MatchDecision =
  | { kind: "possible_help"; ruleId: RuleId; missingEligibility: MissingFact[] }
  | { kind: "needs_information"; ruleId: RuleId; missingEligibility: MissingFact[] }
  | { kind: "not_applicable"; ruleId: RuleId | "none" };

export type MicroAction = {
  id: string;
  localDate: string;
  ruleId: string;
  catalogId: string | null;
  missingFact: MissingFact | null;
  channel: Channel | "on_device";
  barrierNote: "transportation" | "digital" | "both" | null;
  status: "open" | "done" | "skipped";
  completedAt: string | null;
};

export type SectionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;
