---
project: GymPlanner
status: approved
approved_at: 2026-09-14
approval: User instructed "Implement the plan" after reviewing the proposed plan.
execution_status: in_progress
---

# Pierwsze wdrożenie GymPlanner

## Cel i decyzje

Wdrożyć obecny starter: stronę główną, logowanie, chroniony dashboard i wylogowanie. Cloudflare Workers Free + Supabase Free we Frankfurcie, prywatne repozytorium GitHub `gymplanner`, gałąź `main`, publiczne adresy `workers.dev`. Dostęp przez ręcznie przygotowane konta, bez publicznej rejestracji, SMTP, Cloudflare Access, danych treningowych i migracji domenowych.

Wykonano Devil's Advocate, Pre-Mortem i Unknown Unknowns; wyniki w [infrastructure.md](../foundation/infrastructure.md). Użytkownik zatwierdził publiczną stronę bez dodatkowej bramki Access dla tego startera. Oddzielny staging Worker zastępuje podglądy wersji bez logów. Funkcje treningowe i RLS domenowe pozostają warunkiem późniejszego udostępnienia rzeczywistych danych.

## Konta, środowiska i sekrety

- Użytkownik przygotowuje GitHub, konto Cloudflare zawierające wyłącznie GymPlanner i Supabase z dwoma nowymi projektami Free w `eu-central-1`. Brak darmowych zasobów zatrzymuje etap bez wyboru płatnego planu.
- Staging: Worker `gymplanner-staging`, Supabase `gymplanner-staging`. Produkcja startera: Worker `gymplanner`, Supabase `gymplanner-production`. Każdy projekt ma własne potwierdzone konto smoke.
- Zachować historię Git i `main`, podłączyć prywatne repozytorium jako `origin`. Nie nadpisywać istniejącego repozytorium lub zasobów o tych nazwach.
- Token Cloudflare: tylko konto GymPlanner, operacje Workers potrzebne do publikacji; bez DNS, billing i zarządzania tokenami. Osobny token Workers Tail Read do logów. Uprawnienie edycji Workers jest na poziomie konta, więc konto musi izolować projekt.
- Workers Secrets: `SUPABASE_URL`, `SUPABASE_KEY` (publishable/anon, nigdy service_role), oddzielnie dla środowisk. GitHub repository secrets: `CLOUDFLARE_API_TOKEN`, pary `STAGING_SUPABASE_URL/KEY`, `PRODUCTION_SUPABASE_URL/KEY` oraz `STAGING_SMOKE_EMAIL/PASSWORD`, `PRODUCTION_SMOKE_EMAIL/PASSWORD`. Niesekretne zmienne: `CLOUDFLARE_ACCOUNT_ID`, `STAGING_URL`, `PRODUCTION_URL`.
- Repozytorium prywatne na GitHub Free używa sekretów repozytorium, nie niedostępnych w tym wariancie environment secrets/reviewer gates. Sekrety tylko przez zmienne środowiskowe lub magazyny usług, nigdy przez rozmowę lub repozytorium. Tymczasowy plik dla `--secrets-file` poza repo, uprawnienia 0600, usunięcie po użyciu.

## Zmiany aplikacji

- Node 22.22.3 lokalnie i w CI; istniejący lockfile i wersje Astro 7.3.2, adaptera 14.3.1 oraz Wranglera 4.131.1 pozostają.
- Zdefiniować `staging` i `production` w istniejącym `wrangler.jsonc`, zachować entrypoint adaptera, `nodejs_compat` i datę kompatybilności. Wybrać środowisko przed buildem przez `CLOUDFLARE_ENV`; użyć wygenerowanej konfiguracji do deploya.
- Astro `session: false`, adapter `imageService: "passthrough"`; brak zbędnych SESSION/IMAGES. Cookies Supabase pozostają.
- `ALLOW_SIGNUP`: serwerowy boolean, domyślnie false. Wyłączona rejestracja usuwa linki, przekierowuje GET strony do logowania i zwraca 403 z POST API przed kontaktem z Supabase. Oba hostowane projekty Supabase również blokują publiczne tworzenie kont.
- Dodać ignorowanie `.dev.vars.*`. Ustawić `site` Astro i dokładne URL-e Auth dla każdego środowiska, bez szerokich wildcardów.

## CI/CD

PR do `main`: sync → lint → check → build oraz lokalny Supabase smoke; bez sekretów wdrożeniowych. Docker musi działać. Supabase CLI pochodzi z lockfile.

Pierwszy deploy ręcznie z `main`; kolejne na push do `main`, standardowo po scaleniu PR. Sekwencja: kontrole → staging build/deploy → staging smoke → osobny production build/deploy → production smoke. Ten sam SHA na obu środowiskach. Nieudany staging blokuje produkcję. Publikacje szeregowo, bez anulowania trwającego deploya. Sekrety dostępne tylko zadaniom publikacji z `main`, nie PR i forkom.

Wynik: adresy, SHA i identyfikatory wersji. Nie włączać automatycznego płatnego użycia Actions lub platform.

## Weryfikacja i przywracanie

- Wymagane kontrole po zmianach: `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`, w tej kolejności.
- Smoke lokalny: wyłącznie loopback, lokalny Supabase i `ALLOW_SIGNUP=true`; tworzy konto. Smoke hostowany: przygotowane konto z sekretów, bez tworzenia użytkownika, z kontrolą blokady rejestracji.
- Sprawdzić HTTPS, tytuł GymPlanner, brak komunikatu o nieskonfigurowanym Supabase, przekierowanie anonimowego dashboardu, odrzucenie błędnego hasła, logowanie, dashboard po odświeżeniu, wylogowanie, blokadę signup w UI i API oraz różne projekty Supabase.
- Brak 5xx i błędów CPU w próbie. Odczytać CPU/logi dla obecnych stron i logowania; brak funkcji treningowych oznacza odroczenie ich pomiarów do późniejszego etapu.
- Przed kolejnym deployem zapisać poprzednią aktywną wersję. Po nieudanej publikacji rollback i ponowny smoke. Przećwiczyć rollback na staging. Dla pierwszego deploya bez poprzedniej wersji wyłączyć publiczny adres, nie usuwać Workera/bazy.
- Rollback nie cofa danych. Opisać wznowienie Supabase po pauzie; przed danymi podopiecznych wdrożyć RLS, eksporty i próbę odtworzenia. Usuwanie bazy/projektu i rotacja głównego sekretu pozostają po stronie człowieka.

## Dokumenty wykonania

Instrukcje konfiguracji i obsługi: [README.md](README.md). Faktyczne wyniki testów i stan publikacji: [verification.md](verification.md). Zapis planu nie jest dowodem wykonania wdrożenia.
