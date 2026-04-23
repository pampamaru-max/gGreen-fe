import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const fakeSelectionPluginKey = new PluginKey("fakeSelection");

export const fakeSelectionPlugin = new Plugin({
  key: fakeSelectionPluginKey,

  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, old) {
      const meta = tr.getMeta(fakeSelectionPluginKey);

      if (meta?.selection) {
        const { from, to } = meta.selection;

        return DecorationSet.create(tr.doc, [
          Decoration.inline(from, to, {
            class: "fake-selection",
          }),
        ]);
      }

      if (meta?.clear) {
        return DecorationSet.empty;
      }

      return old.map(tr.mapping, tr.doc);
    },
  },

  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});