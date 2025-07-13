import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { TaskSchema, PlannerSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { TaskQuadrant, TaskDifficulty } from "@/types/planner";
import {
  broadcastTaskUpdated,
  broadcastTaskDeleted,
} from "@/lib/websocket/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const updateData = await request.json();

    // Validate the task belongs to the user
    const existingTask = await db
      .select()
      .from(TaskSchema)
      .where(
        and(eq(TaskSchema.id, taskId), eq(TaskSchema.userId, session.user.id)),
      )
      .limit(1);

    if (existingTask.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the task
    const updatedTask = await db
      .update(TaskSchema)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(TaskSchema.id, taskId))
      .returning();

    // Get planner info for broadcasting
    const planner = await db
      .select()
      .from(PlannerSchema)
      .where(eq(PlannerSchema.id, existingTask[0].plannerId))
      .limit(1);

    // Broadcast task update to WebSocket clients
    if (planner[0] && updatedTask[0]) {
      try {
        const taskForBroadcast = {
          ...updatedTask[0],
          description: updatedTask[0].description || undefined,
          timeRequired: updatedTask[0].timeRequired || undefined,
          timeBlock: updatedTask[0].timeBlock || undefined,
          difficulty:
            (updatedTask[0].difficulty as TaskDifficulty) || undefined,
          tags: updatedTask[0].tags || [],
          quadrant: updatedTask[0].quadrant as TaskQuadrant,
        };
        broadcastTaskUpdated(
          taskForBroadcast,
          planner[0].date,
          session.user.id,
        );
      } catch (error) {
        console.warn("Failed to broadcast task update:", error);
      }
    }

    return NextResponse.json(updatedTask[0]);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Validate the task belongs to the user
    const existingTask = await db
      .select()
      .from(TaskSchema)
      .where(
        and(eq(TaskSchema.id, taskId), eq(TaskSchema.userId, session.user.id)),
      )
      .limit(1);

    if (existingTask.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get planner info for broadcasting before deletion
    const planner = await db
      .select()
      .from(PlannerSchema)
      .where(eq(PlannerSchema.id, existingTask[0].plannerId))
      .limit(1);

    // Delete the task
    await db.delete(TaskSchema).where(eq(TaskSchema.id, taskId));

    // Broadcast task deletion to WebSocket clients
    if (planner[0]) {
      try {
        broadcastTaskDeleted(taskId, planner[0].date, session.user.id);
      } catch (error) {
        console.warn("Failed to broadcast task deletion:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
