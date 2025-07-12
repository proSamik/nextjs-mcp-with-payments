"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Grid3X3, List, Plus } from "lucide-react";
import { Task, TaskQuadrant, ViewMode, Planner } from "@/types/planner";
import { QuadrantView } from "./quadrant-view";
import { ListView } from "./list-view";
import { TaskForm } from "./task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useTaskWebSocket } from "@/lib/websocket/client";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

interface PlannerViewProps {
  initialDate?: Date;
}

export function PlannerView({ initialDate = new Date() }: PlannerViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("quadrant");
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultQuadrant, setDefaultQuadrant] =
    useState<TaskQuadrant>("urgent-important");

  const { data: session } = authClient.useSession();

  // WebSocket integration for real-time updates
  const { joinDateRoom, setTasks: setWebSocketTasks } = useTaskWebSocket(
    session?.user?.id || null,
    (updatedTasks: Task[]) => {
      setTasks(updatedTasks);
    },
  );

  // Format date for API calls
  const formatDateForAPI = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  // Fetch planner and tasks for selected date
  const fetchPlannerData = async (date: Date) => {
    setIsLoading(true);
    try {
      const formattedDate = formatDateForAPI(date);
      const response = await fetch(`/api/planner?date=${formattedDate}`);

      if (response.ok) {
        const data = await response.json();
        setPlanner(data.planner);
        const fetchedTasks = data.tasks || [];
        setTasks(fetchedTasks);
        setWebSocketTasks(fetchedTasks);

        // Join WebSocket room for this date
        if (data.planner) {
          joinDateRoom(formattedDate);
        }
      } else {
        console.error("Failed to fetch planner data");
        setTasks([]);
      }
    } catch (error) {
      console.error("Error fetching planner data:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Handle task creation
  const handleTaskCreate = async (taskData: Partial<Task>) => {
    if (!planner) return;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          plannerId: planner.id,
          priority: tasks.filter((t) => t.quadrant === taskData.quadrant)
            .length,
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks((prev) => [...prev, newTask]);
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  // Handle task update
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t)),
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  // Handle task form submission
  const handleTaskFormSubmit = (taskData: Partial<Task>) => {
    if (editingTask) {
      handleTaskUpdate(editingTask.id, taskData);
    } else {
      handleTaskCreate(taskData);
    }
    setEditingTask(null);
  };

  // Open task form for specific quadrant
  const handleCreateTaskInQuadrant = (quadrant: TaskQuadrant) => {
    setDefaultQuadrant(quadrant);
    setEditingTask(null);
    setIsTaskFormOpen(true);
  };

  // Open task form for editing
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  // Load data when date changes
  useEffect(() => {
    fetchPlannerData(selectedDate);
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl font-bold">Task Planner</CardTitle>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-border p-1">
                <Button
                  variant={viewMode === "quadrant" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("quadrant")}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Quadrant
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
              </div>

              {/* Add Task Button */}
              <Button
                onClick={() => {
                  setDefaultQuadrant("urgent-important");
                  setEditingTask(null);
                  setIsTaskFormOpen(true);
                }}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {tasks.length} tasks total •{" "}
              {tasks.filter((t) => t.isCompleted).length} completed
            </div>
            <div>{format(selectedDate, "EEEE")}</div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with View Transition */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-muted-foreground">Loading planner...</div>
          </motion.div>
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === "quadrant" ? (
              <QuadrantView
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onTaskCreate={handleCreateTaskInQuadrant}
                onTaskEdit={handleEditTask}
              />
            ) : (
              <ListView
                tasks={tasks}
                onTaskUpdate={handleTaskUpdate}
                onTaskDelete={handleTaskDelete}
                onTaskCreate={handleCreateTaskInQuadrant}
                onTaskEdit={handleEditTask}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        task={editingTask}
        defaultQuadrant={defaultQuadrant}
      />
    </div>
  );
}
