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
| `npm run check:deployment`                   | PASS; 10 testów, w tym kolizja portów i oczekiwanie na Worker          |
| `npm run smoke:local` — signup               | PASS; 12 kontroli HTTP, tylko lokalne konto                           |
| `npm run smoke:local` — existing             | PASS; 13 kontroli HTTP, w tym blokada strony i API signup             |
| Build staging z testowym SITE_URL            | PASS; gymplanner-staging, ALLOW_SIGNUP=false, bez KV/Images           |
| Build production z testowym SITE_URL         | PASS; gymplanner, ALLOW_SIGNUP=false, bez KV/Images                   |
| YAML workflow                                | Poprawnie sparsowany; push/PR/manual, checks/smoke/staging/production |
| `git diff --check` i ignorowanie .dev.vars.* | PASS                                                                  |

Testy HTTP wykonały prawdziwe logowanie do lokalnego Supabase, sprawdziły błędne hasło, sesję po odświeżeniu, wylogowanie i ochronę dashboardu. W trybie existing sprawdzono też brak odnośników rejestracji i odpowiedź 403 API. Oba serwery preview zostały zatrzymane po testach.

Wykryte podczas implementacji i usunięte problemy: reguła lint crashowała dla return w frontmatter Astro (przekierowanie przeniesiono do middleware), a Astro 7 w środowisku agenta uruchamia preview w tle (test używa jawnie `--background` oraz `astro preview stop`).

## Stan usług i pozostałe sprawdzenia

Użytkownik wskazał `https://github.com/DawidZdunczyk/gymplanner` i potwierdził gotowe konto Cloudflare. Git potrafi odczytać repozytorium; GitHub CLI nie jest zalogowany. Integracja historii zachowuje lokalny commit początkowy `89c037d` i zdalny `9cad9f7`, bez force-push. Konflikt ograniczał się do README: zachowano pełną instrukcję projektu w miejsce zdalnego nagłówka. Publiczne API repo zwraca 404 przy poprawnym dostępie przez Git, co jest zgodne z prywatną widocznością.

Użytkownik potwierdził przygotowanie projektów Supabase, kont smoke i sekretów/zmiennych GitHub. Utworzył pomocniczy Worker `gymplanner-setup.dawid-zdunczyk.workers.dev`. Docelowe adresy: `https://gymplanner-staging.dawid-zdunczyk.workers.dev` oraz `https://gymplanner.dawid-zdunczyk.workers.dev`. `DEPLOY_ENABLED` pozostaje `false`.

Pierwsze ręczne uruchomienie Actions zatrzymało się na `npm ci`, przed publikacją aplikacji. Po naprawach instalacji i portów staging został przesłany, ale zdalny smoke zatrzymał się na HTTP 404 strony głównej. Nie potwierdzono jeszcze zdalnego logowania, próby rollback ani pomiarów CPU. Produkcja pozostaje niewdrożona; lokalny sukces nie potwierdza operacji w chmurze.

Po publikacji dopisać rzeczywiste URL-e, SHA i ID wersji z artefaktów Actions, wynik zdalnego smoke, próby rollback staging i odczytu CPU/logów. Nie zapisywać wartości sekretów.

## Naprawa instalacji CI — 2026-09-14

- Odtworzono `EUSAGE` z oryginalnym lockfile w czystym kontenerze Linux amd64 (`node:22.22.3-bookworm-slim`, npm 10.9.8): brak `@emnapi/core@1.11.3` i `@emnapi/runtime@1.11.3`.
- Uzupełniono lockfile przez `npm install --package-lock-only --ignore-scripts` na kopii manifestu i lockfile bez `node_modules`. npm dopisał również metadane zależności dołączonych do paczki Tailwind WASM. Nie zmieniono wersji istniejących pakietów ani manifestu aplikacji.
- Czyste `npm ci --no-audit --no-fund` na Linux amd64: PASS, 664 pakiety. Następnie `astro sync` → lint → `astro check` → build oraz 6 testów zabezpieczeń wdrożenia: PASS na Linux amd64 i lokalnie na macOS; typy bez błędów, ostrzeżeń i wskazówek.
- Wcześniejszy build z istniejącym lokalnym `node_modules` nie sprawdzał poprawności czystej instalacji. Przy kolejnych zmianach zależności sprawdzać `npm ci` w izolowanym środowisku.
- Ponowne wdrożenie wymaga nowego `Run workflow` z aktualnego `main`; `Re-run jobs` starego uruchomienia użyłoby starego commita.

## Izolacja portów Supabase w CI — 2026-09-14

- Kolejne uruchomienie zatrzymało się na starcie lokalnego Supabase: port `54322` był zajęty. Przekazany log nie wskazuje procesu zajmującego port.
- CI tworzy tymczasową konfigurację z unikalną nazwą `gymplanner-ci-…` i wolnymi portami poniżej 25000. Wszystkie operacje start/status/stop odwołują się do niej przez `SUPABASE_WORKDIR`; konfiguracja dewelopera nie jest modyfikowana.
- Test regresji zajmuje pierwszy proponowany port i potwierdza wybranie innego zakresu, unikalne nazwy projektów i zachowanie oryginalnego pliku. PASS na macOS i Linux amd64; łącznie 7 testów.
- Pełny test integracyjny pozostawił istniejący `supabase_db_10x-astro-starter` na `54322` i uruchomił obok tymczasowy `gymplanner-ci-a3bb1422`, z API `15420` i bazą `15421`. Start oraz oba tryby smoke przeszły: 10 + 11 kontroli HTTP. Preview i tymczasowy Supabase zatrzymane po testach; pierwotne kontenery nadal działają.
- `astro sync` → lint → `astro check` → build: PASS. Test nie używał projektów ani sekretów staging/produkcji. Wynik właściwego wdrożenia nadal wymaga nowego ręcznego uruchomienia Actions.

## HTTP 404 po publikacji staging — 2026-09-14

- Log użytkownika potwierdza upload i aktywację wersji `4b5aed96-76d1-4e46-8829-4270276283cd` dla SHA `a4bdb0b3891ec0fae897480a23d61dcfd257c4ce`. Pierwszy test strony głównej otrzymał HTTP 404; recovery wyłączyło adres staging, zachowując Worker i bazę.
- Sam log nie rozstrzyga źródła 404. Dodano ograniczone do 120 sekund oczekiwanie na dostępność adresu przed pełnym smoke. Testy potwierdzają ponawianie przejściowych błędów, odmowę przy stałym 404 oraz brak ponawiania logowania, przekierowań i błędów aplikacji.
- Usunięto `assets.not_found_handling=404-page`: przy aktualnej dacie kompatybilności ta opcja może kierować nawigację przeglądarki do statycznego 404 z pominięciem kodu Astro. Domyślny routing przekazuje żądanie do Workera, jeśli zasób nie istnieje. To osobny wykryty problem; poprzedni test przez Node fetch nie odtwarzał nagłówka nawigacji. Źródła: [nawigacja i statyczne 404](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/#navigation-requests), [domyślny routing Workera](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).
- Smoke sprawdza teraz także stronę główną i ochronę dashboardu z `Sec-Fetch-Mode: navigate`. Pełny lokalny test z Supabase: PASS, 12 + 13 kontroli HTTP; oba serwery preview zatrzymane. `astro sync` → lint → `astro check` → build oraz 10 testów zabezpieczeń: PASS.
- Ponowienie uwzględnia wyłączony adres poprzedniej niezweryfikowanej wersji: nadal przeprowadza próbę rollback po pierwszym sukcesie, a przy kolejnej awarii wyłącza adres. Raport zapisuje osobno opublikowaną i zweryfikowaną wersję oraz błąd. Stan adresu jest odczytywany przez [Cloudflare API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/subdomain/methods/get/).
- Sukces poprawki w chmurze wymaga nowego ręcznego przebiegu z `main`. `DEPLOY_ENABLED` pozostaje `false`.
