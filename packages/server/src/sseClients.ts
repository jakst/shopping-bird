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

function setWorkerInterval(interval: number) {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    console.log("Shopping list sync triggered by schedule");
    runSyncWorker();
  }, interval);
}

export function createClient(id: Client["id"], reply: Client["reply"]) {
  clients.push({ id, reply });
  console.log(`${id} connection opened (${clients.length} total)`);

  if (clients.length >= 1) {
    runSyncWorker(); // Run once when client connects...
    setWorkerInterval(60_000); // ... then every minute
  }
}

export function removeClient(id: Client["id"]) {
  clients = clients.filter((client) => client.id !== id);
  console.log(`${id} connection closed (${clients.length} total)`);

  if (clients.length < 1) {
    setWorkerInterval(10 * 60_000); // Every ten minutes
  }
}
