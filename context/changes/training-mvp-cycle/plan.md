# Plan: pełny przepływ treningu MVP

## Cel

Trener tworzy i przypisuje plan z okresem ważności oraz jednostkami według tygodnia. Podopieczny zapisuje serie, rozlicza rozgrzewkę, ocenia i kończy trening. Trener porównuje zachowaną rozpiskę z wykonaniem. Zakres obejmuje przyszłe zmiany, superserie, widoczność komentarzy i korekty z zamiennikami. AI pozostaje opcjonalne według PRD.

## Uzgodniony kontrakt integracji

Typy: `src/lib/training-contract.ts`. Model: `training_plans`, `training_workouts`, `training_comments`. Powiązania i identyfikatory podopiecznych korzystają z S-01. Aktualne przypisanie jest sprawdzane przy każdym odczycie/zapisie. Tylko podopieczny widzi prywatny komentarz.

Warstwa serwerowa `src/lib/training.ts` eksportuje `getTrainingOverview(client)` zwracające `{plans, workouts}` oraz `getWorkout(client, id)` zwracające `{workout, comments}` albo null. Błędy są zgłaszane; interfejs pokazuje 503, nigdy fałszywy pusty stan. Typy argumentów używają klienta Supabase z istniejącego kontekstu żądania.

Jedyny endpoint zapisu `POST /api/training` przyjmuje JSON `{action, payload}` i zwraca `{data}` lub `{error}`. Błąd klienta 400, brak sesji 401, brak dostępu/obiektu 404, konflikt wersji/stanu 409, awaria 503. Kontrola Origin dla JSON POST jest jawna. Dane z backendu nie zawierają sekretów.

Akcje:

- `create_plan`: `trainee_id, title, valid_from, valid_until` → TrainingPlan.
- `create_workout`: `plan_id, week_start, scheduled_for, unit_label, prescription` → TrainingWorkout.
- `update_workout`: `workout_id, version, scheduled_for, unit_label, prescription` → TrainingWorkout; tylko planned i w tym samym tygodniu.
- `delete_workout`: `workout_id, version` → `{id}`; tylko planned. Historia pozostaje.
- `start_workout`: `workout_id, version` → TrainingWorkout; sprawdza ważność planu i utrwala snapshot.
- `save_results`: `workout_id, version, results` → TrainingWorkout; zapis roboczy w in_progress, bez fałszywego sukcesu.
- `complete_workout`: `workout_id, version, results` → TrainingWorkout; wymaga rozgrzewki, rozliczenia ćwiczeń, wyników wykonanych serii i ocen 1–10.
- `correct_workout`: `workout_id, version, results` → TrainingWorkout; completed, wymagane pełne dane, oryginalny snapshot pozostaje, corrected_at oznacza korektę. Zamiennik w `replacement`, z nazwą, seriami, powtórzeniami, oceną i RIR lub RPE.
- `save_comment`: `workout_id, body, visibility` → TrainingComment; wyłącznie autor/podopieczny, visibility public/private.

Zapisy treningu są atomowe i kontrolują `version`, aby równoległy zapis lub edycja trenera nie nadpisały rozpoczętej rozpiski. Zwykłe role nie zapisują bezpośrednio tabel; odpowiednio ograniczone funkcje sprawdzają uprawnienia niezależnie od endpointu. Odczyt korzysta z RLS.

Cel serii/powtórzeń: fixed, range, unlimited; null liczby serii to jedno wykonanie poza superserią. Jedna runda superserii daje jedną serię każdego ćwiczenia, bez mnożenia przez pole sets. Odchylenie wyników od celu jest akceptowane. Wymagane wyniki: czas albo powtórzenia i ciężar, jeśli przewidziany. Rozgrzewka jest jednym statusem, bez wyników i ocen.

## Fazy i odpowiedzialność

1. Model danych, reguły, transakcje, uprawnienia oraz API — agent backendu. Własne pliki: migracja, `src/lib/training.ts`, `src/pages/api/training.ts`, wygenerowane `src/types/database.ts`.
2. Widoki planowania i wyników trenera — agent trenera. Własne pliki: `src/components/training/TrainingManager.tsx`, `TrainerResults.tsx`, `src/pages/dashboard/training/index.astro`, karta podopiecznego. Link panelu głównego dodaje koordynator.
3. Widoki podopiecznego — agent wykonania. Własne pliki: `src/components/training/WorkoutExecution.tsx`, `src/pages/dashboard/training/[workoutId].astro`. Szczegóły workoutu wspólne dla ról; dla trenera używa `TrainerResults`.
4. Integracja, dokumentacja, test użytkownika E2E, sprawdzenia i poprawki — koordynator. Wymagania testów doprecyzowane materiałami modułu 3. Pozostaje jedno źródło kontraktu; zmiany uzgadniane między agentami.

## Weryfikacja

Testy prawdziwego lokalnego Supabase obejmują CRUD, odmowę obcej relacji, wersjonowanie, zakończenie z brakami, trwałość i snapshot, superserie, komentarze prywatne, korekty oraz wygasły plan. Test użytkownika w przeglądarce pokrywa trener → plan → trening → podopieczny → wyniki → zakończenie → trener → odczyt. Każdy element PRD otrzyma dowód lub jawny status oczekujący.

Końcowo Node 22.22.3: Astro sync → lint → Astro check → build, testy regresji S-01, testy nowego przepływu i `git diff --check`. Bez zdalnych migracji i publikacji przed osobnym zatwierdzeniem planu wdrożenia. Nie zapisujemy do archive ani nie deklarujemy niezrobionych testów ręcznych.

## Progress

- [x] Model danych, reguły i API
- [x] Panel trenera oraz porównanie wyników
- [x] Wykonanie, superserie, komentarze i korekty podopiecznego
- [x] Testy scenariuszy PRD i przeglądarkowy test użytkownika
- [x] Końcowe kontrole, przegląd i dokumentacja zaliczeniowa
