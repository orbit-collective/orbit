# Dodaj nowe rozszerzenie Tiptap

Przećwiczony przykład: dodanie podświetlania tekstu (`@tiptap/extension-highlight`) do edytora opisu issue — rozszerzenie dziś niezainstalowane, na wzór dokładnego wzorca, jakiego już używa każde istniejące (`Image`, `Placeholder`, `TaskList`/`TaskItem`, `TableKit`).

## Krok 1 — Zainstaluj pakiet

```bash
npm install @tiptap/extension-highlight
```

Przypnij go do tego samego zakresu major/minor co pozostałe pakiety `@tiptap/*` już w `package.json` (`^3.x`) — rozszerzenia Tiptapa są wersjonowane razem, a mieszanie wersji major między rozszerzeniami używanymi przez tę samą instancję edytora jest niewspierane.

## Krok 2 — Dodaj je do listy rozszerzeń edytora

Plik: `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.tsx`

```tsx
import { EditableMarkdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useState } from 'react';
import { Markdown } from 'tiptap-markdown';

const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
    value,
    onSave,
    placeholder = 'Add a description...',
    disabled = false,
    className,
}) => {
    const [isEditing, setIsEditing] = useState(false);

    const editor = useEditor({
        editable: false,
        content: value || '',
        extensions: [
            StarterKit.configure({
                link: { openOnClick: false },
            }),
            Markdown.configure({ html: false }),
            Placeholder.configure({
                placeholder,
                showOnlyWhenEditable: false,
            }),
            TaskList,
            TaskItem.configure({ nested: true }),
            TableKit,
            Image,
            Highlight,
        ],
        editorProps: {
            attributes: {
                class: 'prose max-w-none text-sm focus:outline-none',
            },
        },
        onBlur: ({ editor }) => commit(editor),
    });

    // ...rest of the component is unchanged...
```

To cała integracja — rozszerzenia Tiptapa są samowystarczalne; dodanie jednego do tablicy to wszystko, co rejestruje jego komendy, dodatki do schematu i (konkretnie dla `Highlight`) jego skrót klawiszowy (`Ctrl+Shift+H` domyślnie) naraz. Żaden osobny przycisk paska narzędzi nie jest dziś podłączony nigdzie w tym edytorze (formatowanie dzieje się przez skróty typu Markdown podczas pisania i skróty klawiszowe, nie pasek przycisków), więc nowe rozszerzenie nie potrzebuje żadnego dodatkowego podłączenia UI, chyba że dodajesz też pasek narzędzi, którego jeszcze nie ma.

## Krok 3 — Potwierdź, że przeżywa rundę markdown

Rozszerzenie `Markdown` z `tiptap-markdown` to to, co faktycznie serializuje treść edytora do zwykłego tekstowego markdownu zapisywanego na backendzie (przez `editor.storage.markdown.getMarkdown()`, wywoływane z `commit()`) — nowe rozszerzenie mark/node zapisuje się i przywraca poprawnie tylko wtedy, gdy `tiptap-markdown` wie, jak je (de)serializować. Wyjście `Highlight` to standardowa składnia markdown `==podświetlony tekst==`, którą `tiptap-markdown` wspiera od razu; bardziej egzotyczne rozszerzenie (własny typ węzła bez standardowej reprezentacji markdown) może potrzebować własnych, jawnych reguł serializacji markdown — sprawdź własną dokumentację rozszerzenia po opcję `markdown`/`storage`, zanim założysz, że przechodzi rundę za darmo.

## Krok 4 — Ostyluj je, jeśli domyślne style nie pasują do motywu

Nowy typ treści renderowany przez `.prose` (zobacz nadpisania tokenów `--tw-prose-*` w `global.css`, już wskazujące każdy inny element markdown na [kolory motywu](../theme-colors/README.md)) może potrzebować własnej reguły, jeśli domyślne stylowanie `<mark>` Tiptapa koliduje z motywem dark/light — np.:

```css
.prose mark {
    background-color: var(--accent-color-opacity);
    color: inherit;
}
```

dodane do `resources/css/global.css` blisko istniejących reguł `.prose`/`.tiptap`, na wzór konwencji zmiennej CSS zamiast zakodowanego na sztywno koloru z [`../theme-colors/03-use-a-theme-color-in-a-component.md`](../theme-colors/03-use-a-theme-color-in-a-component.md).

## Testy

- `resources/js/Components/Molecules/EditableMarkdown/EditableMarkdown.test.tsx` — dodaj przypadek asercujący, że edytor poprawnie przechodzi rundę markdown `==highlighted==` (ustaw `value` na string zawierający to, asercuj, że `editor.storage.markdown.getMarkdown()` zwraca to bez zmian po cyklu edycji/blur bez efektu), na wzór kształtu konfiguracji istniejącego testu "committing on blur calls onSave when the markdown changed".
- Żadne zmiany testów backendu nie są potrzebne — zapisana kolumna to wciąż zwykły tekst; backend nie ma żadnego zdania na temat tego, jaką składnię markdown zawiera.
