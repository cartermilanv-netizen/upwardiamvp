import type { HpObjectiveId } from "@/lib/impact/types";

/**
 * Official Healthy People 2030 fields copied from odphp.health.gov on 2026-10-20.
 * Platform text is an Upwardia demonstration measure. It is not a national rate.
 */
export type OfficialObjective = {
  id: HpObjectiveId;
  title: string;
  definition: string;
  url: string;
  targetPercent: number;
  targetLabel: string;
  baseline: string;
  mostRecent: string;
  desiredDirection: string;
  nationalStatus: string;
  dataSource: string;
  targetSettingMethod: string;
  nationalPopulation: string;
  mappedGoals: readonly string[];
  mappedActions: readonly string[];
  platformMeasure: string;
  numerator: string;
  denominator: string;
  population: string;
  followUpTime: string;
  separation: string;
};

const populationNote =
  "Consented demonstration participants in the signed-in organization and jurisdiction who have a baseline observation and a follow-up 90 days later. This is not the U.S. survey population used for the national figure.";

export const HP2030: Record<HpObjectiveId, OfficialObjective> = {
  "AHS-07": {
    id: "AHS-07",
    title: "Increase the proportion of people with a usual source of care",
    definition: "Increase the proportion of persons with a usual source of care",
    url: "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/health-care-access-and-quality/increase-proportion-people-usual-source-care-ahs-07",
    targetPercent: 95.1,
    targetLabel: "95.1 percent",
    baseline: "89.9 percent of persons had a usual source of care in 2019",
    mostRecent: "90.3 percent (2024)",
    desiredDirection: "Increase desired",
    nationalStatus: "Little or no detectable change",
    dataSource: "National Health Interview Survey (NHIS), CDC/NCHS",
    targetSettingMethod: "Percentage point improvement",
    nationalPopulation: "Persons in the National Health Interview Survey. That survey population is not the group of Upwardia participants.",
    mappedGoals: ["Health: find a usual place of care"],
    mappedActions: ["Save the Care Connection Desk listing", "Start a care-navigation task", "Record a follow-up about a usual place of care"],
    platformMeasure:
      "Share of consented demonstration participants with a baseline and a 90-day follow-up whose follow-up says they have a usual source of care.",
    numerator: "Participants in the denominator whose follow-up observation is positive for a usual source of care.",
    denominator: "Consented demonstration participants in the authorized scope with both a baseline observation and a 90-day follow-up for AHS-07.",
    population: populationNote,
    followUpTime: "90 days",
    separation:
      "A usual source of care recorded here is a platform observation. It is not the Healthy People 2030 national rate, and it is not evidence that Upwardia caused movement toward the national target of 95.1 percent.",
  },
  "NWS-01": {
    id: "NWS-01",
    title: "Reduce household food insecurity and hunger",
    definition: "Reduce household food insecurity and in doing so reduce hunger",
    url: "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/nutrition-and-healthy-eating/reduce-household-food-insecurity-and-hunger-nws-01",
    targetPercent: 6,
    targetLabel: "6.0 percent",
    baseline: "11.1 percent of households were food insecure in 2018",
    mostRecent: "13.7 percent (2024)",
    desiredDirection: "Decrease desired",
    nationalStatus: "Getting worse",
    dataSource: "Current Population Survey Food Security Supplement (CPS-FSS), Census and USDA/ERS",
    targetSettingMethod: "Maintain consistency with national programs, regulations, policies, or laws",
    nationalPopulation: "U.S. households in the Current Population Survey Food Security Supplement. Those households are not Upwardia participants.",
    mappedGoals: ["Food: steady access to food"],
    mappedActions: ["View a food listing", "Save a food listing", "Start a food program application"],
    platformMeasure:
      "Share of consented demonstration participants with a baseline and a 90-day follow-up whose follow-up says they had enough food access.",
    numerator: "Participants in the denominator whose follow-up observation is positive for food access.",
    denominator: "Consented demonstration participants in the authorized scope with both a baseline observation and a 90-day follow-up for NWS-01.",
    population: populationNote,
    followUpTime: "90 days",
    separation:
      "Food access here is a question answered inside this demonstration. It is not the national household food-insecurity rate, and it is not evidence that Upwardia caused movement toward the national target of 6.0 percent.",
  },
  "AHS-04": {
    id: "AHS-04",
    title: "Reduce the proportion of people who can't get medical care when they need it",
    definition: "Reduce the proportion of people who can't get medical care when they need it",
    url: "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/health-care-access-and-quality/reduce-proportion-people-who-cant-get-medical-care-when-they-need-it-ahs-04",
    targetPercent: 5.9,
    targetLabel: "5.9 percent",
    baseline: "8.5 percent of persons were unable to obtain or delayed in obtaining necessary medical care due to cost in 2019",
    mostRecent: "8.2 percent (2024)",
    desiredDirection: "Decrease desired",
    nationalStatus: "Little or no detectable change",
    dataSource: "National Health Interview Survey (NHIS), CDC/NCHS",
    targetSettingMethod: "Percentage point improvement",
    nationalPopulation: "Persons in the National Health Interview Survey. That survey population is not the group of Upwardia participants.",
    mappedGoals: ["Health: get care when it is needed"],
    mappedActions: ["View a health listing", "Start a coverage or care-navigation task", "Record that a health resource was accessed"],
    platformMeasure:
      "Share of consented demonstration participants with a baseline and a 90-day follow-up whose follow-up says they accessed a health resource.",
    numerator: "Participants in the denominator whose follow-up observation is positive for accessing a health resource.",
    denominator: "Consented demonstration participants in the authorized scope with both a baseline observation and a 90-day follow-up for AHS-04.",
    population: populationNote,
    followUpTime: "90 days",
    separation:
      "Accessing a health resource in Upwardia is not the national rate of people who could not get medical care because of cost, and it is not evidence that Upwardia caused movement toward the national target of 5.9 percent.",
  },
  "SDOH-01": {
    id: "SDOH-01",
    title: "Reduce the proportion of people living in poverty",
    definition: "Reduce the proportion of persons living in poverty",
    url: "https://odphp.health.gov/healthypeople/objectives-and-data/browse-objectives/economic-stability/reduce-proportion-people-living-poverty-sdoh-01",
    targetPercent: 8,
    targetLabel: "8.0 percent",
    baseline: "11.8 percent of persons were living below the poverty threshold in 2018",
    mostRecent: "10.6 percent (2024)",
    desiredDirection: "Decrease desired",
    nationalStatus: "Improving",
    dataSource: "Current Population Survey Annual Social and Economic Supplement (CPS-ASEC), Census and DOL/BLS",
    targetSettingMethod: "Projection",
    nationalPopulation:
      "Persons in the Current Population Survey Annual Social and Economic Supplement. That national population is not the group of Upwardia participants.",
    mappedGoals: ["Training or a job step", "A housing stability step"],
    mappedActions: ["Start a training task", "Complete a housing navigation task", "Record an education or housing follow-up"],
    platformMeasure:
      "Share of consented demonstration participants with a baseline and a 90-day follow-up whose follow-up records a completed education, workforce, or housing step.",
    numerator: "Participants in the denominator whose follow-up observation is positive for an education, workforce, or housing step.",
    denominator: "Consented demonstration participants in the authorized scope with both a baseline observation and a 90-day follow-up for SDOH-01.",
    population: populationNote,
    followUpTime: "90 days",
    separation:
      "This platform measure is a completed step in education, work, or housing. It is not a poverty rate. Income and poverty status are not stored. It is not evidence that Upwardia caused movement toward the national target of 8.0 percent.",
  },
};

export const HP_ORDER: readonly HpObjectiveId[] = ["AHS-07", "NWS-01", "AHS-04", "SDOH-01"];
