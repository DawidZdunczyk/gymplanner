---
project: GymPlanner
checked_at: 2026-09-14
local_status: passed
cloud_status: awaiting_ci_retry
---

# Weryfikacja pierwszego wdrożenia

## Przygotowane

- Zapisano zatwierdzony plan, instrukcję konfiguracji usług i sekrety opisane wyłącznie nazwami.
- Zainstalowano Node 22.22.3 przez nvm (checksum instalatora potwierdzony); lokalne kontrole używały tej wersji. Docker Desktop działa, lokalny Supabase uruchomiony.
- Konfiguracja Workers: oddzielne staging/production, wyłączone domyślne sesje Astro i optymalizacja Images, bez publicznego signup.
- CI/CD na main: kontrole i lokalny smoke bez sekretów, pierwsza publikacja ręczna; staging musi przejść przed produkcją. Publikacje przypięte do jednego SHA.
- Skrypt publikacji waliduje cele, odmawia użycia klucza administracyjnego i wspólnego projektu Supabase, odmawia nadpisania niezarządzanego Workera. Po awarii próbuje rollback albo wyłączenie pierwszego publicznego adresu; nie usuwa bazy.

## Wykonane kontrole

| Kontrola                                     | Wynik                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `npx astro sync`                             | PASS                                                                  |
| `npm run lint`                               | PASS                                                                  |
| `npx astro check`                            | PASS; 0 errors, 0 warnings, 0 hints                                   |
| `npm run build`                              | PASS; bez SITE_URL lokalnie sitemap jest pomijany                     |
| `npm run check:deployment`                   | PASS; 6 testów zabezpieczeń                                           |
| `npm run smoke:local` — signup               | PASS; 10 kontroli HTTP, tylko lokalne konto                           |
| `npm run smoke:local` — existing             | PASS; 11 kontroli HTTP, w tym blokada strony i API signup             |
| Build staging z testowym SITE_URL            | PASS; gymplanner-staging, ALLOW_SIGNUP=false, bez KV/Images           |
| Build production z testowym SITE_URL         | PASS; gymplanner, ALLOW_SIGNUP=false, bez KV/Images                   |
| YAML workflow                                | Poprawnie sparsowany; push/PR/manual, checks/smoke/staging/production |
| `git diff --check` i ignorowanie .dev.vars.* | PASS                                                                  |

Testy HTTP wykonały prawdziwe logowanie do lokalnego Supabase, sprawdziły błędne hasło, sesję po odświeżeniu, wylogowanie i ochronę dashboardu. W trybie existing sprawdzono też brak odnośników rejestracji i odpowiedź 403 API. Oba serwery preview zostały zatrzymane po testach.

Wykryte podczas implementacji i usunięte problemy: reguła lint crashowała dla return w frontmatter Astro (przekierowanie przeniesiono do middleware), a Astro 7 w środowisku agenta uruchamia preview w tle (test używa jawnie `--background` oraz `astro preview stop`).

## Stan usług i pozostałe sprawdzenia

Użytkownik wskazał `https://github.com/DawidZdunczyk/gymplanner` i potwierdził gotowe konto Cloudflare. Git potrafi odczytać repozytorium; GitHub CLI nie jest zalogowany. Integracja historii zachowuje lokalny commit początkowy `89c037d` i zdalny `9cad9f7`, bez force-push. Konflikt ograniczał się do README: zachowano pełną instrukcję projektu w miejsce zdalnego nagłówka. Publiczne API repo zwraca 404 przy poprawnym dostępie przez Git, co jest zgodne z prywatną widocznością.

Użytkownik potwierdził przygotowanie projektów Supabase, kont smoke i sekretów/zmiennych GitHub. Utworzył pomocniczy Worker `gymplanner-setup.dawid-zdunczyk.workers.dev`. Docelowe adresy: `https://gymplanner-staging.dawid-zdunczyk.workers.dev` oraz `https://gymplanner.dawid-zdunczyk.workers.dev`. `DEPLOY_ENABLED` pozostaje `false`.

Pierwsze ręczne uruchomienie Actions zatrzymało się na `npm ci`, przed publikacją aplikacji. Nie wykonano jeszcze zdalnego smoke, zdalnego rollback ani pomiarów CPU. Lokalny sukces nie potwierdza tych operacji.

Po publikacji dopisać rzeczywiste URL-e, SHA i ID wersji z artefaktów Actions, wynik zdalnego smoke, próby rollback staging i odczytu CPU/logów. Nie zapisywać wartości sekretów.

## Naprawa instalacji CI — 2026-09-14

- Odtworzono `EUSAGE` z oryginalnym lockfile w czystym kontenerze Linux amd64 (`node:22.22.3-bookworm-slim`, npm 10.9.8): brak `@emnapi/core@1.11.3` i `@emnapi/runtime@1.11.3`.
- Uzupełniono lockfile przez `npm install --package-lock-only --ignore-scripts` na kopii manifestu i lockfile bez `node_modules`. npm dopisał również metadane zależności dołączonych do paczki Tailwind WASM. Nie zmieniono wersji istniejących pakietów ani manifestu aplikacji.
- Czyste `npm ci --no-audit --no-fund` na Linux amd64: PASS, 664 pakiety. Następnie `astro sync` → lint → `astro check` → build oraz 6 testów zabezpieczeń wdrożenia: PASS na Linux amd64 i lokalnie na macOS; typy bez błędów, ostrzeżeń i wskazówek.
- Wcześniejszy build z istniejącym lokalnym `node_modules` nie sprawdzał poprawności czystej instalacji. Przy kolejnych zmianach zależności sprawdzać `npm ci` w izolowanym środowisku.
- Ponowne wdrożenie wymaga nowego `Run workflow` z aktualnego `main`; `Re-run jobs` starego uruchomienia użyłoby starego commita.
