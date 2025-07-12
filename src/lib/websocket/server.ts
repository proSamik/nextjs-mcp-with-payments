import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Task } from "@/types/planner";

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HttpServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.BETTER_AUTH_URL
          : "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user-specific room for updates
    socket.on("join-user-room", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined room`);
    });

    // Join date-specific room for planner updates
    socket.on("join-date-room", (date: string, userId: string) => {
      socket.join(`planner:${date}:${userId}`);
      console.log(`User ${userId} joined planner room for ${date}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("WebSocket server not initialized");
  }
  return io;
}

// Broadcast task creation to all users in the planner room
export function broadcastTaskCreated(task: Task, date: string, userId: string) {
  if (!io) return;

  io.to(`planner:${date}:${userId}`).emit("task:created", task);
}

// Broadcast task update to all users in the planner room
export function broadcastTaskUpdated(task: Task, date: string, userId: string) {
  if (!io) return;

  io.to(`planner:${date}:${userId}`).emit("task:updated", task);
}

// Broadcast task deletion to all users in the planner room
export function broadcastTaskDeleted(
  taskId: string,
  date: string,
  userId: string,
) {
  if (!io) return;

  io.to(`planner:${date}:${userId}`).emit("task:deleted", { taskId });
}

// Broadcast task reorder to all users in the planner room
export function broadcastTasksReordered(
  tasks: Task[],
  date: string,
  userId: string,
) {
  if (!io) return;

  io.to(`planner:${date}:${userId}`).emit("tasks:reordered", tasks);
}
