import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { PlannerSchema, TaskSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Find or create planner for the date
    let planner = await db
      .select()
      .from(PlannerSchema)
      .where(
        and(
          eq(PlannerSchema.userId, session.user.id),
          eq(PlannerSchema.date, date),
        ),
      )
      .limit(1);

    if (planner.length === 0) {
      const newPlanner = await db
        .insert(PlannerSchema)
        .values({
          date,
          userId: session.user.id,
        })
        .returning();
      planner = newPlanner;
    }

    // Get tasks for the planner
    const tasks = await db
      .select()
      .from(TaskSchema)
      .where(eq(TaskSchema.plannerId, planner[0].id))
      .orderBy(TaskSchema.priority);

    return NextResponse.json({
      planner: planner[0],
      tasks,
    });
  } catch (error) {
    console.error("Error fetching planner:", error);
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

    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Create planner for the date
    const planner = await db
      .insert(PlannerSchema)
      .values({
        date,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json(planner[0]);
  } catch (error) {
    console.error("Error creating planner:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
