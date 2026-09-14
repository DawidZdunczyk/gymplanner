# GymPlanner

Aplikacja dla trenera i podopiecznego do planowania treningów i zapisywania wyników. Obecnie gotowy jest starter: strona główna, logowanie, dashboard i wylogowanie. Funkcje treningowe i uprawnienia domenowe pozostają do implementacji.

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

## Wdrożenie

[Zatwierdzony plan](context/deployment/deploy-plan.md), [konfiguracja usług, sekretów, CI/CD i rollback](context/deployment/README.md), [wyniki weryfikacji](context/deployment/verification.md).

GitHub Actions sprawdza PR i push do `main`. Pierwsza publikacja jest ręczna przez workflow; po jej weryfikacji `DEPLOY_ENABLED=true` włącza wdrożenia staging → produkcja po push do `main`. Prywatne repozytorium: https://github.com/DawidZdunczyk/gymplanner.

## Struktura

- `src/pages/`: strony i endpointy uwierzytelniania.
- `src/components/`, `src/layouts/`: komponenty i układy.
- `src/lib/`: integracja Supabase i pomocniki.
- `supabase/`: konfiguracja lokalnego backendu.
- `scripts/`: testy i kontrolowana publikacja.
- `context/foundation/`: wymagania oraz decyzje o stosie i infrastrukturze.

## License

MIT
