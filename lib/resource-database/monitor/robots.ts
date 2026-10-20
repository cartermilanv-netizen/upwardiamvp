import type { RobotsDecisionKind } from "./types";

export type RobotsDecision = {
  decision: RobotsDecisionKind;
  reason: string;
};

type Rule = { kind: "allow" | "disallow"; path: string };

/**
 * Decide whether one path may be fetched. Sitemap lines are ignored and not requested.
 * An HTML interstitial is not a robots policy.
 */
export function robotsAllows(robotsTxt: string, path: string, userAgent: string): RobotsDecision {
  if (!/user-agent\s*:/i.test(robotsTxt) || /<html[\s>]/i.test(robotsTxt)) {
    return { decision: "unavailable", reason: "robots.txt was not a robots policy." };
  }
  const groups = parseGroups(robotsTxt);
  const specific = groups
    .filter((group) => group.agents.some((agent) => agent !== "*" && userAgent.toLowerCase().startsWith(agent)))
    .sort((left, right) => longestAgent(right.agents) - longestAgent(left.agents))[0];
  const star = groups.find((group) => group.agents.includes("*"));
  const group = specific ?? star;
  if (!group || group.rules.length === 0) {
    return { decision: "allow", reason: "No disallow rule matched this user agent." };
  }
  const matches = group.rules.filter((rule) => pathMatches(path, rule.path));
  if (matches.length === 0) return { decision: "allow", reason: "No path rule matched." };
  const longest = Math.max(...matches.map((rule) => rule.path.length));
  const winners = matches.filter((rule) => rule.path.length === longest);
  const allowed = winners.some((rule) => rule.kind === "allow");
  return allowed
    ? { decision: "allow", reason: `Allow ${winners.find((rule) => rule.kind === "allow")?.path} matches ${path}.` }
    : { decision: "disallow", reason: `Disallow ${winners[0]?.path} matches ${path}.` };
}

function longestAgent(agents: string[]): number {
  return Math.max(...agents.filter((agent) => agent !== "*").map((agent) => agent.length), 0);
}

function parseGroups(robotsTxt: string): { agents: string[]; rules: Rule[] }[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let agents: string[] = [];
  let rules: Rule[] = [];
  const flushAgents = () => {
    if (agents.length === 0) return;
    groups.push({ agents, rules });
    agents = [];
    rules = [];
  };
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (rules.length > 0) flushAgents();
      agents.push(value.toLowerCase());
      continue;
    }
    if ((field === "allow" || field === "disallow") && agents.length > 0) {
      rules.push({ kind: field, path: value });
    }
  }
  flushAgents();
  return groups;
}

function pathMatches(path: string, rulePath: string): boolean {
  if (rulePath === "") return false;
  if (rulePath === "/") return true;
  return path.startsWith(rulePath);
}
