export type TaskQuadrant =
  | "urgent-important"
  | "urgent-not-important"
  | "not-urgent-important"
  | "not-urgent-not-important";

export type TaskDifficulty = "easy" | "medium" | "hard";

export type Task = {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  quadrant: TaskQuadrant;
  priority: number;
  timeRequired?: string;
  timeBlock?: string;
  difficulty?: TaskDifficulty;
  tags: string[];
  plannerId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Planner = {
  id: string;
  date: string;
  userId: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
};

export type ViewMode = "quadrant" | "list";

export type QuadrantConfig = {
  key: TaskQuadrant;
  title: string;
  subtitle: string;
  color: string;
};

export const QUADRANTS: QuadrantConfig[] = [
  {
    key: "urgent-important",
    title: "Do",
    subtitle: "Urgent & Important",
    color: "bg-destructive/10 border-destructive/20",
  },
  {
    key: "urgent-not-important",
    title: "Delegate",
    subtitle: "Urgent & Not Important",
    color:
      "bg-orange-100 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30",
  },
  {
    key: "not-urgent-important",
    title: "Schedule",
    subtitle: "Not Urgent & Important",
    color: "bg-primary/10 border-primary/20",
  },
  {
    key: "not-urgent-not-important",
    title: "Eliminate",
    subtitle: "Not Urgent & Not Important",
    color: "bg-muted/50 border-border",
  },
];
