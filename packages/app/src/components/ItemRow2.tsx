import { Motion, Presence } from "@motionone/solid";

export function ItemRow2(props: { item: { id: string } }) {
  return (
    <Presence initial={false}>
      <Motion.li
        exit={{ opacity: 0, transition: { duration: 0.4 } }}
        class="flex px-1 items-center justify-between"
      >
        <div class="flex">
          <label class="p-3 h-10 aspect-square flex items-center justify-center">
            <input
              class="w-5 h-5 text-blue-600 bg-gray-100 rounded border-gray-300 "
              type="checkbox"
              checked={false}
              onChange={(event) => {}}
            />
          </label>

          <form
            class="flex"
            onSubmit={(event) => {
              event.preventDefault();
              (event.currentTarget[0] as HTMLInputElement)?.blur();
            }}
          >
            <input
              value={props.item.id}
              class={`focus:outline-none focus:underline border-slate-800${
                Math.random() > 1
                  ? " line-through text-gray-500"
                  : " text-gray-900"
              }`}
              onInput={(event) => {}}
            />
          </form>
        </div>
      </Motion.li>
    </Presence>
  );
}
