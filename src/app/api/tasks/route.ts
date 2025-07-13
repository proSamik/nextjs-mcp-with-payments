import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { TaskSchema, PlannerSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { TaskQuadrant, TaskDifficulty } from "@/types/planner";
import { broadcastTaskCreated } from "@/lib/websocket/server";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plannerId = searchParams.get("plannerId");

    if (!plannerId) {
      return NextResponse.json(
        { error: "Planner ID is required" },
        { status: 400 },
      );
    }

    const tasks = await db
      .select()
      .from(TaskSchema)
      .where(eq(TaskSchema.plannerId, plannerId))
      .orderBy(TaskSchema.priority);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      description,
      quadrant,
      priority = 0,
      timeRequired,
      timeBlock,
      difficulty,
      tags = [],
      plannerId,
    } = await request.json();

    if (!title || !quadrant || !plannerId) {
      return NextResponse.json(
        { error: "Title, quadrant, and planner ID are required" },
        { status: 400 },
      );
    }

    const task = await db
      .insert(TaskSchema)
      .values({
        nanoId: nanoid(8),
        title,
        description,
        quadrant: quadrant as TaskQuadrant,
        priority,
        timeRequired,
        timeBlock,
        difficulty: difficulty as TaskDifficulty,
        tags,
        plannerId,
        userId: session.user.id,
      })
      .returning();

    // Get planner info for broadcasting
    const planner = await db
      .select()
      .from(PlannerSchema)
      .where(eq(PlannerSchema.id, plannerId))
      .limit(1);

    // Broadcast task creation to WebSocket clients
    if (planner[0]) {
      try {
        const taskForBroadcast = {
          ...task[0],
          description: task[0].description || undefined,
          timeRequired: task[0].timeRequired || undefined,
          timeBlock: task[0].timeBlock || undefined,
          difficulty: (task[0].difficulty as TaskDifficulty) || undefined,
          tags: task[0].tags || [],
          quadrant: task[0].quadrant as TaskQuadrant,
        };
        broadcastTaskCreated(
          taskForBroadcast,
          planner[0].date,
          session.user.id,
        );
      } catch (error) {
        console.warn("Failed to broadcast task creation:", error);
      }
    }

    return NextResponse.json(task[0]);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
