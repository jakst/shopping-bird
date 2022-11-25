import { type FastifyReply } from "fastify";
import { runSyncWorker } from "./syncQueue";

export interface Client {
  id: string;
  reply: FastifyReply;
}

let clients: Client[] = [];

export function getClients() {
  return clients;
}

let syncInterval: ReturnType<typeof setInterval>;
export function createClient(id: Client["id"], reply: Client["reply"]) {
  clients.push({ id, reply });

  if (clients.length === 1) {
    syncInterval = setInterval(runSyncWorker, 60_000);
  }
}

export function removeClient(id: Client["id"]) {
  clients = clients.filter((client) => client.id !== id);

  if (clients.length < 1) {
    clearInterval(syncInterval);
  }
}
