# GymPlanner

Aplikacja dla trenera i podopiecznego do planowania treningów i zapisywania wyników. S-01 dodaje panel trenera z przypisanymi osobami, kartę podopiecznego i panel podopiecznego z jego trenerem. Dostęp egzekwują sesja i polityki RLS.

Lokalna implementacja obejmuje plany z okresem ważności, tygodnie i osobno konfigurowane jednostki, rozgrzewkę, superserie z rundami i przerwami oraz zapis wyników i ocen. Trener porównuje zachowaną rozpiskę z wykonaniem; podopieczny może poprawić zakończony trening, podać zamiennik i wybrać widoczność komentarza. Opcjonalne podsumowanie AI pozostaje poza zakresem. [Mapa wymagań i stan dowodów](context/changes/training-mvp-cycle/requirements.md).

Astro 7, React 19, TypeScript 6, Tailwind 4, Supabase i Cloudflare Workers.

## Lokalny start

Node **22.22.3**, npm i Docker (do lokalnego Supabase).

```sh
nvm use
npm ci
npx --no-install supabase start
cp .env.example .dev.vars
```

W ignorowanym `.dev.vars` ustawić URL lokalnego Supabase i publishable/anon key. Nie używać service_role. Konfiguracja Supabase już istnieje — nie wykonywać ponownie `supabase init`.

```sh
npm run dev
```

Serwer deweloperski i `npm run preview` używają runtime Cloudflare workerd. Publiczna rejestracja jest domyślnie wyłączona; `ALLOW_SIGNUP=true` jest przeznaczone do lokalnych testów z lokalnym Supabase. Konta dla hostowanych środowisk przygotowuje właściciel projektu.

## Kontrole

```sh
npx astro sync
npm run lint
npx astro check
npm run build
npm run check:deployment
```

`npm run smoke:local` buduje i testuje aplikację z działającym lokalnym Supabase. `npm run smoke` używa przygotowanego konta z `SMOKE_EMAIL` / `SMOKE_PASSWORD` i adresu `BASE_URL`; domyślny tryb `existing` nie tworzy użytkowników.

S-01: `npm run check:access:db` sprawdza izolację danych; `npm run smoke:access:local` dodatkowo sprawdza widoki i sesje. `npm run check:access:ci` powtarza oba smoke na świeżej, izolowanej lokalnej bazie. [Przygotowanie profili, przypisań i instrukcje testów](context/access/README.md). Istniejące konto bez profilu nadal może się zalogować i widzi ekran oczekiwania na konfigurację.

Testy przepływu treningowego, przy działającym lokalnym Supabase:

```sh
npm run check:training:db
npx playwright install chromium
npm run test:e2e:local
```

`check:training:db` stosuje migracje wyłącznie lokalnie i sprawdza m.in. CRUD, wersjonowanie, snapshoty, walidację wyników, korekty, ważność i izolację komentarzy. `test:e2e:local` stosuje lokalne migracje, buduje aplikację, uruchamia podgląd na wolnym porcie 4321, wykonuje Playwright i zatrzymuje podgląd. `npm run test:e2e` uruchamia sam Playwright przeciw już przygotowanej lokalnej aplikacji na `http://127.0.0.1:4321`; wymaga działającego lokalnego Supabase. Dane kont testowych są przygotowywane i sprzątane przez fixture. Komendy służą weryfikacji; aktualne wyniki pozostają zapisane przy zmianie.

Pełny przebieg na świeżej, izolowanej lokalnej bazie uruchamia `npm run check:ci:local`: start własnego projektu Supabase → smoke uwierzytelniania → kontrole dostępu → testy bazy treningów → dwa scenariusze E2E → sprzątanie projektu testowego. Wymaga działającego Dockera i Chromium zainstalowanego przez `npx playwright install chromium`; nie wymaga wcześniejszego uruchomienia projektu Supabase dewelopera. Potrzebuje wolnego portu 4321 dla podglądu aplikacji.

2026-09-14 o 20:45 UTC `npm run test:e2e:local` zakończyło się wynikiem **2/2 PASS**: CRUD treningu, trwałość wyników po odświeżeniu, zakończenie, prywatność komentarza oraz mobilna superseria i korekta z zamiennikiem. Następnie `npm run check:ci:local` potwierdziło na świeżej bazie smoke Auth, dostęp, logikę treningów i ponownie dwa E2E, kończąc z kodem 0. Szczegółowy zakres dowodów oraz stan końcowych kontroli znajdują się w [mapie wymagań](context/changes/training-mvp-cycle/requirements.md).

## Wdrożenie

[Zatwierdzony plan](context/deployment/deploy-plan.md), [konfiguracja usług, sekretów, CI/CD i rollback](context/deployment/README.md), [wyniki weryfikacji](context/deployment/verification.md).

GitHub Actions sprawdza PR i push do `main`. Pierwsza publikacja jest ręczna przez workflow; po jej weryfikacji `DEPLOY_ENABLED=true` włącza wdrożenia staging → produkcja po push do `main`. Prywatne repozytorium: https://github.com/DawidZdunczyk/gymplanner.

Przed publikacją S-01 potrzebny jest osobny zatwierdzony plan zastosowania migracji na obu hostowanych bazach i przygotowania kont. Nowy schemat planów, treningów i komentarzy również wymaga zatwierdzonego planu migracji staging i produkcji przed zdalnym wdrożeniem. Bieżąca implementacja i testy dotyczą środowiska lokalnego; workflow nie migruje zdalnych danych. Zatwierdzenie pierwszego wdrożenia startera nie obejmuje tych nowych migracji.

## Struktura

- `src/pages/`: strony, endpointy uwierzytelniania i `api/training`.
- `src/components/`, `src/layouts/`: komponenty i układy.
- `src/lib/`: integracja Supabase i pomocniki.
- `supabase/`: konfiguracja lokalnego backendu.
- `scripts/`: testy i kontrolowana publikacja.
- `context/foundation/`: wymagania oraz decyzje o stosie i infrastrukturze.

## License

MIT
