# Dodaj nową twarz awatara

Przećwiczony przykład: dodanie twarzy **happy** do biblioteki awatarów. W przeciwieństwie do większości punktów rozszerzeń w tej dokumentacji nie ma tu typu, rejestru ani zmiany w backendzie: biblioteka znajduje swoje twarze w folderze, więc cała praca to jeden poprawnie przygotowany plik SVG i kontrola wzrokowa.

## Krok 1 — Utwórz plik SVG

File: `resources/js/assets/faces/happy.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" id="happy" viewBox="0 0 128 128"><circle cx="64" cy="64" r="58" fill="#f8dc25"></circle><circle cx="44" cy="52" r="7" fill="#4a3600"></circle><circle cx="84" cy="52" r="7" fill="#4a3600"></circle><path d="M36 76c6 20 50 20 56 0" fill="none" stroke="#4a3600" stroke-width="6" stroke-linecap="round"></path></svg>
```

Plik musi spełniać poniższe zasady, wszystkie wynikają ze sposobu, w jaki biblioteka go ładuje:

- **Kwadrat z `viewBox`** (istniejące twarze używają `0 0 128 128`). Twarz jest rysowana na płótnie 256 na 256, więc niekwadratowy viewBox zostałby rozciągnięty.
- **Samowystarczalny.** Bez `<script>`, bez zewnętrznych czcionek, bez `href`/`src` wskazujących na inne pliki. SVG jest ładowany przez `<img>` i adres blob, który blokuje zasoby zewnętrzne, więc wszystko, co od nich zależy, renderuje się pusto lub inaczej niż w siatce.
- **Koło wypełniające viewBox, bez niczego narysowanego w rogach.** Siatka pokazuje każdą twarz w okrągłym przycisku, a awatar jest wszędzie indziej wyświetlany w kole, więc grafika w rogach jest po prostu przycinana.
- **Nazwa pliku to nazwa twarzy.** Identyfikator to nazwa pliku bez `.svg` (`happy`) i staje się podpowiedzią przycisku oraz jego nazwą dostępną (`Use happy avatar`). Wybierz krótką, opisową nazwę małymi literami. Twarze są wypisywane alfabetycznie według ścieżki pliku.

## Krok 2 — Sprawdź, czy jest rozpoznawana po przeładowaniu

File: `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary.tsx`

Nie edytujesz tego pliku, ale to on odnajduje Twój SVG:

```tsx
const faceModules = import.meta.glob<string>('../../../assets/faces/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
});

const faces = Object.entries(faceModules)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => ({
        id: path.split('/').pop()!.replace('.svg', ''),
        src,
    }));
```

Vite rozwiązuje glob w czasie budowania, więc **nowy plik wymaga, by serwer deweloperski go zauważył** (zwykle tak się dzieje; jeśli nowa twarz się nie pojawia, zrestartuj `npm run dev` lub `make up`).

Gdy użytkownik wybiera twarz, `handleSelectFace` w `AccountSettingsProfileTab.tsx` rasteryzuje ją do PNG i wysyła przez `account.upload-avatar`. Po przeładowaniu strony biblioteka oznacza twarz bieżącego awatara, porównując piksele ze średnią tolerancją na kanał równą 2 (z 255), zdefiniowaną przez `MATCH_TOLERANCE` w `resources/js/utils/faces.ts`. Dwie twarze różniące się mniej niż to dopasowałyby się do tego samego awatara i wygrałaby pierwsza alfabetycznie. Najbliższa para twarz różni się dziś o ok. 5,5, więc nowa twarz powinna wyraźnie różnić się od każdej istniejącej (inna mina lub kolor wystarczą; zmiana koloru jednego małego szczegółu nie).

## Krok 3 — Zobacz to w aplikacji

Uruchom aplikację (`composer dev` lub `make up`), otwórz Ustawienia konta → Profil i kliknij awatar. Sprawdź:

1. Nowa twarz pojawia się w siatce, jest okrągła i ma podpowiedź z nazwą pliku.
2. Wybranie jej aktualizuje podgląd, zapisuje się bez alertu o błędzie i zamyka bibliotekę.
3. Przeładuj stronę i otwórz bibliotekę ponownie: ta sama twarz powinna mieć znaczek ptaszka. Jeśli żadna twarz nie jest oznaczona, przesłany PNG nie zgadza się ze zrasteryzowanym SVG, zwykle dlatego, że SVG polega na zasobie zewnętrznym lub nie jest kwadratem.

## Testy

Nowa twarz nie wymaga zmian w testach: istniejące testy nie zależą od liczby twarzy.

- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary.test.tsx` pokrywa dopasowanie bieżącego awatara i odzyskiwanie po nieudanym załadowaniu twarzy.
- `resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsProfileTab.test.tsx` pokrywa przywrócenie awatara, gdy zapis twarzy się nie powiedzie.
- `resources/js/utils/faces.test.ts` pokrywa `rasterizeImage`, `canvasToBlob` i `canvasesMatch`.

jsdom nie ma canvas, więc te testy mockują rasteryzację i dane pikseli. Dopasowanie pikseli prawdziwych SVG jest pokrywane wyłącznie ręczną kontrolą z kroku 3.
