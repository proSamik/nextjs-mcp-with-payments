import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { TaskSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

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

    // Delete the task
    await db.delete(TaskSchema).where(eq(TaskSchema.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
