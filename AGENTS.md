# Repository Guidelines

GymPlanner to aplikacja webowa dla trenera i podopiecznego, obecnie ze szkieletem Astro 7, React 19, TypeScript 6, Tailwind 4 i Supabase. Docelowe środowisko to Cloudflare Workers; funkcje treningowe pozostają do implementacji.

## Zasady i weryfikacja

- Nie zapisuj do `context/archive/`. Dla zarchiwizowanego celu przerwij i wskaż `/10x-new`.
- Nie dodawaj sekretów do repozytorium. Reguły wykluczania plików: @.gitignore.
- Sekrety przekazuj przez zmienne środowiskowe, nie rozmowę. Produkcję zmieniaj dopiero po zatwierdzeniu planu przez użytkownika.
- Usuwanie produkcyjnej bazy lub projektu i rotację głównego sekretu pozostaw człowiekowi. Tokeny ograniczaj do projektu, bez uprawnień do DNS i rozliczeń.
- Przed zakończeniem zmiany kodu uruchom kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`.
- `npm run dev` uruchamia lokalny serwer; pozostałe skrypty: @package.json.

## Kontekst i struktura

- Wymagania produktu: @context/foundation/prd.md; ustalenia discovery: @context/foundation/shape-notes.md; pierwotne notatki: @idea-notes.md.
- Wybór stosu: @context/foundation/tech-stack.md. Rejestracja ze startera nie jest wymaganiem MVP; AI jest opcjonalne.
- Zachowaj istniejący `context/` podczas bootstrapu.
- Organizuj dokumentację zgodnie z @context/foundation/README.md i @context/changes/README.md.
- `src/pages/` zawiera strony i endpointy `api/auth/`; `src/components/` komponenty; `src/layouts/` układy; `src/lib/` integracje i pomocniki; `public/` zasoby; `supabase/` konfigurację backendu.

## Konwencje kodu

- Stosuj alias `@/*` z @tsconfig.json i istniejący helper `cn()` z @src/lib/utils.ts do łączenia klas.
- Reguły TypeScript/React/Astro: @eslint.config.js; formatowanie: @.prettierrc.json.
- Sesję i użytkownika obsługuje @src/middleware.ts. Ochrona obejmuje obecnie `/dashboard`; uprawnienia trener–podopieczny wymagają implementacji według PRD.
- Klient Supabase w @src/lib/supabase.ts korzysta z serwerowych zmiennych zadeklarowanych w @astro.config.mjs. Konfiguracja lokalna: @.env.example i @README.md.

## Testy i CI

- `npm run smoke` uruchamia @scripts/smoke.mjs w trybie `existing`: wymaga przygotowanego konta (`SMOKE_EMAIL`, `SMOKE_PASSWORD`) i nie tworzy użytkowników. `npm run smoke:local` sprawdza oba tryby na lokalnym Supabase i tworzy wyłącznie lokalne konto testowe.
- `npm run check:deployment` uruchamia testy zabezpieczeń wdrożenia przez wbudowany `node:test`; nie ma skryptu `npm test`.
- @.github/workflows/ci.yml sprawdza lint, typy, build i logowanie dla `main`. Ręczne pierwsze wdrożenie i kolejne przy `DEPLOY_ENABLED=true`: staging → smoke → produkcja → smoke, ten sam SHA. Sekrety publikacji tylko na `main`, poza PR.
- Używaj Node 22.22.3 z @.nvmrc, także w CI. Wyniki wdrożenia i lokalnych testów: @context/deployment/verification.md.
- Repozytorium ma historię Git i gałąź `main`; zachowuj istniejące commity, bez force-push.

## Infrastruktura

Przed wdrożeniem użyj `/10x-infra-research`, następnie przygotuj plan w Plan Mode. Zapisz zatwierdzony plan do `context/deployment/deploy-plan.md`; dopiero po zatwierdzeniu zmieniaj produkcję. Stosuj konfigurację Workers z @wrangler.jsonc. Procedura badania platform: @.agents/skills/10x-infra-research/SKILL.md.

Pierwszy plan wdrożenia został zatwierdzony: @context/deployment/deploy-plan.md. Instrukcje konfiguracji: @context/deployment/README.md. Publiczna rejestracja domyślnie wyłączona (`ALLOW_SIGNUP=false`); nie włączaj jej na hostowanych środowiskach.
