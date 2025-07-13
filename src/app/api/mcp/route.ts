import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { pgDb as db } from "@/lib/db/pg/db.pg";
import { TaskSchema, PlannerSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  broadcastTaskCreated,
  broadcastTaskUpdated,
  broadcastTaskDeleted,
} from "@/lib/websocket/server";

/**
 * Get today's date and time information for the caller's timezone.
 */
async function getTodaysDate(args: { timezone?: string }) {
  try {
    const { timezone } = args;
    const now = new Date();

    // Use provided timezone or default to UTC
    const timeZone = timezone || "UTC";

    // Format date in various useful formats
    const dateInfo = {
      iso: now.toISOString(),
      date: now.toISOString().split("T")[0], // YYYY-MM-DD format
      time: now.toISOString().split("T")[1].split(".")[0], // HH:MM:SS format
      timestamp: now.getTime(),
      timezone: timeZone,
      localDate: timezone
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(now)
        : now.toISOString().split("T")[0],
      localTime: timezone
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).format(now)
        : now.toISOString().split("T")[1].split(".")[0],
      localDateTime: timezone
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
            .format(now)
            .replace(", ", " ")
        : now.toISOString().replace("T", " ").split(".")[0],
      weekday: timezone
        ? new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            weekday: "long",
          }).format(now)
        : new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now),
      month: timezone
        ? new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            month: "long",
          }).format(now)
        : new Intl.DateTimeFormat("en-US", { month: "long" }).format(now),
    };

    return {
      content: [
        {
          type: "text",
          text: `Current date and time information:\n\n${JSON.stringify(dateInfo, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * List all tasks for a specific date for the authenticated user.
 */
async function listTasks(args: { date: string }, userId: string) {
  try {
    const { date } = args;
    const tasks = await db
      .select({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
        title: TaskSchema.title,
        description: TaskSchema.description,
        isCompleted: TaskSchema.isCompleted,
        quadrant: TaskSchema.quadrant,
        priority: TaskSchema.priority,
        timeRequired: TaskSchema.timeRequired,
        timeBlock: TaskSchema.timeBlock,
        difficulty: TaskSchema.difficulty,
        tags: TaskSchema.tags,
        createdAt: TaskSchema.createdAt,
        updatedAt: TaskSchema.updatedAt,
      })
      .from(TaskSchema)
      .innerJoin(PlannerSchema, eq(TaskSchema.plannerId, PlannerSchema.id))
      .where(and(eq(TaskSchema.userId, userId), eq(PlannerSchema.date, date)))
      .orderBy(TaskSchema.priority);

    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} tasks for ${date}:\n\n${JSON.stringify(tasks, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create a new task for the authenticated user and date.
 */
async function createTask(args: any, userId: string) {
  try {
    const {
      date,
      title,
      description,
      quadrant,
      priority,
      timeRequired,
      timeBlock,
      difficulty,
      tags,
    } = args;

    // Get or create planner for the date
    let [planner] = await db
      .select()
      .from(PlannerSchema)
      .where(
        and(eq(PlannerSchema.userId, userId), eq(PlannerSchema.date, date)),
      );

    if (!planner) {
      [planner] = await db
        .insert(PlannerSchema)
        .values({
          date,
          userId,
        })
        .returning();
    }

    const [newTask] = await db
      .insert(TaskSchema)
      .values({
        nanoId: nanoid(8),
        title,
        description,
        quadrant,
        priority: priority || 0,
        timeRequired,
        timeBlock,
        difficulty,
        tags: tags || [],
        plannerId: planner.id,
        userId,
      })
      .returning({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
        title: TaskSchema.title,
        description: TaskSchema.description,
        isCompleted: TaskSchema.isCompleted,
        quadrant: TaskSchema.quadrant,
        priority: TaskSchema.priority,
        timeRequired: TaskSchema.timeRequired,
        timeBlock: TaskSchema.timeBlock,
        difficulty: TaskSchema.difficulty,
        tags: TaskSchema.tags,
        plannerId: TaskSchema.plannerId,
        userId: TaskSchema.userId,
        createdAt: TaskSchema.createdAt,
        updatedAt: TaskSchema.updatedAt,
      });

    // Broadcast task creation to WebSocket clients
    try {
      broadcastTaskCreated(newTask as any, date, userId);
    } catch (error) {
      console.warn("Failed to broadcast task creation:", error);
    }

    return {
      content: [
        {
          type: "text",
          text: `Task created successfully!\n\n${JSON.stringify(newTask, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Edit an existing task for the authenticated user.
 */
async function editTask(args: any, userId: string) {
  try {
    const { nanoId, updates } = args;

    // Find the task by nanoId
    const [task] = await db
      .select({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
      })
      .from(TaskSchema)
      .where(and(eq(TaskSchema.userId, userId), eq(TaskSchema.nanoId, nanoId)))
      .limit(1);

    if (!task) {
      throw new Error(`Task with nanoId "${nanoId}" not found`);
    }

    const [updatedTask] = await db
      .update(TaskSchema)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(TaskSchema.id, task.id))
      .returning({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
        title: TaskSchema.title,
        description: TaskSchema.description,
        isCompleted: TaskSchema.isCompleted,
        quadrant: TaskSchema.quadrant,
        priority: TaskSchema.priority,
        timeRequired: TaskSchema.timeRequired,
        timeBlock: TaskSchema.timeBlock,
        difficulty: TaskSchema.difficulty,
        tags: TaskSchema.tags,
        plannerId: TaskSchema.plannerId,
        userId: TaskSchema.userId,
        createdAt: TaskSchema.createdAt,
        updatedAt: TaskSchema.updatedAt,
      });

    // Get the date for broadcasting by finding the planner
    const [plannerInfo] = await db
      .select({ date: PlannerSchema.date })
      .from(PlannerSchema)
      .where(eq(PlannerSchema.id, updatedTask.plannerId))
      .limit(1);

    // Broadcast task update to WebSocket clients
    try {
      if (plannerInfo) {
        broadcastTaskUpdated(updatedTask as any, plannerInfo.date, userId);
      }
    } catch (error) {
      console.warn("Failed to broadcast task update:", error);
    }

    return {
      content: [
        {
          type: "text",
          text: `Task "${nanoId}" updated successfully!\n\n${JSON.stringify(updatedTask, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Delete a task for the authenticated user.
 */
async function deleteTask(args: any, userId: string) {
  try {
    const { nanoId } = args;

    // Find the task by nanoId
    const [task] = await db
      .select({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
      })
      .from(TaskSchema)
      .where(and(eq(TaskSchema.userId, userId), eq(TaskSchema.nanoId, nanoId)))
      .limit(1);

    if (!task) {
      throw new Error(`Task with nanoId "${nanoId}" not found`);
    }

    // Get planner info before deleting for broadcasting
    const [plannerInfo] = await db
      .select({ date: PlannerSchema.date })
      .from(TaskSchema)
      .innerJoin(PlannerSchema, eq(TaskSchema.plannerId, PlannerSchema.id))
      .where(eq(TaskSchema.id, task.id))
      .limit(1);

    await db.delete(TaskSchema).where(eq(TaskSchema.id, task.id));

    // Broadcast task deletion to WebSocket clients
    try {
      if (plannerInfo) {
        broadcastTaskDeleted(task.id, plannerInfo.date, userId);
      }
    } catch (error) {
      console.warn("Failed to broadcast task deletion:", error);
    }

    return {
      content: [
        {
          type: "text",
          text: `Task "${nanoId}" deleted successfully!`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Mark a task as complete/incomplete for the authenticated user.
 */
async function markTaskComplete(args: any, userId: string) {
  try {
    const { nanoId, completed = true } = args;

    // Find the task by nanoId
    const [task] = await db
      .select({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
      })
      .from(TaskSchema)
      .where(and(eq(TaskSchema.userId, userId), eq(TaskSchema.nanoId, nanoId)))
      .limit(1);

    if (!task) {
      throw new Error(`Task with nanoId "${nanoId}" not found`);
    }

    const [updatedTask] = await db
      .update(TaskSchema)
      .set({
        isCompleted: completed,
        updatedAt: new Date(),
      })
      .where(eq(TaskSchema.id, task.id))
      .returning({
        id: TaskSchema.id,
        nanoId: TaskSchema.nanoId,
        title: TaskSchema.title,
        description: TaskSchema.description,
        isCompleted: TaskSchema.isCompleted,
        quadrant: TaskSchema.quadrant,
        priority: TaskSchema.priority,
        timeRequired: TaskSchema.timeRequired,
        timeBlock: TaskSchema.timeBlock,
        difficulty: TaskSchema.difficulty,
        tags: TaskSchema.tags,
        plannerId: TaskSchema.plannerId,
        userId: TaskSchema.userId,
        createdAt: TaskSchema.createdAt,
        updatedAt: TaskSchema.updatedAt,
      });

    // Get the date for broadcasting by finding the planner
    const [plannerInfo] = await db
      .select({ date: PlannerSchema.date })
      .from(PlannerSchema)
      .where(eq(PlannerSchema.id, updatedTask.plannerId))
      .limit(1);

    // Broadcast task update to WebSocket clients
    try {
      if (plannerInfo) {
        broadcastTaskUpdated(updatedTask as any, plannerInfo.date, userId);
      }
    } catch (error) {
      console.warn("Failed to broadcast task update:", error);
    }

    return {
      content: [
        {
          type: "text",
          text: `Task "${nanoId}" marked as ${completed ? "completed" : "incomplete"} successfully!\n\n${JSON.stringify(updatedTask, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Authenticate API requests using Bearer token and return user info.
 * @param request Next.js request object
 * @returns user object or null
 */
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const user = await validateApiKey(token);
  if (!user) return null;
  return user;
}

/**
 * POST handler for direct JSON-RPC requests
 * Handles MCP methods directly without transport layer to avoid compatibility issues.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message:
              "Authentication required: Please provide a valid API key in Authorization header",
          },
          id: null,
        },
        { status: 401 },
      );
    }

    // Parse the JSON-RPC request
    const body = await request.json();
    const { method, params, id } = body;

    // Debug logging
    console.log(`MCP Request: ${method}`, {
      method,
      params,
      id,
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Handle MCP protocol methods directly
    switch (method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            protocolVersion: params.protocolVersion || "2025-06-18",
            capabilities: {
              tools: {},
              prompts: {},
              resources: {},
              logging: {},
            },
            serverInfo: {
              name: "task-planner-mcp-server",
              version: "1.0.0",
            },
          },
          id,
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          result: {
            tools: [
              {
                name: "todays_date",
                description:
                  "Get current date and time information in caller's timezone",
                inputSchema: {
                  type: "object",
                  properties: {
                    timezone: {
                      type: "string",
                      description:
                        "IANA timezone name (e.g., 'America/New_York', 'Europe/London'). Defaults to UTC if not provided.",
                    },
                  },
                  required: [],
                },
              },
              {
                name: "list_tasks",
                description:
                  "List all tasks for a specific date (authenticated user)",
                inputSchema: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Date in YYYY-MM-DD format",
                    },
                  },
                  required: ["date"],
                },
              },
              {
                name: "create_task",
                description:
                  "Create a new task for a specific date (authenticated user)",
                inputSchema: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Date in YYYY-MM-DD format",
                    },
                    title: { type: "string", description: "Task title" },
                    description: {
                      type: "string",
                      description: "Task description",
                    },
                    quadrant: {
                      type: "string",
                      enum: [
                        "urgent-important",
                        "urgent-not-important",
                        "not-urgent-important",
                        "not-urgent-not-important",
                      ],
                      description: "Task quadrant in Eisenhower Matrix",
                    },
                    priority: {
                      type: "number",
                      description: "Priority order within quadrant",
                    },
                    timeRequired: {
                      type: "string",
                      description: 'Estimated time required (e.g., "2 hours")',
                    },
                    timeBlock: {
                      type: "string",
                      description: 'Planned time block (e.g., "3-5 PM")',
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "Task difficulty level",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Task tags",
                    },
                  },
                  required: ["date", "title", "quadrant"],
                },
              },
              {
                name: "edit_task",
                description:
                  "Edit an existing task by nanoId (authenticated user)",
                inputSchema: {
                  type: "object",
                  properties: {
                    nanoId: {
                      type: "string",
                      description: "Unique nanoId of the task to edit",
                    },
                    updates: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        quadrant: {
                          type: "string",
                          enum: [
                            "urgent-important",
                            "urgent-not-important",
                            "not-urgent-important",
                            "not-urgent-not-important",
                          ],
                        },
                        priority: { type: "number" },
                        timeRequired: { type: "string" },
                        timeBlock: { type: "string" },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "medium", "hard"],
                        },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      description: "Fields to update",
                    },
                  },
                  required: ["nanoId", "updates"],
                },
              },
              {
                name: "delete_task",
                description: "Delete a task by nanoId (authenticated user)",
                inputSchema: {
                  type: "object",
                  properties: {
                    nanoId: {
                      type: "string",
                      description: "Unique nanoId of the task to delete",
                    },
                  },
                  required: ["nanoId"],
                },
              },
              {
                name: "mark_task_complete",
                description:
                  "Mark a task as completed by nanoId (authenticated user)",
                inputSchema: {
                  type: "object",
                  properties: {
                    nanoId: {
                      type: "string",
                      description:
                        "Unique nanoId of the task to mark as complete",
                    },
                    completed: {
                      type: "boolean",
                      description: "Whether to mark as completed or incomplete",
                      default: true,
                    },
                  },
                  required: ["nanoId"],
                },
              },
            ],
          },
          id,
        });

      case "tools/call":
        try {
          const { name: toolName, arguments: toolArgs } = params;

          // Execute tools directly based on their name
          let result;
          switch (toolName) {
            case "todays_date":
              result = await getTodaysDate(toolArgs);
              break;
            case "list_tasks":
              result = await listTasks(toolArgs, user.userId);
              break;
            case "create_task":
              result = await createTask(toolArgs, user.userId);
              break;
            case "edit_task":
              result = await editTask(toolArgs, user.userId);
              break;
            case "delete_task":
              result = await deleteTask(toolArgs, user.userId);
              break;
            case "mark_task_complete":
              result = await markTaskComplete(toolArgs, user.userId);
              break;
            default:
              throw new Error(`Tool ${toolName} not found`);
          }

          return NextResponse.json({
            jsonrpc: "2.0",
            result,
            id,
          });
        } catch (error) {
          return NextResponse.json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message:
                error instanceof Error
                  ? error.message
                  : "Tool execution failed",
            },
            id,
          });
        }

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: `Method ${method} not found`,
          },
          id,
        });
    }
  } catch (error) {
    console.error("MCP POST request error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler for Streamable HTTP transport - establishes SSE stream
 * Required by MCP Inspector and other clients using Streamable HTTP
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required: Please provide a valid API key in Authorization header",
        },
        { status: 401 },
      );
    }

    // Check if client accepts Server-Sent Events
    const acceptHeader = request.headers.get("accept") || "";
    if (!acceptHeader.includes("text/event-stream")) {
      return new NextResponse("Method Not Allowed", { status: 405 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const encoder = new TextEncoder();
        const data = `data: ${JSON.stringify({
          type: "connection",
          timestamp: new Date().toISOString(),
          sessionId: crypto.randomUUID(),
        })}\n\n`;
        controller.enqueue(encoder.encode(data));
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, Accept, Mcp-Session-Id",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      },
    });
  } catch (error) {
    console.error("MCP GET request error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(_: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, Mcp-Session-Id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    },
  });
}
