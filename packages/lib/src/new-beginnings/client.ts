import { ShoppingList } from "./lib";
import { ShoppinglistEvent, ShoppingListItem } from "./types";

export interface ClientServerConnection {
  connect(client: Client): void;
  disconnect(): void;
  pushEvents(events: ShoppinglistEvent[]): void;
}

interface ClientDeps {
  shoppingList: ShoppingList;
  serverConnection: ClientServerConnection;
}

export class Client {
  constructor(private $d: ClientDeps) {
    $d.serverConnection.connect(this);
  }

  applyEvent(event: ShoppinglistEvent) {
    // * Apply to local shoppingList
    this.$d.shoppingList.applyEvents([event]);

    // * Perist shoppinglist
    // * Apply to remote copy? (& persist)
    // * Queue event for syncing
  }

  onRemoteListChanged(newList: ShoppingListItem[]) {
    console.log(`onRemoteListChanged ${newList}`);

    // * Diff remote list against last version
    // * Generate events
    // * Apply events to local list
  }
}

// class AsyncProcessor {
//   #working = false
//   #queue: Promise<any>[] = []
//   enqueue() {}
// }
