// Source: https://github.com/ai/nanoid/blob/4f5544255f3aba912c7662aca0434a4506953c5c/non-secure/index.js

const urlAlphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function createId(size = 21) {
  let id = "";
  let i = size;

  while (i--) {
    id += urlAlphabet[(Math.random() * 64) | 0];
  }

  return id;
}
