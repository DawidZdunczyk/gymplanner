<!-- IMPL-REVIEW-REPORT -->

# Przegląd backendu: pełny przepływ treningu MVP

- **Plan**: `context/changes/training-mvp-cycle/plan.md`
- **Zakres**: faza 1 — SQL, RLS, RPC, adapter odczytu, endpoint JSON, testy lokalnej bazy; odczyt integracji SSR.
- **Data**: 2026-09-14
- **Werdykt**: APPROVED dla backendu przy opisanych ograniczeniach skali i komentarzy.
- **Otwarte ustalenia**: 0 krytycznych, 1 ostrzeżenie, 1 obserwacja.
- **Granica**: ten przegląd nie potwierdza kompletności interakcji UI, końcowego buildu ani wdrożenia. Koordynator weryfikuje je osobno.

## Werdykty

| Wymiar                    | Werdykt                          |
| ------------------------- | -------------------------------- |
| Zgodność z planem         | PASS                             |
| Dyscyplina zakresu        | PASS                             |
| Bezpieczeństwo i jakość   | WARNING — limit odczytu historii |
| Architektura              | PASS                             |
| Spójność wzorców          | PASS                             |
| Kryteria sukcesu backendu | PASS                             |

## Ustalenia i decyzje

### F1 — Lista historii dziedziczy limit odpowiedzi Supabase

- **Ważność**: WARNING.
- **Wpływ**: MEDIUM — docelowa paginacja wymaga spójnego kontraktu list i interfejsu.
- **Wymiar**: Bezpieczeństwo i jakość / niezawodność.
- **Lokalizacja**: `src/lib/training.ts:33`, `supabase/config.toml` (`max_rows = 1000`).
- **Szczegóły**: `getTrainingOverview()` wykonuje po jednym odczycie planów i treningów. Przy przekroczeniu limitu odpowiedzi część historii nie trafi do widoku, chociaż pozostanie w bazie. To ograniczenie listy, nie utrata ani udostępnienie danych. Szczegół treningu odczytuje sam trening bezpośrednio, ale odnajduje plan przez overview.
- **Naprawa**: w kolejnym rozszerzeniu wprowadzić paginację lub filtrowanie zakresu tygodni po stronie serwera wraz z nawigacją UI; szczegół planu pobierać po ID.
- **Decyzja**: ACCEPTED jako jawne ograniczenie skali tej iteracji; koordynator polecił pozostawić je w raporcie, bez rozszerzania bieżącego zakresu.

### F2 — Komentarz stosuje ostatni zapis autora

- **Ważność**: OBSERVATION.
- **Wpływ**: LOW — zachowanie zgodne z przyjętym kontraktem.
- **Wymiar**: Architektura / niezawodność.
- **Lokalizacja**: `supabase/migrations/20260914203000_training_cycle.sql:274`.
- **Szczegóły**: `save_comment` nie przyjmuje wersji. Dwa okna tego samego podopiecznego mogą nadpisać treść oraz widoczność komentarza; ostatni jawny zapis wygrywa. Blokada treningu serializuje transakcje, ale nie wykrywa nieaktualnego formularza komentarza. RLS nadal respektuje aktualnie zapisaną widoczność. Inny autor ani trener nie może wykonać zapisu.
- **Opcjonalna poprawa**: przy rozszerzeniu kontraktu dodać wersję komentarza lub oczekiwane `updated_at` i obsługę konfliktu w UI.
- **Decyzja**: ACCEPTED — zgodne z kontraktem tej iteracji; bez dodawania mechanizmu wersji komentarza.

### F3 — Pusty rodzaj celu treningowego

- **Ważność przed poprawką**: WARNING.
- **Wpływ**: LOW — jednoznaczna poprawka walidatora.
- **Wymiar**: Bezpieczeństwo i jakość / spójność danych.
- **Lokalizacja**: `supabase/migrations/20260914203000_training_cycle.sql:112`.
- **Szczegóły**: sprawdzanie `kind NOT IN (...)` w PL/pgSQL nie odrzucało SQL NULL powstającego z JSON `kind: null`. Cel z równymi granicami mógł przejść dalszą walidację. Nie dawało to dostępu do cudzych danych, lecz dopuszczało dane spoza kontraktu do własnego planu.
- **Naprawa**: warunek `(kind IN (...)) IS DISTINCT FROM TRUE` odrzuca również NULL.
- **Decyzja**: FIXED. Poprawka jest w migracji i lokalnej bazie. Końcowa regresja bezpośredniego RPC zmienia wyłącznie `kind` poprawnego celu stałego z równymi granicami; pełna grupa ćwiczeń pozostaje poprawna. Korektę wyroczni testowej opisuje F4.

### F4 — Testy odrzucenia rozpiski miały dodatkowy powód błędu

- **Ważność przed poprawką**: WARNING.
- **Wpływ**: LOW — korekta danych testowych.
- **Wymiar**: Kryteria sukcesu / wiarygodność testów.
- **Lokalizacja**: `scripts/training-checks.mjs`, przypadki nieprawidłowych rozpisek.
- **Szczegóły**: wcześniejsze przypadki zastępowały listę ćwiczeń pojedynczym elementem i pozostawiały superserię wymagającą dwóch członków. Odrzucenie takiej rozpiski nie dowodziło działania badanego walidatora. Dodatkowo regresja `kind: null` musi używać równych granic celu — zwykły zakres z nierównymi granicami nie ujawnia pierwotnej luki.
- **Naprawa**: sprawdzić sukces pełnej poprawnej rozpiski bazowej, a następnie dla każdego przypadku klonować ją i zmieniać dokładnie jeden warunek. Nieznaną grupę przypisywać ćwiczeniu spoza superserii; duplikować identyfikator istniejącego ćwiczenia bez usuwania członków grupy. Każda asercja nazywa badany przypadek.
- **Decyzja**: FIXED. Przypadki obejmują również brak wymaganego pola. Dodano oddzielny dowód FR-004: jednostka tego samego planu w kolejnym tygodniu zachowuje pełny rekord, w tym rozpiskę i wersję, po edycji i usunięciu jednostki bieżącego tygodnia.

## Sprawdzone granice bezpieczeństwa

- RLS planów i treningów wymaga aktualnej pary trener–podopieczny w `trainer_assignments`. Odebranie i zmiana przypisania działa także dla istniejących JWT. Nowy trener nie otrzymuje automatycznie danych starej relacji.
- Tabele mają odebrane INSERT, UPDATE i DELETE zwykłym rolom. RPC ma odebrane wykonanie PUBLIC i anon; wykonanie otrzymuje tylko authenticated. Pomocniki są w nieudostępnionym schemacie `training_private`, bez uprawnień dla zwykłych ról.
- `SECURITY DEFINER` używa pustego `search_path`, jawnych schematów, `auth.uid()` i statycznego SQL. Nie ma dynamicznego SQL, klienta service-role w aplikacji ani zaufania do edytowalnych metadanych konta.
- RPC blokuje trening `FOR UPDATE`, sprawdza autora działania i aktualne przypisanie `FOR SHARE`, a następnie wersję oraz stan. Odebranie przypisania jest serializowane z trwającym zapisem. Po zakończonej zmianie przypisania kolejne zapisy są odrzucane.
- Walidacja SQL wymaga dokładnych zestawów kluczy JSON i ich typów; odrzuca nieznane lub brakujące pola, powtórzone identyfikatory ćwiczeń/grup, nieznane grupy, błędne zakresy oraz liczby poza granicami. `require_valid` odrzuca zarówno false, jak i SQL NULL.
- Każda seria wyniku ma jawny status i ograniczone wartości liczbowe. Zakończenie wymaga rozgrzewki, wszystkich ćwiczeń, ocen oraz wymaganych wyników wykonanych serii. Pominięte ćwiczenie może mieć `rating: null` i pustą listę serii. Odchylenia od celu nie blokują zakończenia.
- Rozpoczęcie atomowo kopiuje rozpiskę do snapshotu. Edycja/usunięcie przez trenera po rozpoczęciu są odrzucane. Korekta zmienia wykonanie i `corrected_at`, zachowując snapshot oraz pierwotny czas zakończenia.
- Zamiennik ćwiczenia z superserii ma własne parametry i wyniki. Wymagane są nazwa, serie, powtórzenia, ocena oraz RIR lub RPE; `group_id` zamiennika jest null. Oryginalne ćwiczenie i układ superserii pozostają w snapshotcie.
- Prywatne komentarze są filtrowane w RLS przed SSR i serializacją komponentów. Trener ma dodatkowy filtr publicznych komentarzy w widoku wyników.
- Endpoint wymaga sesji, zgodnego Origin i JSON; odczytuje strumień do maksymalnie 256 KiB. Błędy klienta, stanu i dostępu mają osobne odpowiedzi. Nieznane błędy bazy dają 503 bez szczegółów infrastruktury.
- Adaptery nie używają pustej listy jako zamiennika błędu bazy. SSR rozróżnia 404 i 503; dane pochodzą z klienta bieżącej sesji, więc filtry interfejsu nie stanowią granicy autoryzacji.

## Dowody weryfikacji

Polecenia wykonano z Node 22.22.3:

```text
node scripts/local-training.mjs
Training DB checks passed: CRUD, JSON validation, RLS, direct-write denial, version race, snapshot, completion, supersets, target deviations, corrections, private comments, expiry and revocation.

npx --no-install eslint src/lib/training.ts src/pages/api/training.ts src/types/database.ts scripts/training-checks.mjs scripts/local-training.mjs
exit 0

git diff --check -- src/lib/training.ts src/pages/api/training.ts src/types/database.ts scripts/local-training.mjs scripts/training-checks.mjs supabase/migrations/20260914203000_training_cycle.sql
exit 0
```

Testy korzystają z prawdziwego lokalnego Auth/PostgREST/PostgreSQL oraz sesji obu ról i obcej relacji. Tworzą tymczasowe lokalne konta i sprzątają je wraz z danymi. Asercja wyścigu wysyła edycję oraz rozpoczęcie z tą samą wersją równolegle i wymaga dokładnie jednego sukcesu oraz jednego konfliktu. Test wygaśnięcia rozdziela nowy trening, dokończenie rozpoczętego i korektę historii. Nie wykonano migracji ani testów na środowisku zdalnym.

FR-011 (AI) pozostaje opcjonalnym rozszerzeniem poza warunkiem ukończenia MVP. Pełne sprawdzenia Astro i testy przeglądarkowe należą do osobnego końcowego przebiegu koordynatora.
