"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Task } from "@/types/planner";

interface WebSocketEvents {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (data: { taskId: string }) => void;
  onTasksReordered?: (tasks: Task[]) => void;
}

export function useWebSocket(
  userId: string | null,
  events: WebSocketEvents = {},
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const socket = io(
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_BETTER_AUTH_URL || ""
        : "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
      },
    );

    socketRef.current = socket;

    // Join user room
    socket.emit("join-user-room", userId);

    // Set up event listeners
    if (events.onTaskCreated) {
      socket.on("task:created", events.onTaskCreated);
    }

    if (events.onTaskUpdated) {
      socket.on("task:updated", events.onTaskUpdated);
    }

    if (events.onTaskDeleted) {
      socket.on("task:deleted", events.onTaskDeleted);
    }

    if (events.onTasksReordered) {
      socket.on("tasks:reordered", events.onTasksReordered);
    }

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, events]);

  // Join date-specific room
  const joinDateRoom = (date: string) => {
    if (socketRef.current && userId) {
      socketRef.current.emit("join-date-room", date, userId);
    }
  };

  return {
    socket: socketRef.current,
    joinDateRoom,
  };
}

export function useTaskWebSocket(
  userId: string | null,
  onTasksChange: (tasks: Task[]) => void,
) {
  const tasksRef = useRef<Task[]>([]);

  const updateTasks = (newTasks: Task[]) => {
    tasksRef.current = newTasks;
    onTasksChange(newTasks);
  };

  const { socket, joinDateRoom } = useWebSocket(userId, {
    onTaskCreated: (task: Task) => {
      const updatedTasks = [...tasksRef.current, task];
      updateTasks(updatedTasks);
    },

    onTaskUpdated: (updatedTask: Task) => {
      const updatedTasks = tasksRef.current.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      );
      updateTasks(updatedTasks);
    },

    onTaskDeleted: ({ taskId }) => {
      const updatedTasks = tasksRef.current.filter(
        (task) => task.id !== taskId,
      );
      updateTasks(updatedTasks);
    },

    onTasksReordered: (reorderedTasks: Task[]) => {
      updateTasks(reorderedTasks);
    },
  });

  // Update tasks reference when external tasks change
  const setTasks = (tasks: Task[]) => {
    tasksRef.current = tasks;
  };

  return {
    socket,
    joinDateRoom,
    setTasks,
  };
}
