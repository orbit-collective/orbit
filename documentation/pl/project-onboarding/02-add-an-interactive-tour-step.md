# Dodaj interaktywny krok wycieczki

Przećwiczony przykład: krok wycieczki, który prosi użytkownika o samodzielne wypełnienie pola. Tak opcjonalny rozdział "utwórz swój pierwszy projekt" (`PROJECT_CHAPTER_STEPS` w `resources/js/types/Tour.ts`) uczy prawdziwego formularza "New project".

Na zwykłym kroku strona jest zablokowana, a strzałka przechodzi dalej. Na kroku **interaktywnym** podświetlony element pozostaje używalny — reszta strony wciąż jest zablokowana — a popup pokazuje podpowiedź, np. "Type a project name".

## Krok 1 — Oznacz elementy

Owiń każde pole (label + input) w element z `data-tour`. Dla kroków `input` wycieczka znajduje `<input>`/`<textarea>` wewnątrz opakowania, ustawia na nim fokus i odczytuje jego wartość.

Plik: `resources/js/Components/Organisms/NewProjectModal/NewProjectModal.tsx`

```tsx
<div data-tour="project-name" className="flex flex-col gap-1.5">
    <label>Project name</label>
    <Input value={data.name} onChange={...} />
</div>
```

## Krok 2 — Opisz interakcję

Plik: `resources/js/types/Tour.ts`

```ts
{
    id: 'project-name',
    target: 'project-name',
    placement: 'right',
    backTo: 'project-open',
    when: needsProjectChapter,
    title: 'Name it',
    description: 'Pick something your team will recognise.',
    interaction: {
        type: 'input',
        required: true,
        hint: 'Type a project name',
    },
},
```

`interaction.type` to jedno z:

- `click` — użytkownik klika cel; strzałka klika za niego. Wycieczka przechodzi dalej zaraz po kliknięciu. Dodaj `advance: 'external'` oraz `completeWhen`, aby czekać na coś innego — krok "Create project" przechodzi dalej dopiero, gdy współdzielony prop `hasProjects` stanie się `true`, więc błąd walidacji nie przeskoczy kroku.
- `input` — wpisywanie w polu wewnątrz celu. Z `required: true` strzałka jest wyłączona, dopóki pole nie ma wartości.
- `free` — użytkownik może dowolnie kliknąć cel (np. wybrać kolor); strzałka po prostu idzie dalej.

Krok wewnątrz formularza może też ustawić `completeWhen` i `skipTo`: jeśli formularz zostanie wysłany wcześniej (użytkownik naciśnie Enter przed krokiem z przyciskiem), wycieczka przeskakuje do `skipTo`, zamiast traktować zniknięty formularz jak zamknięty modal. Robią tak wszystkie kroki formularza "New project".

`backTo` wskazuje wcześniejszy krok, do którego należy wrócić, jeśli cel zniknie w trakcie kroku (np. użytkownik zamknął modal), dzięki czemu wycieczka nigdy nie utknie na kroku. Strzałka wstecz z takiego kroku zamyka też modal, w którym on żyje.

## Krok 3 — Umieść w rozdziale

Kroki w `PROJECT_CHAPTER_STEPS` używają `when: needsProjectChapter`, więc pojawiają się tylko dla kont bez projektu, które nie przeszły rozdziału. `TOUR_STEPS` wstawia rozdział przed krokiem końcowym; `getTourSteps()` podaje go samodzielnie kontom, które skończyły już główną wycieczkę.

Ustaw `sidebar: true` na krokach, których cel jest w sidebarze (otwiera panel na mobile), a pomiń je dla kroków wewnątrz modala.

## Warto wiedzieć

- Warstwy są ponad `Modal` (`z-[1000]`), na `z-[1100]`/`z-[1101]`.
- Escape jest ignorowany na krokach interaktywnych (należy do modala), a ←/→ są ignorowane podczas pisania, żeby kursor działał.
- Popup nie kradnie fokusa na krokach interaktywnych. Zamiast własnej pułapki popupu Tab krąży tylko po podświetlonym elemencie i kontrolkach wycieczki, więc zasłonięte pola są nieosiągalne z klawiatury.
- Cel jest raz przewijany do widoku na początku kroku interaktywnego, bo pole może być w oknie, a mimo to przycięte przez przewijany modal.

## Krok 4 — Przetestuj

- `resources/js/Components/Organisms/ProductTour/ProductTour.test.tsx` (`interactive steps`) — klik, input, `completeWhen`, `backTo`.
- `resources/js/types/Tour.test.ts` — jakie kroki dostaje każdy rodzaj konta i że każdy `backTo` wskazuje wcześniejszy krok.
