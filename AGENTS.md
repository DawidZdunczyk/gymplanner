# Repository Guidelines

GymPlanner to aplikacja webowa dla trenera i podopiecznego na Astro 7, React 19, TypeScript 6, Tailwind 4 i Supabase. Docelowe środowisko to Cloudflare Workers. Lokalna implementacja obejmuje przypisania trener–podopieczny, plany i tygodniowe jednostki, superserie, wyniki, oceny, komentarze oraz korekty z zachowaną rozpiską. Nowy schemat treningowy oczekuje na zatwierdzony plan zdalnego wdrożenia; stan dowodów: @context/changes/training-mvp-cycle/requirements.md.

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
- `src/pages/` zawiera strony i endpointy `api/auth/` oraz `api/training`; `src/components/` komponenty; `src/layouts/` układy; `src/lib/` integracje i pomocniki; `public/` zasoby; `supabase/` konfigurację backendu.

## Konwencje kodu

- Stosuj alias `@/*` z @tsconfig.json i istniejący helper `cn()` z @src/lib/utils.ts do łączenia klas.
- Reguły TypeScript/React/Astro: @eslint.config.js; formatowanie: @.prettierrc.json.
- Sesję i użytkownika obsługuje @src/middleware.ts. Ochrona obejmuje `/dashboard` i podścieżki; aktualne przypisania kontrolują @src/lib/access.ts oraz RLS. Operacje treningowe używają @src/lib/training-contract.ts, @src/lib/training.ts i `POST /api/training`; baza atomowo sprawdza wersję, stan i dostęp. Rozpoczęte treningi korzystają ze snapshotu, a prywatne komentarze są filtrowane przed przekazaniem danych trenerowi.
- Klient Supabase w @src/lib/supabase.ts korzysta z serwerowych zmiennych zadeklarowanych w @astro.config.mjs. Konfiguracja lokalna: @.env.example i @README.md.

## Testy i CI

- `npm run smoke` uruchamia @scripts/smoke.mjs w trybie `existing`: wymaga przygotowanego konta (`SMOKE_EMAIL`, `SMOKE_PASSWORD`) i nie tworzy użytkowników. `npm run smoke:local` sprawdza oba tryby na lokalnym Supabase i tworzy wyłącznie lokalne konto testowe.
- `npm run check:deployment` uruchamia testy zabezpieczeń wdrożenia przez wbudowany `node:test`; nie ma skryptu `npm test`.
- `npm run check:training:db` stosuje migracje i sprawdza logikę treningów na działającym lokalnym Supabase. Nie kieruj go na hostowane środowisko.
- Przed testami przeglądarkowymi zainstaluj Chromium: `npx playwright install chromium`. `npm run test:e2e:local` przygotowuje lokalne migracje, build i podgląd na wolnym porcie 4321, uruchamia testy oraz zatrzymuje podgląd. `npm run test:e2e` uruchamia sam Playwright na już przygotowanej lokalnej aplikacji; oba wymagają lokalnego Supabase.
- `npm run check:ci:local` sam tworzy świeży, izolowany lokalny projekt Supabase, wykonuje smoke uwierzytelniania → kontrole dostępu → testy bazy treningów → dwa E2E, po czym sprząta projekt testowy. Wymaga Dockera, Chromium i wolnego portu 4321; nie wymaga uruchomionego projektu Supabase dewelopera. Bieżące dowody i granice pokrycia: @context/changes/training-mvp-cycle/requirements.md.
- @.github/workflows/ci.yml sprawdza lint, typy, build i logowanie dla `main`. Ręczne pierwsze wdrożenie i kolejne przy `DEPLOY_ENABLED=true`: staging → smoke → produkcja → smoke, ten sam SHA. Sekrety publikacji tylko na `main`, poza PR.
- Używaj Node 22.22.3 z @.nvmrc, także w CI. Wyniki wdrożenia i lokalnych testów: @context/deployment/verification.md.
- Repozytorium ma historię Git i gałąź `main`; zachowuj istniejące commity, bez force-push.

## Infrastruktura

Przed wdrożeniem użyj `/10x-infra-research`, następnie przygotuj plan w Plan Mode. Zapisz zatwierdzony plan do `context/deployment/deploy-plan.md`; dopiero po zatwierdzeniu zmieniaj produkcję. Stosuj konfigurację Workers z @wrangler.jsonc. Procedura badania platform: @.agents/skills/10x-infra-research/SKILL.md.

Pierwszy plan wdrożenia został zatwierdzony: @context/deployment/deploy-plan.md. Instrukcje konfiguracji: @context/deployment/README.md. Publiczna rejestracja domyślnie wyłączona (`ALLOW_SIGNUP=false`); nie włączaj jej na hostowanych środowiskach.

Pierwszy plan nie zatwierdza migracji S-01 ani nowego schematu treningów. Ich publikacja wymaga osobnego zatwierdzonego planu migracji staging i produkcji oraz przygotowania kont. Bieżąca funkcjonalność treningowa i jej weryfikacja dotyczą środowiska lokalnego.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 2, Lekcja 3

Przejrzyj kod wygenerowany przez AI przed scaleniem za pomocą **łańcucha przeglądu implementacji**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` to główny temat lekcji. Przegląd to brama jakości, a nie instrukcja naprawiania każdego znalezionego problemu.

### Router zadań - Od czego zacząć

| Umiejętność                             | Użyj, gdy                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Przegląd kodu (główny temat lekcji)** |                                                                                                                                                                                                                                                                           |
| `/10x-impl-review <change-id>`          | Zaimplementowałeś kod i chcesz przeprowadzić ustrukturyzowany przegląd przed scaleniem. Umiejętność sprawdza zgodność z planem, dyscyplinę zakresu, bezpieczeństwo i jakość, architekturę, spójność wzorców i kryteria sukcesu, a następnie przedstawia wyniki do triażu. |
| **Powtarzający się wynik lekcji**       |                                                                                                                                                                                                                                                                           |
| `/10x-lesson`                           | Znaleziony problem ujawnia powtarzającą się regułę projektu lub wzorzec błędu agenta. Zapisz go w `context/foundation/lessons.md` zamiast traktować jako jednorazową notatkę.                                                                                             |

### Dyscyplina triażu

- Ważność mówi, jak zły jest problem. Wpływ mówi, jak ważna jest decyzja teraz.
- Prawidłowe wyniki: napraw teraz, napraw inaczej, pomiń, zaakceptuj jako ryzyko, zapisz jako powtarzającą się regułę (`/10x-lesson`), nie zgadzam się.
- Napraw krytyczne problemy. Nie marnuj godzin na obserwacje o niskim wpływie tylko dlatego, że agent je znalazł.
- Świadome pomijanie problemów o niskim wpływie jest prawidłowym wynikiem przeglądu, a nie zaniedbaniem.
- Jeśli nie zgadzasz się z problemem, zapisz dlaczego. Błędne rozumowanie agenta to również sygnał.

### Granice przeglądu

- Ta lekcja dotyczy przeglądu zaimplementowanego kodu. Nie tworzy planu, nie wykonuje nowych faz ani nie uczy przeglądu CI.
- Strategia testowania i bramy jakości zostaną wprowadzone w Module 3.
- Nie używaj `/10x-contract` jako wyniku triażu w tej lekcji.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/plan.md` - oczekiwana umowa implementacyjna
- `context/changes/<change-id>/reviews/` - wynik przeglądu
- `context/foundation/lessons.md` - powtarzające się lekcje

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
