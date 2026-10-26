import { PersonaSchema, type Persona } from "@vmi/contracts";
import { Cog, Factory, FlaskConical, GraduationCap, Wrench, type LucideIcon } from "lucide-react";

const KEY = "vmi.persona";

export function getPersona(): Persona | null {
  const parsed = PersonaSchema.safeParse(localStorage.getItem(KEY));
  return parsed.success ? parsed.data : null;
}

export function savePersona(p: Persona) {
  localStorage.setItem(KEY, p);
}

interface PersonaInfo {
  label: string;
  blurb: string; // shown on the welcome card
  focus: string; // shown on the dashboard
  icon: LucideIcon;
}

export const PERSONA_INFO: Record<Persona, PersonaInfo> = {
  student: {
    label: "Student",
    blurb: "Learning mode: longer explanations, definitions and worked calculations.",
    focus: "Learning mode is on: explanations include definitions and worked steps.",
    icon: GraduationCap,
  },
  technician: {
    label: "Technician",
    blurb: "Setup-sheet first: tools, offsets, setup steps and short wording.",
    focus: "Setup-sheet view: tools, offsets and setup steps come first.",
    icon: Wrench,
  },
  engineer: {
    label: "Engineer",
    blurb: "Full workspace: drawing facts, planning, optimisation and all warnings.",
    focus: "Full workspace: drawing facts, planning, optimisation and every warning.",
    icon: Cog,
  },
  manufacturer: {
    label: "Manufacturer",
    blurb: "Cycle time, cost and report views first, plus job history and comparisons.",
    focus: "Business view: cycle time, cost and reports come first.",
    icon: Factory,
  },
  researcher: {
    label: "Researcher",
    blurb: "Evidence first: sources, versions, data export and evaluation views.",
    focus: "Evidence view: sources, versions and evaluation come first.",
    icon: FlaskConical,
  },
};
