# Wdrożenie GymPlanner

Zatwierdzony zakres: [deploy-plan.md](deploy-plan.md). Wyniki wykonania: [verification.md](verification.md).

## Przygotowanie usług

1. GitHub: prywatne repozytorium `https://github.com/DawidZdunczyk/gymplanner`, gałąź `main`. Kod i historia są zachowywane; nie wykonywać force-push.
2. Cloudflare: konto z samym GymPlanner, plan Workers Free. Wybrać subdomenę `workers.dev`. Nazwy Workerów `gymplanner-staging` i `gymplanner` tworzy pierwszy deploy. Istniejący Worker bez znacznika wersji `gymplanner-<sha>` blokuje skrypt zamiast być nadpisany.
3. Supabase: dwa projekty **Free**, `gymplanner-staging` i `gymplanner-production`, region **Central EU (Frankfurt), eu-central-1**. Nie wybierać Pro. Zanotować dwa różne URL-e projektu i publishable/anon keys.
4. W obu projektach Supabase: Authentication → ustawienia → wyłączyć **Allow new users to sign up**; zachować możliwość logowania e-mail/hasło. Site URL i dozwolone redirect URL-e ustawić na dokładny URL odpowiadającego Workera, bez wildcardów.
5. Authentication → Users → Add user → Create user: utworzyć oddzielne konto smoke w każdym projekcie, z silnym hasłem i potwierdzonym e-mailem (Auto Confirm). Użyć tworzenia konta, nie zaproszenia e-mailowego. Nie potrzeba SMTP. Nie włączać publicznej rejestracji, żeby obejść problem konta.
6. Token Cloudflare ograniczyć do konta GymPlanner: Workers Scripts Write (Edit), Account Settings Read, a do próby rollback także Workers Tail Read, jeśli CLI zażąda tego uprawnienia. Nie korzystać z szerokiego szablonu z KV/R2/DNS/billing. Osobny token tylko Workers Tail Read do codziennego odczytu logów. Token konta obejmuje Workery na tym koncie, dlatego konto musi zawierać wyłącznie ten projekt.

## Bezpieczne przekazanie konfiguracji

Preferowana ścieżka nie wymaga wklejania tokenów do terminala ani rozmowy: GitHub → repozytorium → Settings → Secrets and variables → Actions. Wprowadzić **repository secrets**, nie environment secrets (prywatne repo na GitHub Free).

| Repository secret                                     | Wartość                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                                | Token do wdrażania na konto GymPlanner       |
| `STAGING_SUPABASE_URL`                                | URL projektu testowego Supabase              |
| `STAGING_SUPABASE_KEY`                                | Publishable/anon key tego projektu           |
| `STAGING_SMOKE_EMAIL`, `STAGING_SMOKE_PASSWORD`       | Przygotowane konto testowe staging           |
| `PRODUCTION_SUPABASE_URL`                             | URL oddzielnego projektu docelowego Supabase |
| `PRODUCTION_SUPABASE_KEY`                             | Publishable/anon key tego projektu           |
| `PRODUCTION_SMOKE_EMAIL`, `PRODUCTION_SMOKE_PASSWORD` | Przygotowane konto testowe produkcji         |

| Repository variable     | Wartość                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | ID konta GymPlanner                                                 |
| `STAGING_URL`           | `https://gymplanner-staging.<subdomena>.workers.dev`                |
| `PRODUCTION_URL`        | `https://gymplanner.<subdomena>.workers.dev`                        |
| `DEPLOY_ENABLED`        | Początkowo `false`; po pierwszym udanym wdrożeniu zmienić na `true` |

Nie umieszczać service_role, secret key `sb_secret_*`, hasła bazy ani tokenu Supabase Management w aplikacji/CI. Nie są potrzebne do tego wdrożenia.

Do lokalnego uruchamiania deploya można ustawić te same nazwy w środowisku procesu przez menedżer sekretów; `STAGING_URL`, `PRODUCTION_URL` i `CLOUDFLARE_ACCOUNT_ID` również muszą być w środowisku. Skrypt czyta tylko potrzebny klucz i dane konta docelowego środowiska, ale zawsze porównuje oba URL-e Supabase. Nie zapisuje ich w raporcie. Nie używać `set -x` ani dumpowania środowiska.

## Pierwsza publikacja

- Zmiany muszą być zatwierdzone w Git; deploy odmawia pracy przy nieczystym drzewie. Kontrole muszą przejść.
- GitHub → Actions → **CI and deployment** → Run workflow → `main`.
- Workflow uruchamia lokalne kontrole i Supabase smoke, potem staging, a dopiero po jego powodzeniu produkcję; oba z tym samym SHA.
- Każdy deploy buduje właściwe środowisko przez `CLOUDFLARE_ENV`, sprawdza wygenerowaną konfigurację i przekazuje sekrety przez plik 0600 w katalogu tymczasowym. Nie tworzy KV, R2 ani Images.
- Po publikacji skrypt czeka maksymalnie 120 sekund na trzy kolejne udane rundy GET strony głównej i `/auth/signin`, z odstępem 5 sekund. Błąd zeruje serię sukcesów. Ponawia wyłącznie anonimowe GET przy przejściowych błędach sieci/routingu. Potem wykonuje pełny smoke; samo HTTP 200 nie oznacza sukcesu wdrożenia. Stały błąd nadal kończy wdrożenie niepowodzeniem.
- Pierwszy staging publikuje dodatkową wersję tego samego sprawdzonego artefaktu, przywraca pierwszą wersję i powtarza smoke: próba rollback przed produkcją.
- Raporty `deployment-staging-<sha>` i `deployment-production-<sha>` zawierają URL, SHA, identyfikatory wersji oraz stan przywracania. Nie zawierają sekretów.
- Po pozytywnym wyniku i odczycie logów ustawić `DEPLOY_ENABLED=true`. Następne push do `main` (standardowo po merge PR) uruchamiają tę samą sekwencję. PR nie mają dostępu do sekretów publikacji.
- Utrzymywać darmowy limit GitHub Actions; nie włączać płatnych nadwyżek.

Równoważne polecenia lokalne po kontroli kodu i ustawieniu wymaganych zmiennych:

```sh
npm run deploy:staging
npm run deploy:production
```

Lokalnie kolejność staging → produkcja jest obowiązkiem operatora; workflow wymusza ją zależnościami zadań. Nie uruchamiać bezpośrednio gołego `wrangler deploy`: pomija walidację, test i automatyczne przywracanie.

## Testy i logi

```sh
nvm use
npx astro sync
npm run lint
npx astro check
npm run build
npm run check:deployment
```

Lokalny pełny smoke wymaga działającego Dockera i lokalnego Supabase:

```sh
npx --no-install supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,storage-api,postgres-meta,supavisor
npm run smoke:local
```

`smoke:local` pobiera klucze lokalnego Supabase do pamięci, sprawdza dwa warianty preview: z `ALLOW_SIGNUP=true` tworzy konto wyłącznie na loopback, a następnie z `ALLOW_SIGNUP=false` testuje to samo konto i blokadę rejestracji. Zamyka każdy własny serwer przez `astro preview stop`. Nie kończy instancji Supabase używanej przez dewelopera. Port 4321 musi być wolny. Pliki `.dev.vars`/`.env*` nie mogą nadpisywać ustawień testu: skrypt odrzuca rozbieżne wartości. Na czas tego testu odłóż pliki ustawiające `ALLOW_SIGNUP`, ponieważ test przełącza oba warianty. Nie uruchamiaj równocześnie innego builda lub preview tego projektu.

W Actions krok `Prepare isolated Supabase project and free ports` tworzy tymczasową kopię `supabase/config.toml` z unikalnym `project_id` i sprawdzonymi wolnymi portami w zakresie 15420–24999. Start, odczyt statusu przez `smoke:local` i końcowe zatrzymanie używają tego samego `SUPABASE_WORKDIR`. Konfiguracja dewelopera i jego kontenery pozostają nienaruszone. Kopia CI obejmuje konfigurację startera; przed dodaniem migracji domenowych należy rozszerzyć ją również o pliki migracji/seed. Ustawienia lokalnej instancji opisuje [Supabase CLI config](https://supabase.com/docs/guides/local-development/cli/config).

Test hostowany: `SMOKE_MODE=existing`, `BASE_URL` właściwego Workera, `SMOKE_EMAIL` i `SMOKE_PASSWORD` przekazane przez środowisko, następnie `npm run smoke`. Nie tworzy użytkownika; sprawdza nawigację przeglądarki, blokadę rejestracji, logowanie, odświeżenie i wylogowanie. Skrypt domyślnie wybiera istniejące konto, nigdy signup.

Przy błędzie smoke raport może podać `CF-Ray`, aby powiązać żądanie z logami Cloudflare. Błędy logowania są mapowane na stałe komunikaty (np. odrzucone dane konta lub niepotwierdzony e-mail); nieznany komunikat wymaga sprawdzenia Supabase Auth logs. Treści odpowiedzi, ciasteczka i dowolne adresy przekierowania nie trafiają do diagnostyki.

Logi: `npx wrangler tail gymplanner --format json` lub `gymplanner-staging`, z tokenem odczytu. W Cloudflare sprawdzić CPU i błędy dla strony głównej oraz logowania (szczególnie 1102 / exceeded limits); HTTP smoke nie zastępuje pomiaru CPU. Zewnętrzne wywołania Supabase zużywają czas sieciowy, który nie jest tym samym co CPU. Brak funkcji treningowych oznacza, że ich przyszła wydajność jest jeszcze niezweryfikowana.

## Przywracanie i pierwsza awaria

Skrypt przed publikacją zapamiętuje aktywną wersję i stan publicznego adresu. Jeśli publikacja lub smoke zawiodą po aktywacji nowej wersji, cofa do poprzedniej i ponownie sprawdza logowanie. Gdy nie było wcześniejszej wersji lub jej adres był wyłączony po awarii, ponownie wyłącza publiczny adres Workera; nie usuwa zasobów ani nie przywraca niezweryfikowanej wersji jako działającej. Awaria przywracania jest wyraźnie oznaczona w raporcie i wymaga interwencji.

Po poprawce uruchomić nowe **Run workflow → main**, zamiast **Re-run jobs** starego commita. Konfiguracja `workers_dev=true` ponownie udostępni adres przy publikacji. Próba rollback staging nadal odbędzie się po pierwszym udanym smoke, również przy ponowieniu po wyłączeniu adresu. Raport odróżnia wersję opublikowaną od zweryfikowanej i podaje komunikat błędu.

Ręcznie, z identyfikatorem poprzedniej sprawdzonej wersji z raportu:

```sh
npx wrangler rollback <version-id> --name gymplanner --yes
```

Potem smoke z przygotowanym kontem. Jeśli awaria wynika z kolejnych publikacji, wyłączyć `DEPLOY_ENABLED` przed naprawą. Uszkodzonego środowiska nie naprawiać usuwaniem bazy. Rollback kodu nie cofa danych, schematu ani uprawnień w Supabase.

## Supabase Free i następne etapy

Odbierać wiadomości o pauzowaniu projektu. Po pauzie: Supabase Dashboard → właściwy projekt → Resume project, poczekać na gotowość, uruchomić hosted smoke. Nie oznaczać aplikacji jako sprawnej na podstawie samego HTTP 200 strony głównej. Nie zmieniać automatycznie planu na płatny.

Przed realnymi danymi podopiecznych: wdrożyć relacje/role i RLS, przygotować regularne eksporty poza usługę i sprawdzić odtworzenie w oddzielnej bazie. Pierwszy starter nie wykonuje migracji danych treningowych. Usunięcie produkcyjnej bazy/projektu i rotacja głównego sekretu należą do człowieka.
