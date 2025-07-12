import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { TaskSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, inArray } from "drizzle-orm";
import { TaskQuadrant } from "@/types/planner";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, newQuadrant, newPriority, taskUpdates } =
      await request.json();

    if (taskUpdates && Array.isArray(taskUpdates)) {
      // Batch update multiple tasks for reordering
      const taskIds = taskUpdates.map((update: any) => update.id);

      // Validate all tasks belong to the user
      const existingTasks = await db
        .select()
        .from(TaskSchema)
        .where(
          and(
            inArray(TaskSchema.id, taskIds),
            eq(TaskSchema.userId, session.user.id),
          ),
        );

      if (existingTasks.length !== taskIds.length) {
        return NextResponse.json(
          { error: "Some tasks not found" },
          { status: 404 },
        );
      }

      // Update all tasks
      const updatePromises = taskUpdates.map((update: any) =>
        db
          .update(TaskSchema)
          .set({
            quadrant: update.quadrant,
            priority: update.priority,
            updatedAt: new Date(),
          })
          .where(eq(TaskSchema.id, update.id))
          .returning(),
      );

      const results = await Promise.all(updatePromises);
      return NextResponse.json(results.map((result) => result[0]));
    } else if (taskId) {
      // Single task update
      const updatedTask = await db
        .update(TaskSchema)
        .set({
          quadrant: newQuadrant as TaskQuadrant,
          priority: newPriority,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(TaskSchema.id, taskId),
            eq(TaskSchema.userId, session.user.id),
          ),
        )
        .returning();

      if (updatedTask.length === 0) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      return NextResponse.json(updatedTask[0]);
    }

    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
