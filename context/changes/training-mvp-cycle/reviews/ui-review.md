<!-- IMPL-REVIEW-REPORT -->

# Przegląd UI: pełny przepływ treningu MVP

- Data: 2026-09-14.
- Zakres: `TrainingManager`, `TrainerResults`, `WorkoutExecution`, lista i szczegóły treningu oraz karta podopiecznego; porównanie z PRD i fazami 2–3 planu.
- Werdykt końcowy: **APPROVED dla lokalnego zakresu UI**. Koordynator potwierdził E2E 2/2, końcowe kontrole Astro i przegląd obrazów mobilnych; [dowody](../verification.md). W chwili pierwotnego review te kontrole pozostawały oczekujące. Wykryte problemy interfejsu opisane poniżej poprawiono. To ograniczony przegląd UI, nie zatwierdzenie całej zmiany ani audyt bazy.
- Triaging: poprawki własnych plików wykonane w ramach zlecenia; problemy cudzych plików przekazane ich autorowi. Nie zmieniano statusu całej zmiany.

## Ustalenia i decyzje

1. **F1 — Niespójna kolejność superserii w porównaniu wyników. WARNING / MEDIUM / Plan Adherence.** `TrainerResults.tsx:244`. Układ źródłowy A1–C–A2, gdzie A1 i A2 należą do grupy, był pokazywany trenerowi w tej kolejności, ale podopiecznemu jako A1–A2–C. **Naprawiono:** widok trenera grupuje całą superserię w miejscu pierwszego ćwiczenia, zachowując kolejność jej członków. Edytor opisuje tę regułę. Render SSR zweryfikował rzeczywistą kolejność sekcji.
2. **F2 — Utworzenie planu usuwało niezapisany formularz treningu. WARNING / LOW / Safety & Quality.** `TrainingManager.tsx:747`. Formularz tworzenia planu pozostawał aktywny podczas edycji jednostki; sukces wywoływał `setDraft(null)`. **Naprawiono:** tworzenie planu jest zablokowane do zapisania lub anulowania edycji. Wybór planu i osoby był już blokowany.
3. **F3 — Cel pojedynczego ćwiczenia sugerował jedną serię mimo wielu rund. WARNING / LOW / Plan Adherence.** `WorkoutExecution.tsx:86`. Przy `sets=null` podsumowanie wyświetlało jedno wykonanie również w superserii. **Przekazano autorowi i poprawiono:** liczba rund ma pierwszeństwo nad polem serii; zamiennik zachowuje swój cel, a jego wiersze nazywają się seriami. Potwierdzono odczytem poprawionego kodu; weryfikacja przeglądarkowa po stronie koordynatora.
4. **F4 — Brak tygodnia w szczegółach jednostki. WARNING / LOW / Plan Adherence.** `src/pages/dashboard/training/[workoutId].astro:63`. Data konkretnego treningu była pokazana, lecz brakowało jawnego tygodnia wymaganego w FR-005. **Przekazano autorowi i poprawiono:** nagłówek zawiera `week_start`.

Dodatkowe małe poprawki: formularz tworzenia planu ma nazwę dostępną „Nowy plan treningowy”; edytor wykrywa superserię z mniej niż dwoma ćwiczeniami przed wysłaniem; daty w `TrainerResults` używają jawnej strefy Europe/Warsaw dla zgodności SSR z hydratacją.

## Sprawdzone wymagania

| Wymagania                                 | Dowód z kodu / weryfikacji                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001–002: dostęp i identyfikacja        | Middleware chroni ścieżki dashboard i ustawia `private, no-store`; listy i szczegóły pokazują nazwę oraz identyfikator podopiecznego. Weryfikacja relacji w bazie pozostaje zadaniem testów backendu.                                                                                                                                              |
| FR-003–004: planowanie i osobne jednostki | Formularz przesyła daty ważności, osobne parametry i nową kopię rozpiski. Aktualizacja/usunięcie zawiera konkretny `workout_id` oraz `version`; edycja dostępna tylko dla `planned`, data ograniczona do tego samego tygodnia.                                                                                                                     |
| FR-005–009: wykonanie                     | `initialResults` wybiera `rounds ?? sets.min ?? 1`: zakres 3–5 tworzy trzy wiersze, brak serii i unlimited zaczynają od jednego. Można dodawać/usuwać serie, pominąć serię lub ćwiczenie. Pola wyników zależą od konfiguracji; są oceny ćwiczeń i całości oraz jedno rozliczenie rozgrzewki. Autorytatywna walidacja zakończenia jest w API/bazie. |
| FR-008: komentarze                        | Domyślny komentarz publiczny, osobny wybór private. `TrainerResults` filtruje publiczne komentarze; smoke SSR nie zawierał przekazanego prywatnego tekstu. Filtr komponentu jest dodatkowy — ochrona danych musi występować przed serializacją props i jest przedmiotem testów RLS.                                                                |
| FR-010, FR-013: historia i korekta        | Oba widoki korzystają ze snapshotu. Render SSR potwierdził różnice dla tego samego parametru, odchylenie od najbliższej granicy zakresu, skreślenie oryginału, oznaczenie korekty i brak liczbowego porównania z zamiennikiem.                                                                                                                     |
| FR-012: ważność                           | Blokada rozpoczęcia dotyczy `planned`; zapis rozpoczętego treningu oraz korekta zakończonego pozostają dostępne po wygaśnięciu. Serwer ostatecznie sprawdza datę i stan.                                                                                                                                                                           |
| FR-014–015: superserie i rozgrzewka       | Liczba rund nie mnoży `sets`. Grupy zachowują kolejność członków i pokazują oba rodzaje przerw. Cała rozgrzewka ma jeden status, bez wyników i ocen.                                                                                                                                                                                               |
| FR-011: AI                                | Opcjonalne rozszerzenie pozostaje poza wykonanym zakresem, zgodnie z planem.                                                                                                                                                                                                                                                                       |

## Wykonana weryfikacja

- ESLint na czterech plikach autora, Node 22.22.3: **PASS** po poprawkach.
- `git diff --check`: **PASS**.
- Rzeczywisty render React SSR `TrainerResults`, bez mockowania komponentu: **PASS** dla kolejności grup, snapshotu, różnic zakresu i ciężaru, zamiennika, filtra komentarza prywatnego, liczby rund oraz etykiety unlimited. Tymczasowy bundle testowy utworzono w `/private/tmp`; nie dodano nowego systemu testów.
- Nie wykonywano globalnego builda ani nowego serwera podglądu w tym przeglądzie.

## Nieweryfikowane w tym przeglądzie

Pełny przepływ przeglądarkowy i układ telefonu, trwałość po odświeżeniu/logowaniu, faktyczne RLS przed serializacją, równoległe zapisy i błędy sieci/API, daty na granicy ważności oraz końcowy ciąg Astro sync → lint → Astro check → build pozostają weryfikacją koordynatora. Sam odczyt kodu i render SSR nie stanowią dowodu wykonania tych scenariuszy.
