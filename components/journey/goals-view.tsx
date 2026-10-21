"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyNote, ProgressMeter } from "@/components/journey/money-note";
import { parseStored, readPrototypeRaw, subscribePrototype } from "@/lib/storage";
import { DEMO_DAY } from "@/lib/journey/constants";
import { chooseGoal, getJourneySnapshot, getServerJourneySnapshot, reportGoalOutcome, saveAssessmentGoals, saveManualGoal, saveTask, subscribeJourney } from "@/lib/journey/store";
import { DOMAIN_LABEL, JOURNEY_DOMAINS } from "@/lib/journey/types";
import type { ActionKind, GoalChoice, JourneyDomain } from "@/lib/journey/types";
import { routes } from "@/lib/site";

const CHOICE_LABEL: Record<GoalChoice, string> = {
  active: "Active",
  completed: "Completed",
  skipped: "Skipped",
  postponed: "Postponed",
  stuck: "Stuck",
};

const SOURCE_LABEL = {
  manual: "Added by you",
  assessment: "From assessment priorities",
  saved_resource: "From a saved resource",
} as const;

function useAssessmentGoalIds(): string[] {
  const raw = useSyncExternalStore(subscribePrototype, readPrototypeRaw, () => null);
  const saved = raw ? parseStored(raw) : null;
  const answer = saved?.assessment.priorities.topGoals;
  if (answer?.status !== "answered") return [];
  return answer.value;
}

export function GoalsView() {
  const state = useSyncExternalStore(subscribeJourney, getJourneySnapshot, getServerJourneySnapshot);
  const assessmentIds = useAssessmentGoalIds();
  const [domain, setDomain] = useState<JourneyDomain>("food");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(false);
  const [formError, setFormError] = useState("");
  const goals = [...state.goals].sort((a, b) => Number(b.priority) - Number(a.priority) || a.title.localeCompare(b.title));

  function addGoal(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length < 3) {
      setFormError("Add a short title.");
      return;
    }
    saveManualGoal({ domain, title, priority });
    setTitle("");
    setPriority(false);
    setFormError("");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-10">
      <MoneyNote />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-[#092451]">My Goals</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
          Priority goals sit beside smaller tasks. Food, housing, healthcare, financial stability, education, employment, transportation, and digital access are all available. Checking a step is not the same as an outcome.
        </p>
      </header>

      <form onSubmit={addGoal} className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[#092451]">Add a goal</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="goal-domain">Area</Label>
            <select
              id="goal-domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value as JourneyDomain)}
              className="h-11 rounded-lg border border-[#d6d3d1] bg-white px-3 text-base text-[#092451]"
            >
              {JOURNEY_DOMAINS.map((item) => (
                <option key={item} value={item}>
                  {DOMAIN_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="goal-title">Title</Label>
            <Input id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} className="h-11" placeholder="What do you want to work on?" />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" className="size-5 accent-[#092451]" checked={priority} onChange={(event) => setPriority(event.target.checked)} />
          Priority goal
        </label>
        {formError && (
          <p className="mt-2 text-sm font-medium text-[#9f1239]" role="alert">
            {formError}
          </p>
        )}
        <Button type="submit" className="mt-3 h-11 px-4">
          Save goal
        </Button>
      </form>

      <section className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[#092451]">From your assessment</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          This adds a goal for each priority area that is not already on your journey. It reads those priority labels only. Income, health, and other answers stay in the assessment.
        </p>
        {assessmentIds.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700">
            No saved priorities yet.{" "}
            <Link href={routes.assessment} className="font-semibold text-[#092451] underline-offset-4 hover:underline">
              Open the household assessment
            </Link>
            .
          </p>
        ) : (
          <Button type="button" className="mt-3 h-11 px-4" variant="outline" onClick={() => saveAssessmentGoals(assessmentIds)}>
            Add goals from my assessment
          </Button>
        )}
      </section>

      <ul className="flex flex-col gap-4">
        {goals.map((item) => {
          const tasks = state.actions.filter((action) => action.goalId === item.id);
          return (
            <li key={item.id} className="rounded-2xl border border-[#e4e0d8] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[#092451]">{item.title}</h2>
                <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-xs font-semibold text-[#092451]">{DOMAIN_LABEL[item.domain]}</span>
                {item.priority && <span className="rounded-full bg-[#FFC928] px-2 py-0.5 text-xs font-semibold text-[#092451]">Priority</span>}
                <span className="rounded-full border border-[#092451] px-2 py-0.5 text-xs font-semibold text-[#092451]">{CHOICE_LABEL[item.choice]}</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">{SOURCE_LABEL[item.source]}</p>
              <div className="mt-3">
                <ProgressMeter value={item.progress} label={`${item.title} progress`} />
              </div>
              {item.outcomeReported && <p className="mt-2 text-sm text-stone-700">You reported an outcome for this goal. It was not sent anywhere.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["completed", "Complete"],
                    ["skipped", "Skip"],
                    ["postponed", "Postpone"],
                    ["stuck", "Stuck"],
                  ] as const
                ).map(([choice, label]) => (
                  <Button key={choice} type="button" variant="outline" className="h-11 px-3" onClick={() => chooseGoal(item.id, choice)}>
                    {label}
                  </Button>
                ))}
                {item.choice === "completed" && !item.outcomeReported && (
                  <Button type="button" variant="secondary" className="h-11 px-3" onClick={() => reportGoalOutcome(item.id)}>
                    Report an outcome
                  </Button>
                )}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#092451]">Progress over time</h3>
              <ol className="mt-2 flex flex-col gap-1">
                {item.history.map((entry) => (
                  <li key={`${item.id}-${entry.at}-${entry.note}`} className="text-sm text-stone-700">
                    {entry.at.slice(0, 10)} · {entry.progress}% · {entry.note}
                  </li>
                ))}
              </ol>
              <h3 className="mt-4 text-sm font-semibold text-[#092451]">Smaller tasks</h3>
              {tasks.length === 0 ? (
                <p className="mt-1 text-sm text-stone-600">No tasks yet.</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {tasks.map((task) => (
                    <li key={task.id} className="text-sm text-stone-800">
                      {task.description} · {task.type} · {task.status.replaceAll("_", " ")}
                    </li>
                  ))}
                </ul>
              )}
              <TaskForm goalId={item.id} />
              {item.programId && (
                <p className="mt-3 text-sm">
                  <Link href={`/resources/programs/${item.programId}`} className="font-semibold text-[#092451] underline-offset-4 hover:underline">
                    View the saved program
                  </Link>
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-stone-600">Demonstration day {DEMO_DAY}. Changing one goal leaves the others as they are.</p>
    </main>
  );
}

function TaskForm({ goalId }: { goalId: string }) {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ActionKind>("preparation");
  const [dueDate, setDueDate] = useState("");
  const [wantsReward, setWantsReward] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (description.trim().length < 3) {
      setError("Describe the task in a few words.");
      return;
    }
    saveTask({ goalId, description, type, dueDate: dueDate || null, wantsReward: type === "milestone" && wantsReward });
    setDescription("");
    setDueDate("");
    setWantsReward(false);
    setError("");
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-xl bg-[#f4f1ea] p-3">
      <h4 className="text-sm font-semibold text-[#092451]">Add a smaller task</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor={`task-${goalId}`}>Description</Label>
          <Input id={`task-${goalId}`} value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 bg-white" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`type-${goalId}`}>Type</Label>
          <select
            id={`type-${goalId}`}
            value={type}
            onChange={(event) => setType(event.target.value as ActionKind)}
            className="h-11 rounded-lg border border-[#d6d3d1] bg-white px-3 text-base"
          >
            <option value="preparation">Preparation</option>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`due-${goalId}`}>Due date</Label>
          <Input id={`due-${goalId}`} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 bg-white" />
        </div>
      </div>
      {type === "milestone" && (
        <label className="mt-2 flex items-start gap-2 text-sm text-stone-800">
          <input type="checkbox" className="mt-1 size-5 accent-[#092451]" checked={wantsReward} onChange={(event) => setWantsReward(event.target.checked)} />
          <span>Eligible for the example $5 demonstration milestone after verification. You can leave this off and still complete the step.</span>
        </label>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-[#9f1239]" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" variant="outline" className="mt-2 h-11 bg-white px-3">
        Add task
      </Button>
    </form>
  );
}
