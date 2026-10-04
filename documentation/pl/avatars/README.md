# Awatary

Awatar użytkownika to pojedynczy obraz wyświetlany w całym Orbit (pasek boczny, komentarze, wiersze zadań, podgląd na żywo w Ustawienia konta → Profil). Pochodzi z jednego z dwóch miejsc: **zdjęcia przesłanego przez użytkownika** albo twarzy wybranej z **biblioteki awatarów**, czyli niewielkiego zestawu gotowych twarzy SVG pokazywanego pod wierszem "Zdjęcie profilowe" po kliknięciu awatara lub "Choose from library". Ta kategoria dokumentuje bibliotekę i sposób dodawania do niej twarzy.

## Przewodniki, w kolejności, w jakiej faktycznie będą potrzebne

1. **[Dodaj nową twarz awatara](./01-add-a-new-avatar-face.md)** — przećwiczony przykład dodania twarzy `happy`: gdzie trafia plik SVG, jak musi wyglądać i dlaczego nic więcej nie wymaga zmian (brak rejestru, brak pracy po stronie backendu).

## Architektura w jednym akapicie

Twarze to zwykłe pliki SVG w `resources/js/assets/faces/`. `AccountSettingsAvatarLibrary` (`resources/js/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary.tsx`) zbiera je przez `import.meta.glob('../../../assets/faces/*.svg', { eager: true, query: '?url', import: 'default' })`, więc dodanie pliku to cały krok rejestracji. Serwer **nie zna pojęcia twarzy z biblioteki**: `UserController::uploadAvatar` przyjmuje tylko JPEG, PNG lub GIF (`mimes:jpeg,png,gif`, maks. 5 MB) i zapisuje wynik pod haszowaną nazwą pliku, więc wybrany SVG jest rasteryzowany w przeglądarce do PNG 256px (`rasterizeImage` i `canvasToBlob` w `resources/js/utils/faces.ts`) i wysyłany zwykłą trasą `account.upload-avatar` jak każde inne zdjęcie, wraz z kontrolą NSFW. Ponieważ zapisany plik nie zapamiętuje, skąd pochodzi, biblioteka ustala po załadowaniu strony, która twarz jest aktualnym awatarem, rasteryzując awatar i każdą twarz i porównując piksele (`canvasesMatch`). Dlatego nowa twarz musi wyraźnie różnić się od istniejących, co omawia przewodnik 1.
