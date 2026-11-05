# Zwijanie i animacje zakładki ustawień

Każda zakładka ustawień wjeżdża z tą samą choreografią, a jej panele zwijają się z nagłówka, z wyborem zapamiętanym per przeglądarka. Całość dostarcza `SettingsLayout`; zakładka tylko się dołącza. Wszystko poniżej używa wspólnych tokenów ruchu z `resources/js/utils/motion.ts` i pierścienia fokusu z `resources/js/utils/focusRing.ts` (zob. [przewodnik Developer Portal](../developer-portal/README.md#ruch-i-dostępność)).

## Co layout robi już sam

Plik: `resources/js/Components/Organisms/SettingsLayout/SettingsLayout.tsx`

- Owija stronę w `<MotionConfig reducedMotion="user">`.
- Nagłówek, a potem panele zakładki, wjeżdżają jeden po drugim (`staggerParent` z dziećmi `riseIn`). Zakładka full-bleed wjeżdża raz, jako blok.
- Dostarcza `SettingsSectionsProvider` (`context/SettingsSectionsContext.tsx`) z kluczem `settings-sections:<tabId>`, który pamięta, które panele są zwinięte, i liczy te, które się dołączyły.
- Pokazuje `CollapseAllButton` obok nagłówka, gdy dwa lub więcej paneli da się zwinąć (nigdy dla zakładki full-bleed).

## Krok 1 — Nadaj każdemu panelowi id

```tsx
<SettingsPanel
    id="taxonomy"
    collapsedSummary={`${labels.length} labels`}
    title="Label taxonomy"
    icon="Tag"
>
    ...
</SettingsPanel>
```

- `id` czyni panel zwijalnym: unikalne w obrębie zakładki, stabilne, używane jako klucz zapisu. Bez niego panel pozostaje stały.
- `collapsedSummary` jest pokazywane w nagłówku, gdy panel jest zwinięty, więc zamknięty panel nadal coś mówi (liczbę, aktualny wybór).
- `defaultCollapsed` ustawia stan przy pierwszej wizycie. Używaj oszczędnie: strefa niebezpieczna lub usunięcie konta startują zwinięte (zob. `DangerZonePanel`, zakładka Security), większość paneli startuje otwarta.
- Treść zostaje zamontowana podczas zwinięcia (stan w środku przetrwa), ale jest `visibility: hidden`, poza kolejnością TAB. Panele we wspólnych molekułach (`DangerZonePanel`, `OwnershipPanel`, `InviteByEmailPanel`, `JoinWithCodePanel`, `PendingInvitationsPanel`, `ProjectPickerPanel`) mają już id, więc każda zakładka, która ich używa, je zwija.
- Panel, którego rodzic sam kontroluje zwijanie (`collapsed` + `onToggleCollapse`, jak Developer Portal), ignoruje id, a ekran, który animuje własne sekcje, wyłącza wjazd panelu przez `PanelRiseContext`.

## Krok 2 — Animuj wiersze

Wiersze wewnątrz zwijalnego panelu nie mogą odziedziczyć wjazdu strony (treść panelu animuje się otwierając i zamykając), więc startują same przez `RowReveal`:

```tsx
{labels.map((label, index) => (
    <RowReveal key={label.id} index={index} className="flex items-center gap-3 px-4 py-2.5">
        ...
    </RowReveal>
))}
```

Stagger jest ograniczony (dziesięć wierszy), więc długa lista się nie wlecze. Zachowaj stabilne klucze: zmiana kolejności przesuwa wtedy wiersze bez powtarzania wjazdu. Użyj `<Reveal key={selectedId}>`, gdy widok szczegółów ma wjechać ponownie przy zmianie wyboru (szczegóły roli, przepływ automatyzacji), `Collapse` z `unmountWhenClosed` dla czegoś, co otwiera się w wierszu (biblioteka awatarów), i `AnimatedNumber` dla liczb w `StatCard`.

## Krok 3 — Testy

- Renderuj zakładkę w `inSettingsPage(...)` z `resources/js/tests/settingsPanels.tsx` i wołaj `expectPanelsToFold([/Panel title/])`; ten helper zwija i rozwija każdy wskazany panel i sprawdza `aria-expanded`.
- W testach animacje przeskakują do stanu końcowego, ale stan, który ustala się przez animację (widoczność wiersza, podmieniana etykieta, odmontowywana treść), wymaga `findBy…` lub `waitFor`. Funkcja `play` story, która sprawdza `toBeVisible` na animowanym wierszu, robi to samo.
- Podsumowanie sprawdzaj przez `screen.getByTestId('collapsed-summary')`.

Poza zakresem: zakładki Export i Documents to wyłączone placeholdery; nadaj ich panelom id, gdy zostaną włączone.
