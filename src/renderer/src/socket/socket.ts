import {
  OrderCreatedPayload,
  OrderPaymentUpdatedPayload,
  SelectingChairPayload,
  TicketsCancelledPayload
} from "@shared/types";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let socketUrl = "";
let currentSocketToken: string | null = null;
type ManagedSocketEvent =
  | "orderPaymentUpdated"
  | "orderCreated"
  | "orderUpdated"
  | "ticketsCancelled"
  | "selecting_chair_update"
  | "connect";
type ManagedSocketHandlerMap = {
  orderPaymentUpdated: (data: OrderPaymentUpdatedPayload) => void;
  orderCreated: (data: OrderCreatedPayload) => void;
  orderUpdated: (data: OrderCreatedPayload) => void;
  ticketsCancelled: (data: TicketsCancelledPayload) => void;
  selecting_chair_update: (data: SelectingChairPayload) => void;
  connect: () => void;
};

const managedListeners: {
  [K in ManagedSocketEvent]: Set<ManagedSocketHandlerMap[K]>;
} = {
  orderPaymentUpdated: new Set(),
  orderCreated: new Set(),
  orderUpdated: new Set(),
  ticketsCancelled: new Set(),
  selecting_chair_update: new Set(),
  connect: new Set()
};

function attachManagedListener<K extends ManagedSocketEvent>(
  targetSocket: Socket,
  event: K,
  handler: ManagedSocketHandlerMap[K]
) {
  switch (event) {
    case "orderPaymentUpdated":
      targetSocket.on(
        "orderPaymentUpdated",
        handler as ManagedSocketHandlerMap["orderPaymentUpdated"]
      );
      break;
    case "orderCreated":
      targetSocket.on("orderCreated", handler as ManagedSocketHandlerMap["orderCreated"]);
      break;
    case "orderUpdated":
      targetSocket.on("orderUpdated", handler as ManagedSocketHandlerMap["orderUpdated"]);
      break;
    case "ticketsCancelled":
      targetSocket.on("ticketsCancelled", handler as ManagedSocketHandlerMap["ticketsCancelled"]);
      break;
    case "selecting_chair_update":
      targetSocket.on(
        "selecting_chair_update",
        handler as ManagedSocketHandlerMap["selecting_chair_update"]
      );
      break;
    case "connect":
      targetSocket.on("connect", handler as ManagedSocketHandlerMap["connect"]);
      break;
  }
}

function detachManagedListener<K extends ManagedSocketEvent>(
  targetSocket: Socket,
  event: K,
  handler: ManagedSocketHandlerMap[K]
) {
  switch (event) {
    case "orderPaymentUpdated":
      targetSocket.off(
        "orderPaymentUpdated",
        handler as ManagedSocketHandlerMap["orderPaymentUpdated"]
      );
      break;
    case "orderCreated":
      targetSocket.off("orderCreated", handler as ManagedSocketHandlerMap["orderCreated"]);
      break;
    case "orderUpdated":
      targetSocket.off("orderUpdated", handler as ManagedSocketHandlerMap["orderUpdated"]);
      break;
    case "ticketsCancelled":
      targetSocket.off("ticketsCancelled", handler as ManagedSocketHandlerMap["ticketsCancelled"]);
      break;
    case "selecting_chair_update":
      targetSocket.off(
        "selecting_chair_update",
        handler as ManagedSocketHandlerMap["selecting_chair_update"]
      );
      break;
    case "connect":
      targetSocket.off("connect", handler as ManagedSocketHandlerMap["connect"]);
      break;
  }
}

function bindManagedListeners(targetSocket: Socket) {
  (
    Object.entries(managedListeners) as Array<
      [ManagedSocketEvent, Set<ManagedSocketHandlerMap[ManagedSocketEvent]>]
    >
  ).forEach(([event, handlers]) => {
    handlers.forEach((handler) => {
      attachManagedListener(targetSocket, event, handler);
    });
  });
}

function subscribeManagedSocketEvent<K extends ManagedSocketEvent>(
  event: K,
  callback: ManagedSocketHandlerMap[K]
) {
  managedListeners[event].add(callback);
  if (socket) {
    attachManagedListener(socket, event, callback);
  }

  return () => {
    managedListeners[event].delete(callback);
    if (socket) {
      detachManagedListener(socket, event, callback);
    }
  };
}

export function initSocket(url: string) {
  socketUrl = `${url}/socket`;
}

export function connectSocket(token: string): Socket {
  if (!socketUrl) {
    throw new Error("Socket URL not initialized");
  }

  if (socket && currentSocketToken === token) return socket;

  if (socket && currentSocketToken !== token) {
    socket.disconnect();
    socket = null;
  }

  socket = io(socketUrl, {
    transports: ["websocket"],
    query: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity
  });
  currentSocketToken = token;
  bindManagedListeners(socket);

  socket.on("connect", () => {
    console.log("socket connected");
  });

  socket.on("disconnect", (reason) => {
    console.log("socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("socket error:", err.message);
  });

  socket.on("hello", function (data) {
    console.log("hello", data);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  currentSocketToken = null;
}

export function onOrderPaymentUpdated(callback: (data: OrderPaymentUpdatedPayload) => void) {
  return subscribeManagedSocketEvent("orderPaymentUpdated", callback);
}

export function onOrderCreated(callback: (data: OrderCreatedPayload) => void) {
  return subscribeManagedSocketEvent("orderCreated", callback);
}

export function onOrderUpdated(callback: (data: OrderCreatedPayload) => void) {
  return subscribeManagedSocketEvent("orderUpdated", callback);
}

export function onSelectingChairsUpdate(callback: (data: SelectingChairPayload) => void) {
  return subscribeManagedSocketEvent("selecting_chair_update", callback);
}

export function onTicketsCancelled(callback: (data: TicketsCancelledPayload) => void) {
  return subscribeManagedSocketEvent("ticketsCancelled", callback);
}

export function onSocketConnect(callback: () => void) {
  return subscribeManagedSocketEvent("connect", callback);
}
