const isNode = true;

export let createId = (): string => {
  throw new Error("Module nanoid not loaded");
};

(isNode ? import("nanoid") : import("nanoid/non-secure")).then(
  (m) => (createId = m.nanoid),
);
