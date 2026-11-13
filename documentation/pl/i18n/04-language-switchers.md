# Przełączniki języka

Język zmieniają trzy miejsca; wszystkie przechodzą przez `hooks/useLanguage.ts` (`{ locale, locales, setLanguage }`), więc jedna zmiana widać wszędzie naraz i jest zapamiętana (`storeLocale()`).

| Gdzie | Kod |
|---|---|
| Menu użytkownika w pasku bocznym, podmenu „Języki" | `Organisms/Sidebar/Sidebar.tsx` - opcja `Dropdown` z `children` (ogólne podmenu: otwiera się kliknięciem, Enterem lub strzałką w prawo) |
| Ustawienia > Preferencje > Język | `AccountSettingsLanguageCard.tsx` - przycisk na język z jego flagą (`Atoms/LanguageFlag`), każdy jest przystankiem Tab, strzałki przenoszą fokus |
| Paleta poleceń > „Zmień język…" | `hooks/useGlobalCommands.ts` - komenda `language`, której `children()` wylistowuje komendy `language.<code>` (ten sam wzorzec co „Zmień status…" przy zgłoszeniu) |

Nowy język pojawia się we wszystkich trzech bez zmian poza listą w `utils/locale.ts` (i jego flagą), patrz [03](03-add-a-new-language.md).

Aby dodać czwarte miejsce, wywołaj `useLanguage()` i użyj `setLanguage(code)`; nigdy nie wołaj `setLocale` providera bezpośrednio, bo wybór nie zostanie zapamiętany dla serwera ani na następną wizytę.
