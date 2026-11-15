import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion, SuggestionOptions } from '@tiptap/suggestion';

// The mention nodes each have a key of their own; one editor can't share one.
const pluginKey = new PluginKey('orbit-slash-commands');

export interface SlashCommandsOptions {
    suggestion: Partial<SuggestionOptions>;
}

/**
 * Opens the block menu when "/" is typed at the start of a line or after a
 * space. The list and what picking does are supplied by the editor component
 * (`useSlashCommands`) because they need React state.
 */
export const SlashCommands = Extension.create<SlashCommandsOptions>({
    name: 'slashCommands',

    addOptions() {
        return { suggestion: {} };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                pluginKey,
                char: '/',
                ...this.options.suggestion,
            }),
        ];
    },
});
