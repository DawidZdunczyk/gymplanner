# Weryfikacja S-01

Data: 2026-09-14. Node: 22.22.3. Plan: [assigned-trainee-access](plan.md). Stan: **14/14 kryteriów zakończonych; odbiór ręczny potwierdzony przez użytkownika**.

## Wyniki

| Kontrola                                                                 | Wynik                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Migracja na istniejącym lokalnym Supabase                                | PASS; zastosowana raz, drugie wywołanie potwierdziło aktualny schemat bez resetu                                    |
| `npm run check:access:db`                                                | PASS; RLS, sesje obu ról, anon, brak profilu, metadane, zakazane zapisy, ograniczenia, odwołanie relacji            |
| `npm run smoke:access:local`                                             | PASS; oba panele, karta, identyczne 404, puste stany, rozróżnienie nazw, odwołanie i zmiana trenera                 |
| Odświeżenie sesji                                                        | PASS; zmiana wyłącznie `expires_at`, rzeczywista rotacja refresh tokena, nowe cookies, kolejny odczyt i no-store    |
| `npm run smoke:local`                                                    | PASS; lokalny signup oraz istniejące konto, nawigacja Workera i wylogowanie                                         |
| `npm run check:deployment`                                               | PASS; 11 testów, w tym kopiowanie wyłącznie migracji, brak symlinków i wyłączony seed                               |
| `npm run check:access:ci`                                                | PASS; pełna sekwencja Auth → dostęp na świeżym projekcie `gymplanner-ci-d2af139f`, po poprawce znalezionej w review |
| `node --test scripts/access-runner.test.mjs`                             | PASS; 3 testy                                                                                                       |
| `node --experimental-strip-types --test scripts/access-context.test.mjs` | PASS; 4 testy                                                                                                       |
| Astro sync → lint → Astro check → build                                  | PASS; końcowo 46 plików, zero błędów, ostrzeżeń i wskazówek Astro check                                             |
| `git diff --check`                                                       | PASS                                                                                                                |

Build bez `SITE_URL` zgłasza istniejącą informację o pominięciu sitemap; build testowy z lokalnym `SITE_URL` generuje sitemap. Nie dotyczy działania S-01.

Testy używały lokalnego Supabase, losowych kont i rzeczywistych JWT. Nowy runner usuwa swoje konta; wrapper świeżego projektu zatrzymuje i usuwa wyłącznie własne środowisko. Poświadczenia administracyjne nie były przekazywane do builda ani Workera. Nie wykonano zdalnej migracji, push ani publikacji.

## Przegląd kodu

[Raport](reviews/impl-review-phase-2.md): APPROVED dla faz 1–2. Dwie niezależne analizy znalazły jedną słabość testu, poprawioną i ponownie zweryfikowaną. Nie zidentyfikowano dodatkowej konkretnej luki dostępu. Faza 3 dodaje CI i dokumentację, a jej testy automatyczne również przeszły.

Uzasadnione pliki pomocnicze poza podstawową listą planu: `scripts/access-http.mjs` wydziela testy HTTP; `scripts/isolated-access.mjs` odtwarza świeże CI lokalnie; `context/deployment/README.md` usuwa nieaktualną informację o niekopiowaniu migracji. Zakres funkcji produktu pozostaje S-01.

## Historia i bramka końcowa

- Faza 1: `fafbf2a` — profile, przypisania, RLS i testy bazy.
- Faza 2: `b434ca6` — panele, karta, sesje i testy HTTP.
- Faza 3: automatyzacja i kod zapisane w `f3e5a0a`; użytkownik potwierdził ręczne kryteria 3.4–3.6 dnia 2026-09-14. Cykl plan → implementacja → weryfikacja S-01 jest zakończony.

Potwierdzony zakres ręczny: widoki telefonu i obsługa klawiaturą; oba typy kont i wylogowanie; lokalna zmiana przypisania oraz komunikat przy niedostępności backendu. [Procedura operatora i testów](../../access/README.md). Podstawą oznaczenia jest odpowiedź użytkownika „Potwierdzam” na wskazaną bramkę odbioru, a nie sam wynik testów HTTP. Agent nie deklaruje samodzielnego wykonania tych testów ręcznych.

Użytkownik poprosił o pominięcie przygotowywania podglądu. Nie pozostawiono uruchomionego podglądu do oglądania aplikacji. S-01 w roadmapie ma status `done`; żaden plik nie został zapisany do `context/archive/`.

Aktualizacja podczas pełnego MVP: regresja S-01 ponownie przeszła na świeżym `gymplanner-ci-ea217680` razem z testami treningów i E2E. Szczegóły: [weryfikacja pełnego MVP](../training-mvp-cycle/verification.md). Testy automatyczne i późniejsze potwierdzenie użytkownika stanowią osobne dowody. Zgoda na odbiór S-01 nie zatwierdza migracji ani publikacji na hostowanych środowiskach.
