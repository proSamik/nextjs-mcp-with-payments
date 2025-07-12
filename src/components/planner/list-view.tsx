"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Task, TaskQuadrant, QUADRANTS } from "@/types/planner";
import { TaskItem } from "./task-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ListViewProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskCreate: (quadrant: TaskQuadrant) => void;
  onTaskEdit: (task: Task) => void;
}

export function ListView({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  onTaskEdit,
}: ListViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<TaskQuadrant>>(
    new Set(),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = active.data.current?.task;
    const overContainer = over.data.current?.quadrant;

    if (activeTask && overContainer && activeTask.quadrant !== overContainer) {
      // Update task quadrant immediately for visual feedback
      onTaskUpdate(activeTask.id, { quadrant: overContainer });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = active.data.current?.task;
    const overContainer = over.data.current?.quadrant;
    const overTask = over.data.current?.task;

    if (!activeTask) return;

    if (overContainer && activeTask.quadrant !== overContainer) {
      // Final update with new quadrant and priority
      const quadrantTasks = getTasksByQuadrant(overContainer);
      const newPriority = quadrantTasks.length;

      onTaskUpdate(activeTask.id, {
        quadrant: overContainer,
        priority: newPriority,
      });
    } else if (overTask && activeTask.id !== overTask.id) {
      // Reorder within same quadrant
      const newPriority = overTask.priority;
      onTaskUpdate(activeTask.id, { priority: newPriority });
    }
  };

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      onTaskUpdate(taskId, { isCompleted: !task.isCompleted });
    }
  };

  const toggleSection = (quadrant: TaskQuadrant) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(quadrant)) {
      newCollapsed.delete(quadrant);
    } else {
      newCollapsed.add(quadrant);
    }
    setCollapsedSections(newCollapsed);
  };

  const getTasksByQuadrant = (quadrant: TaskQuadrant) => {
    return tasks
      .filter((task) => task.quadrant === quadrant)
      .sort((a, b) => a.priority - b.priority);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {QUADRANTS.map((quadrant) => {
          const quadrantTasks = getTasksByQuadrant(quadrant.key);
          const isCollapsed = collapsedSections.has(quadrant.key);
          const completedTasks = quadrantTasks.filter(
            (task) => task.isCompleted,
          ).length;

          return (
            <motion.div
              key={quadrant.key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="transition-all duration-200">
                <Collapsible
                  open={!isCollapsed}
                  onOpenChange={() => toggleSection(quadrant.key)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader
                      className={cn(
                        "pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                        quadrant.color,
                      )}
                      data-quadrant={quadrant.key}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollapsed ? (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              {quadrant.title}
                            </CardTitle>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {quadrant.subtitle}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {completedTasks}/{quadrantTasks.length} completed
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskCreate(quadrant.key);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <SortableContext
                        items={quadrantTasks.map((task) => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3" data-quadrant={quadrant.key}>
                          {quadrantTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              onToggleComplete={handleToggleComplete}
                              onEdit={onTaskEdit}
                              onDelete={onTaskDelete}
                            />
                          ))}

                          {quadrantTasks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="text-gray-400 dark:text-gray-600 mb-2">
                                No tasks in this section
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onTaskCreate(quadrant.key)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Task
                              </Button>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskItem
            task={activeTask}
            onToggleComplete={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
