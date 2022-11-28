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
  console.log(`${id} connection opened (${clients.length} total)`);

  if (clients.length === 1) {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(runSyncWorker, 60_000); // Every minute
  }
}

export function removeClient(id: Client["id"]) {
  clients = clients.filter((client) => client.id !== id);
  console.log(`${id} connection closed (${clients.length} total)`);

  if (clients.length < 1) {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(runSyncWorker, 60_000 * 10); // Every ten minutes
  }
}
