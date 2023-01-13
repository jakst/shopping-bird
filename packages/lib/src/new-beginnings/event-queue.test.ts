import { expect, test } from "vitest";
import { EventQueue } from "./event-queue";
import { pause } from "./test-utils/pause";

test("Calls persistance function once per event push", () => {
  let count = 0;
  const queue = new EventQueue<string>([], () => count++);

  queue.push("1");
  queue.push("2");

  expect(count).toEqual(2);
});

test("Calls persistance function after processing finished", async () => {
  let count = 0;
  const queue = new EventQueue<string>([], () => count++);

  queue.push("1");
  queue.push("2");
  await queue.process(async () => {});

  expect(count).toEqual(3);
});

test("Inits queue with values", async () => {
  const queue = new EventQueue(["1", "2"], () => {});

  await queue.process(async (events) => {
    expect(events).toEqual(["1", "2"]);
  });
});

test("Does not process initial queue immediately", async () => {
  const queue = new EventQueue(["1", "2"], () => {});

  queue.push("3");

  await queue.process(async (events) => {
    expect(events).toEqual(["1", "2", "3"]);
  });
});

test("Does not process an empty queue", async () => {
  const queue = new EventQueue([], () => {});

  await queue.process(async () => {
    throw new Error("PROCESSED");
  });
});

test("Sends all queued events for processing", async () => {
  const queue = new EventQueue<string>([], () => {});

  queue.push("1");
  queue.push("2");

  await queue.process(async (events) => {
    expect(events).toEqual(["1", "2"]);
  });
});

test("Does not reprocess old events - simple case", async () => {
  const queue = new EventQueue<string>([], () => {});

  queue.push("1");

  await queue.process(async (events) => {
    expect(events).toEqual(["1"]);
  });

  queue.push("2");

  await queue.process(async (events) => {
    expect(events).toEqual(["2"]);
  });
});

test("Does not reprocess old events - race", async () => {
  const queue = new EventQueue<string>([], () => {});

  queue.push("1");

  const firstProcess = queue.process(async (events) => {
    // Processing number two starts before this finishes...
    await pause(1);
    expect(events).toEqual(["1"]);
  });

  queue.push("2");

  await queue.process(async (events) => {
    // ... but should not include the first event.
    expect(events).toEqual(["2"]);
  });

  await firstProcess;
});
