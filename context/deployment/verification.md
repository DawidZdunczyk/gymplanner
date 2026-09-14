---
project: GymPlanner
checked_at: 2026-09-14
local_status: passed
cloud_status: awaiting_service_configuration
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

Użytkownik wskazał `https://github.com/DawidZdunczyk/gymplanner` i potwierdził gotowe konto Cloudflare. Git potrafi odczytać repozytorium; GitHub CLI nie jest zalogowany. Zdalne repo ma początkowy commit README, inny niż lokalna historia — integracja musi zachować oba, bez force-push. Publiczne API repo zwraca 404 przy poprawnym dostępie przez Git, co jest zgodne z prywatną widocznością.

Użytkownik konfiguruje projekty Supabase, konta smoke i sekrety/zmienne GitHub. Nie wykonano jeszcze publikacji Cloudflare, zdalnego smoke, zdalnego rollback ani pomiarów CPU. Lokalny sukces nie potwierdza tych operacji.

Po publikacji dopisać rzeczywiste URL-e, SHA i ID wersji z artefaktów Actions, wynik zdalnego smoke, próby rollback staging i odczytu CPU/logów. Nie zapisywać wartości sekretów.
