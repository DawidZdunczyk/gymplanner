# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Sprawdzamy ryzyka najtańszą warstwą dającą wiarygodny wynik. Wymagania użytkownika i PRD są źródłem oczekiwań; test nie kopiuje obliczeń implementacji. Scenariusze przechodzące przez sesję, formularze, endpoint i bazę wymagają przeglądarki. Reguły zakończenia i RLS sprawdzamy również bezpośrednio na lokalnym Supabase. Wewnętrzne granice pozostają prawdziwe; nie używamy atrap do dowodzenia zapisu ani dostępu.

Priorytet wynika z North Star oraz kontroli dostępu PRD. Aktywnie zmieniane obszary: `src/lib/`, `src/components/training/`, `src/pages/dashboard/`, `supabase/migrations/`.

## 2. Risk Map

| #   | Risk (failure scenario)                                                | Impact | Likelihood | Source (evidence — not anchor)                   |
| --- | ---------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------ |
| 1   | Potwierdzone wyniki znikają po odświeżeniu                             | High   | High       | PRD Non-Functional Requirements; North Star S-04 |
| 2   | Obcy trener odczytuje lub zmienia trening albo prywatny komentarz      | High   | High       | PRD Access Control, FR-008                       |
| 3   | Edycja trenera nadpisuje rozpoczętą rozpiskę                           | High   | High       | PRD FR-004, Guardrails                           |
| 4   | Zakończenie przyjmuje brakujące wyniki lub odrzuca poprawne odchylenie | High   | High       | PRD US-04, FR-006/007/009/015                    |
| 5   | Superserie mnożą liczbę serii lub korekta usuwa oryginał               | High   | Medium     | PRD US-02/03, FR-013/014                         |
| 6   | Wygasły plan pozwala zacząć nowy trening albo blokuje historię         | Medium | Medium     | PRD FR-012                                       |

### Risk Response Guidance

| Risk | What would prove protection                                   | Must challenge                   | Context research must ground         | Likely cheapest layer          | Anti-pattern to avoid          |
| ---- | ------------------------------------------------------------- | -------------------------------- | ------------------------------------ | ------------------------------ | ------------------------------ |
| #1   | Zapisane wartości widoczne po reload i u trenera              | Sam komunikat sukcesu            | Formularz → zapis → ponowny odczyt   | E2E + integration              | Naiwna asercja na tytule       |
| #2   | Odmowa znanego obcego UUID i prywatnej treści                 | Samo ukrycie linku               | Aktualna relacja i sesje             | integration + istniejący smoke | Test tokenem administratora    |
| #3   | Snapshot i inne tygodnie niezmienne, konflikt wersji          | Kolejność startu i edycji        | Transakcja i wersja                  | integration                    | Tylko scenariusz sekwencyjny   |
| #4   | Braki odrzucone, 3 serie dla celu 3–5 i odchylenia przyjęte   | Pięć serii jako obowiązek        | Konfiguracja i rzeczywiste wyniki    | integration + E2E              | Kopiowanie walidatora          |
| #5   | Jedna seria na ćwiczenie/rundę, oryginał widoczny po korekcie | Mnożenie rund przez sets         | Snapshot, grupa i zamiennik          | integration + E2E              | Asercja tylko statusu 200      |
| #6   | Odmowa startu i możliwość kontynuacji/korekty                 | Data i status jako jeden warunek | Ważność planu i istniejące wykonanie | integration                    | Testowanie tylko ważnego planu |

## 3. Phased Rollout

| #   | Phase name           | Goal (one line)                              | Risks covered | Test types               | Status       | Change folder                            |
| --- | -------------------- | -------------------------------------------- | ------------- | ------------------------ | ------------ | ---------------------------------------- |
| 1   | Dostęp obu ról       | Zachować ochronę danych                      | #2            | integration + HTTP smoke | implementing | context/changes/assigned-trainee-access/ |
| 2   | Reguły treningów     | Dowieść integralności danych i przejść stanu | #2–#6         | integration              | done         | context/changes/training-mvp-cycle/      |
| 3   | Przepływ użytkownika | Zapis i odczyt wyników w przeglądarce        | #1, #4, #5    | E2E                      | done         | context/changes/training-mvp-cycle/      |

## 4. Stack

| Layer            | Tool                           | Version           | Notes                                              |
| ---------------- | ------------------------------ | ----------------- | -------------------------------------------------- |
| Unit / kontrakty | node:test                      | Node 22.22.3      | Stan błędów, konfiguracja i zabezpieczenia runnera |
| Integracja       | Supabase lokalny + supabase-js | package-lock.json | Prawdziwe Auth, RLS, RPC i Postgres                |
| E2E              | Playwright / Chromium          | package-lock.json | Oddzielne storageState obu ról; lokalny workerd    |

Stack grounding tools: manifest i biblioteki lokalne; oficjalna dokumentacja Playwright; natywna przeglądarka do odczytu lekcji; checked 2026-09-14. Brak Context7 w tej sesji. CLI 10xDevs oraz lekcja M3L4 dostarczają reguły i wzorzec seed.

## 5. Quality Gates

Astro sync, lint, Astro check i build są wymagane przed ukończeniem zmiany. Testy integracyjne i E2E uruchamiają się lokalnie oraz w CI po dodaniu przepływu treningowego. Istniejący smoke Auth i S-01 pozostaje regresją. Przed udostępnieniem wymagany jest zatwierdzony plan migracji oraz zdalna weryfikacja; lokalny zielony wynik nie oznacza wdrożenia.

## 6. Cookbook Patterns

### 6.1 Unit / kontrakty

Wzorzec: `scripts/access-context.test.mjs`; jawne wejścia błędów i zachowanie widoczne dla użytkownika. Uruchomienie przez node:test zgodnie z package.json.

### 6.2 Integracja

Wzorzec: `scripts/access-checks.mjs`. Fixture z `access-fixtures.mjs` tworzy losowe konta lokalnie, sprząta po każdym przebiegu i nie wypisuje sekretów. Asercje używają JWT właściwej roli. Uprzywilejowany klient tylko przygotowuje i kontroluje stan.

### 6.3 E2E

Wzorzec i reguły: `tests/e2e/seed.spec.ts`, `tests/e2e/AGENTS.md`. Test użytkownika ma chronić konkretne dane po reload. Sesje przygotowywane raz dla testu, niezależny kontekst każdej roli. Bez arbitralnych opóźnień. Sprawdzić czerwony wynik po kontrolowanym zepsuciu chronionego zachowania, następnie przywrócić kod i wynik zielony.

Dowód z 2026-09-14: `npm run check:ci:local` przechodzi na świeżym izolowanym Supabase, w tym testy DB i 2/2 E2E. Mutacja `results: null` dała czerwony test na dokładnej wartości po reload; przywrócony kod przechodzi. `advanced.spec.ts` dodatkowo sprawdza superserie, zamiennik, ekran mobilny i blokadę przycisku przed hydratacją. Pełne wyniki i ograniczenia: `context/changes/training-mvp-cycle/verification.md`. Status `done` oznacza dostarczenie testów lokalnych; ręczne kryteria S-01 oraz wdrożenie pozostają osobnymi bramkami.

## 7. What We Deliberately Don't Test

Opcjonalnego AI nie implementujemy i nie tworzymy dla niego sztucznych testów. Nie testujemy wnętrza bibliotek ani wyglądu każdego elementu snapshotem. Wizualna ocena i testy ręczne pozostają osobnymi dowodami, nie wynikają automatycznie z HTTP 200.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14

Odświeżyć przy zmianie PRD, nowym ryzyku utraty danych, zmianie runnera lub granic dostępu.
