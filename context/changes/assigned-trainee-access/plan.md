# Plan implementacji: dostęp do przypisanych podopiecznych

## Przegląd

Implementujemy S-01 (`assigned-trainee-access`): trener korzysta z istniejącego logowania, widzi listę swoich podopiecznych i otwiera kartę wybranej osoby. Podopieczny widzi własną nazwę, przypisanego trenera i informację o przyszłej dostępności treningów. Kontrola dostępu obejmuje również bezpośrednie żądania do bazy.

Źródła: [PRD v1](../../foundation/prd.md), [roadmapa S-01](../../foundation/roadmap.md), kod zbadany 2026-09-14 oraz siedem decyzji użytkownika. Przyjęto średnią złożoność i zatwierdzono trzy fazy. Nie ustalamy budżetu czasu ani szacunków.

## Analiza bieżącego stanu

- `src/lib/supabase.ts:5` tworzy klienta SSR; `getAll` czyta pierwotny nagłówek cookies, a `setAll` zapisuje cookies do odpowiedzi. Brak typów domenowych oraz obsługi dodatkowych nagłówków przekazywanych przez bibliotekę.
- `src/middleware.ts:12` wywołuje `getUser`, a `src/env.d.ts:1` udostępnia wyłącznie użytkownika. Brak profili, ról i przypisań. Ochrona oparta na `startsWith('/dashboard')` wymaga dopasowania rzeczywistej ścieżki oraz jej potomków.
- `src/pages/dashboard.astro:7` zawiera powitanie i wylogowanie; `src/pages/api/auth/signin.ts:19` przekierowuje na stronę główną. Ten redirect jest asercją w `scripts/smoke.mjs` i zmieni się świadomie na `/dashboard`.
- `supabase/config.toml:53` włącza migracje, lecz brak migracji domenowych. Wskazany `seed.sql` również nie istnieje. Lokalne tworzenie kont przez smoke pozostaje odrębne od przygotowywania kont użytkowników.
- `scripts/prepare-ci-supabase.mjs:38` tworzy izolowany projekt, ale kopiuje tylko konfigurację. Bez rozszerzenia tej operacji CI nie zastosuje nowych migracji.
- `scripts/local-smoke.mjs:9` rozpoznaje lokalny backend, weryfikuje nadpisania środowiska i uruchamia dwa tryby. Zwykły smoke sprawdza sesję i obecność wylogowania, a nie uprawnienia do danych.
- Baza nie zawiera testów funkcji treningowych ani runnera przeglądarkowego. Dla S-01 rozwijamy istniejący wzorzec testów HTTP, z rzeczywistym Auth i bazą; wygląd oraz interakcje w przeglądarce pozostają końcową weryfikacją ręczną.

W trakcie badania istniały równoległe poprawki `scripts/smoke.mjs`, `scripts/deployment.test.mjs`, `scripts/deploy.mjs`, `scripts/worker-readiness.mjs` i `wrangler.jsonc`. Zachować ich aktualny stan, szczególnie sprawdzanie nawigacji `Sec-Fetch-Mode: navigate` oraz gotowości Workera. Odniesienia do linii opisują moment badania; przed edycją ponownie odczytać plik. Nie ma wcześniejszego `frame.md`, `research.md` ani `lessons.md` dla tej zmiany.

## Pożądany stan końcowy

### Uzgodnione zachowania

| Obszar              | Decyzja użytkownika                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Relacja             | Podopieczny ma najwyżej jednego bieżącego trenera; trener może mieć wielu podopiecznych.         |
| Role                | Jedna rola na konto: trener albo podopieczny.                                                    |
| Identyfikacja       | Nazwa i unikalny opis nadane operacyjnie; e-mail logowania nie jest udostępniany drugiej osobie. |
| Widok podopiecznego | Własna nazwa, przypisany trener i informacja, że treningi będą dostępne później.                 |
| Po logowaniu        | Bezpośrednio `/dashboard`, który pokazuje panel odpowiedniej roli.                               |
| Brak profilu        | „Konto oczekuje na konfigurację”, zachowana sesja i możliwość wylogowania.                       |
| Wybór podopiecznego | Osobna karta z nazwą i opisem podopiecznego.                                                     |

Dwa konta o nazwie „Anna Nowak” pozostają odrębnymi osobami i są rozróżniane opisem, np. „grupa poranna” oraz „grupa wieczorna”. Tożsamością danych i adresów jest UUID, nigdy nazwa ani opis. Unikalność opisów egzekwuje baza; operator podaje opis zrozumiały dla użytkowników.

### Kontrakt dostępu i odpowiedzi

| Sytuacja                                                                      | Odpowiedź                                                                                                                                            |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anonim otwiera panel lub kartę                                                | `302` do `/auth/signin`; brak danych osobowych. Po poprawnym logowaniu przechodzi na `/dashboard`.                                                   |
| Zalogowany trener                                                             | `200`, własna nazwa i lista wyłącznie jego podopiecznych; brak przypisań to prawdziwy pusty stan.                                                    |
| Trener otwiera przypisanego podopiecznego                                     | `200`, nazwa i opis osoby, powrót do listy; bez niedziałających przycisków treningów.                                                                |
| Obcy, nieistniejący lub nieprawidłowy UUID; podopieczny otwiera kartę trenera | Jednakowa odpowiedź `404`, bez nazw i bez rozróżnienia istnienia obcego konta.                                                                       |
| Podopieczny bez przypisania                                                   | `200`, własna tożsamość i komunikat „Nie masz jeszcze przypisanego trenera”; brak danych innych osób.                                                |
| Użytkownik bez profilu                                                        | `200` na panelu z komunikatem o konfiguracji i wylogowaniem; brak dostępu do kart.                                                                   |
| Błąd odczytu profilu, relacji lub bazy                                        | `503` i komunikat o niedostępności z możliwością ponowienia; nigdy pozorna pusta lista lub pozorny brak profilu.                                     |
| Sesja nieważna lub wygasły refresh token                                      | Powrót do logowania; przejściowej awarii Auth nie przedstawiać jako braku uprawnień.                                                                 |
| Przypisanie odebrane lub zmienione                                            | Następne żądanie z istniejącą sesją korzysta z nowego stanu i odmawia staremu trenerowi dostępu. Już wyświetlona strona nie jest zdalnie czyszczona. |

Nowe widoki używają języka polskiego, `lang="pl"`, czytelnych nagłówków, widocznego fokusu oraz działającego wylogowania. Lista jest kompletna dla ustalonej skali do 9 osób; sortowanie po nazwie i opisie w języku polskim, techniczny UUID rozstrzyga całkowitą równość. Nie deduplikować ani nie obcinać listy.

### Kluczowe odkrycia

- Współdzielenie jednego klienta w ramach żądania zapobiega odczytowi starego cookie przez drugi klient po odświeżeniu sesji w middleware. To zidentyfikowane ryzyko, nie odtworzona awaria obecnej aplikacji.
- Zainstalowane `@supabase/ssr` 0.12.7 przekazuje w drugim argumencie `setAll` nagłówki cache; potwierdzono to w `node_modules/@supabase/ssr/src/types.ts:32`. Trzeba przenieść je do końcowej odpowiedzi, również przekierowania. [Dokumentacja sesji SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
- Polityki dostępu w bazie oraz uprawnienia do operacji są odrębnymi zabezpieczeniami. Nowe tabele wymagają obu, także dla bezpośrednich wywołań Data API. [Dokumentacja RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Czego NIE robimy

- Treningów, planów, wyników, komentarzy i ich historii — to S-02 i dalsze wycinki.
- Rejestracji, zaproszeń, resetu hasła, panelu administracyjnego, samodzielnej edycji profilu ani przypisań.
- Wielu trenerów jednego podopiecznego, wielu ról jednego konta ani przekazywania historii treningów między trenerami.
- Realtime, automatycznego odświeżania listy, wyszukiwarki, paginacji, nowego systemu sesji czy osobnego backendu.
- Włączenia publicznego signup, zmiany ustawień kont produkcyjnych, migracji hostowanych baz ani publikacji. Zatwierdzenie tego planu nie rozszerza planu pierwszego wdrożenia startera.
- Porządkowania całego startera, instalacji nowych frameworków testowych ani zmian niezwiązanych z przepływem S-01.

## Podejście do implementacji

Serwerowe strony Astro odczytują dane przez jeden klient Supabase na żądanie i token zalogowanego użytkownika. Middleware rozpoznaje sesję; pomocnik dostępu rozróżnia brak konfiguracji od awarii i odczytuje bieżący profil. Nie używamy ról zapisanych w edytowalnych metadanych użytkownika ani listy przypisań utrwalonej w JWT.

Profile i bieżące przypisania znajdują się w dwóch tabelach. Klient aplikacji ma wyłącznie potrzebny odczyt; zapis jest operacyjny i uprzywilejowany. Zwykły użytkownik nie może nadać sobie roli, zmienić opisu ani przypisać trenera nawet przez bezpośrednie API. Schemat profilu referuje klucz główny użytkownika Auth; nie udostępniamy tabeli `auth.users`. [Zarządzanie danymi użytkownika](https://supabase.com/docs/guides/auth/managing-user-data).

Nie dodajemy osobnych endpointów JSON do odczytu listy i karty: SSR wystarcza. Przyszłe wycinki rozbudują tę samą granicę dostępu. Testy korzystają z prawdziwych lokalnych sesji; uprzywilejowany klient służy wyłącznie przygotowaniu, kontroli niezmienności po zabronionym zapisie i sprzątaniu danych testowych.

## Krytyczne szczegóły implementacji

### Cykl życia sesji i odpowiedzi

Nie tworzyć klienta globalnego ani kolejnego klienta z pierwotnymi cookies po `getUser`. Cookies oraz nagłówki zwrócone przez bibliotekę muszą dotrzeć do rzeczywistej odpowiedzi po `next()` i po bezpośrednim przekierowaniu. Odpowiedzi spersonalizowane, błędy dostępu i odpowiedzi zapisujące cookies mają `Cache-Control: private, no-store` lub mocniejszą politykę biblioteki; nie mogą trafić do wspólnego cache.

### Kierunek polityk danych

Polityka profilu może odczytywać przypisanie, lecz polityka przypisań nie może odczytywać profilu, tworząc rekurencję. Role końców relacji egzekwować ograniczeniami bazy. Relację sprawdzać ponownie przy każdym zapytaniu, także dla aktywnego JWT po jej odwołaniu.

### Przygotowanie CI

Migracje muszą znaleźć się w izolowanym `SUPABASE_WORKDIR` przed uruchomieniem Supabase. Kopiować wyłącznie jawnie dozwolone artefakty; nie kopiować `.temp`, konfiguracji powiązania z usługą zdalną ani sekretów. Testy nie mogą przypadkowo sprawdzać bazy bez nowego schematu.

## Phase 1: Profile, przypisania i izolacja danych

### Przegląd

Ustanowić minimalny model dostępu oraz dowieść jego działania bez budowania pozostałej domeny treningowej.

### Wymagane zmiany

#### 1. Migracja dostępu

**Plik:** `supabase/migrations/<timestamp>_assigned_trainee_access.sql` — znacznik wygenerować podczas implementacji zgodnie z kolejnością migracji.

**Cel:** Przechowywać przygotowane profile i jedno bieżące przypisanie podopiecznego. Baza odrzuca niespójne relacje niezależnie od aplikacji.

**Kontrakt:**

- `public.profiles`: `id uuid` jako PK i FK do `auth.users(id)`, `role NOT NULL` z wartościami `trainer` / `trainee`, `display_name` i `identification_label` jako obowiązkowe, niepuste teksty po przycięciu. Opis ma unikalność globalną bez rozróżniania wielkości liter i skrajnych spacji; nazwy mogą się powtarzać. E-mail nie jest kopiowany. Techniczne granice obu tekstów: 1–120 znaków.
- `public.trainer_assignments`: `trainee_id` jako PK, `trainer_id NOT NULL` oraz ograniczenie różnych końców relacji. Indeks dla `trainer_id`. Role końców zagwarantować złożonymi FK do unikalnego `(id, role)` w profilach oraz kolumnami `NOT NULL` o stałych, sprawdzanych wartościach `trainer` i `trainee`. Wszystkie składniki złożonych FK muszą być niepuste, aby `NULL` nie omijał sprawdzenia ról. Zmiana roli aktywnie przypisanego profilu zostaje odrzucona.
- Usunięcie konta Auth kaskaduje do jego profilu i bieżących przypisań; S-01 nie udostępnia usuwania kont w aplikacji. Nie dodawać tabel historii ani treningów.
- RLS włączone na obu tabelach w tej samej migracji. Cofnąć zbędne uprawnienia `PUBLIC`, `anon` i `authenticated`; `authenticated` otrzymuje wyłącznie `SELECT`, ograniczony politykami. Użytkownicy aplikacji nie mają `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` ani możliwości nadania sobie praw.
- Profil odczytuje właściciel oraz drugi koniec jego istniejącego przypisania. Trener nie widzi obcych trenerów, a podopieczny nie widzi innych podopiecznych. Przypisanie odczytują tylko jego dwa końce poprzez porównanie UUID z `auth.uid()`; polityka nie odpytuje profili. Brak polityk publicznego odczytu, widoków omijających RLS i funkcji `SECURITY DEFINER`.
- Operacyjny zapis i tworzenie fixture mają jawnie potrzebne uprawnienia uprzywilejowanego klienta. Jego klucz nigdy nie trafia do runtime aplikacji.

#### 2. Typy i przygotowanie istniejących kont

**Pliki:** `src/types/database.ts`, `supabase/admin/provision-access.sql`, `context/access/README.md`.

**Cel:** Dać implementatorowi typowany model oraz operatorowi powtarzalną procedurę przygotowania kont bez interfejsu administracyjnego.

**Kontrakt:** Typy `Database` pochodzą z lokalnego schematu (`npx --no-install supabase gen types --local --schema public`); nie odczytywać schematu zdalnego. Szablon SQL przyjmuje istniejące UUID Auth, role, nazwy i opisy, a profil i przypisanie zapisuje transakcyjnie. Brak automatycznego nadawania roli nowo utworzonemu użytkownikowi i brak upsertu po cichu zmieniającego rolę lub zastępującego relację. Dokument opisuje osobną, jawną transakcję zmiany/odwołania przypisania i utratę dostępu przy następnym żądaniu. Bez prawdziwych danych i haseł w repozytorium.

#### 3. Testy prawdziwego dostępu do bazy

**Pliki:** `scripts/access-fixtures.mjs`, `scripts/access-checks.mjs`, `scripts/local-access.mjs`, `scripts/access-runner.test.mjs`, `package.json`.

**Cel:** Sprawdzić izolację na prawdziwym Supabase, a nie wyłącznie na ukrytych elementach interfejsu.

**Kontrakt:** Nowe `npm run check:access:db` uruchamia `local-access.mjs --db-only`. Runner rozpoznaje backend przez lokalne `supabase status`, respektuje `SUPABASE_WORKDIR` i waliduje loopback przed pierwszym zapisem. Stosuje wyłącznie oczekujące migracje przez `supabase db push --local`, nigdy reset ani domyślny push zdalny. Tworzy losowe konta obu ról, obcą parę, podopiecznego bez przypisania i konto bez profilu. Dane oraz hasła pozostają w pamięci; cleanup dotyczy tylko UUID utworzonych w tym przebiegu. Klucz administracyjny pozostaje w procesie runnera, nie w środowisku builda i Workera. Asercje RLS używają publicznego klucza i sesji właściwego użytkownika.

Macierz testów: odczyt własnego profilu i właściwej pary; odmowa obcej pary także po znanym UUID; odmowa anonimowa; brak roli nie daje danych innych osób; brak relacji nie daje danych trenera; próby zmiany roli, profilu i przypisań nie zmieniają bazy; edytowalne metadane Auth nie nadają roli; odwołanie relacji odbiera dostęp ze starym JWT. Ograniczenia odrzucają drugiego trenera, błędne role końców, identyczne końce, `NULL` w roli profilu lub składniku FK oraz powtórny opis. Po zabronionym zapisie sprawdzić niezmienność danych, nie tylko kod HTTP. Testy runnera sprawdzają odmowę hostowanego celu i kolidującej konfiguracji przed użyciem klienta administracyjnego.

### Kryteria sukcesu

#### Weryfikacja automatyczna

- Migracja stosuje się na lokalnej bazie; ponowne uruchomienie nie kasuje ani nie duplikuje danych, a ograniczenia modelu odrzucają nieprawidłowe profile i relacje.
- `npm run check:access:db` przechodzi pełną macierz izolacji z rzeczywistymi sesjami obu ról i kontem bez profilu.
- `node --test scripts/access-runner.test.mjs` potwierdza lokalny cel i brak zapisów przy odrzuconej konfiguracji.
- Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`.

#### Weryfikacja ręczna

Brak odrębnej bramki ręcznej dla fazy danych. Sprawdzenie widoków i procedury operatora znajduje się w fazie 3.

## Phase 2: Panel trenera i podopiecznego

### Przegląd

Połączyć zweryfikowane dane z istniejącą sesją i dostarczyć widoczne zachowanie S-01.

### Wymagane zmiany

#### 1. Kontekst żądania i obsługa sesji

**Pliki:** `src/lib/supabase.ts`, `src/lib/access.ts`, `src/env.d.ts`, `src/middleware.ts`, `scripts/access-context.test.mjs`.

**Cel:** Udostępnić jeden typowany klient na żądanie oraz jednoznacznie rozróżnić sesję, profil i awarię.

**Kontrakt:** `App.Locals` otrzymuje klienta `SupabaseClient<Database> | null` i typowany stan dostępu. `access.ts` rozróżnia anonimowego, nieprzygotowane konto, obie role i niedostępność. Profil odczytywany dopiero dla chronionych widoków, bez wymagania profilu do logowania i wylogowania. Chroniona ścieżka to dokładnie `/dashboard` i `/dashboard/…`, nie dowolny tekst zaczynający się tak samo. Middleware zachowuje walidację użytkownika przez Auth, rozróżnia błędy nieważnej sesji od awarii i przenosi cookies/nagłówki do każdej odpowiedzi. Test pomocnika może kontrolować błędy klienta; testów polityk RLS nie zastępować atrapą.

#### 2. Przekierowanie po logowaniu

**Pliki:** `src/pages/api/auth/signin.ts`, `src/pages/api/auth/signout.ts`, `src/pages/api/auth/signup.ts`, `scripts/smoke.mjs`.

**Cel:** Wejść bezpośrednio do właściwego panelu i wykorzystać ten sam klient żądania we wszystkich istniejących operacjach Auth.

**Kontrakt:** Sukces logowania daje `302 /dashboard`, bez dowolnego adresu z parametru użytkownika. Zachować formularz e-mail/hasło, blokadę signup i dotychczasowe wylogowanie do `/`. Sprawdzić serwerowo typy i brak pustych pól logowania; błędy pokazywać stałym komunikatem bez surowej treści dostawcy. Dostosować asercję udanego logowania w smoke, zachowując nowe kontrole prawdziwej nawigacji i pozostałe zabezpieczenia. Zwykłe konto smoke bez profilu może otrzymać ekran oczekiwania `200` z wylogowaniem; to dowód Auth, nie dowód dostępu trenera.

#### 3. Lista, karta i widok podopiecznego

**Pliki:** `src/pages/dashboard.astro`, `src/pages/dashboard/trainees/[traineeId].astro`, `src/components/trainees/TraineeList.astro`.

**Cel:** Zastąpić powitanie startera użytecznym panelem ról i jednoznacznym wyborem osoby.

**Kontrakt:** Panel realizuje tabelę odpowiedzi z sekcji „Pożądany stan końcowy”. Trener widzi nazwy i opisy przypisanych osób, a link prowadzi do `/dashboard/trainees/<uuid>`. Karta potwierdza rolę trenera oraz bieżące przypisanie w zapytaniu z RLS; nie ufa identyfikatorowi z URL. Podopieczny widzi swoje oznaczenie i nazwę/opis przypisanego trenera, bez jego e-maila i listy innych podopiecznych. Brak profilu, brak przypisania i błąd zapytania są osobnymi stanami. Nie dodawać formularzy edycji ani atrap treningów. Zastosować istniejący układ, alias `@/*` i `cn()` tam, gdzie łączone są klasy warunkowe.

#### 4. Test przepływu aplikacji

**Pliki:** `scripts/local-access.mjs`, `scripts/access-checks.mjs`, `package.json`.

**Cel:** Dowieść, że widoki i sesje respektują tę samą granicę danych co bezpośrednie API.

**Kontrakt:** Nowe `npm run smoke:access:local` uruchamia runner w pełnym trybie: kontrola celu i nadpisań środowiska → migracje → lokalne fixture → build z `ALLOW_SIGNUP=false` → preview → testy → cleanup. Preview używa wolnego portu aplikacji zgodnie z istniejącym runnerem; gdy port jest zajęty, przerwać, nie zatrzymywać cudzego procesu. Każdy użytkownik ma własny cookie jar. Sprawdzać widoczne nazwy, opisy, linki i statusy, nie tylko obecność wylogowania. Zachować kontrolę `Origin` dla POST.

### Kryteria sukcesu

#### Weryfikacja automatyczna

- `npm run smoke:access:local` potwierdza panel i kartę trenera, panel podopiecznego z nazwą trenera, puste stany, konto bez profilu oraz jednolite `404` dla obcego i błędnego UUID.
- Test sesji potwierdza ponowny odczyt z cookies, rzeczywiste odświeżenie sesji, brak dostępu po wylogowaniu i po odebraniu relacji; odpowiedzi spersonalizowane oraz zapisujące cookies mają zakaz współdzielonego cache.
- `node --experimental-strip-types --test scripts/access-context.test.mjs` odróżnia brak profilu od błędu i sprawdza bezpieczne mapowanie błędów Auth oraz danych. Pomocnik nie wymaga importów runtime Astro w tych testach.
- Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`, następnie `npm run smoke:local` oraz `npm run check:deployment`.

#### Weryfikacja ręczna

Kontrola w przeglądarce jest zebrana w końcowej fazie 3; po tej fazie można kontynuować weryfikację automatyczną bez dodatkowego zatwierdzenia.

## Phase 3: Powtarzalne sprawdzenie S-01 i integracja CI

### Przegląd

Włączyć weryfikację nowej granicy dostępu do istniejącego procesu, bez osłabiania izolacji i bez dodawania publikacji danych.

### Wymagane zmiany

#### 1. Izolowane migracje i testy w CI

**Pliki:** `scripts/prepare-ci-supabase.mjs`, `scripts/deployment.test.mjs`, `.github/workflows/ci.yml`.

**Cel:** CI ma testować rzeczywisty nowy schemat przed możliwością publikacji aplikacji.

**Kontrakt:** Kopiować `supabase/migrations/` do izolowanego projektu przed `supabase start`. Seed nie jest potrzebny — fixture tworzy runner. Wyłączyć odwołanie do nieistniejącego seed w izolowanej konfiguracji; nie kopiować `supabase/admin/` ani dowolnych plików roboczych. Test przygotowania projektu sprawdza identyczność migracji, niezmienność konfiguracji źródłowej i brak plików poza listą dozwolonych. Zachować testy wolnych portów i unikalnego projektu.

W istniejącym zadaniu `smoke`, po `npm run smoke:local`, uruchomić `npm run smoke:access:local` oraz testy pomocników. Oba runnery działają kolejno i respektują ten sam `SUPABASE_WORKDIR`; każdy zatrzymuje własny preview w `finally`. Zatrzymanie izolowanego Supabase pozostaje w `always()`. Zależność wdrożenia od powodzenia testów pozostaje. Nie dodawać zdalnych migracji ani sekretu administracyjnego do workflow.

#### 2. Dokumentacja obsługi

**Pliki:** `README.md`, `context/access/README.md`.

**Cel:** Operator i implementator potrafią uruchomić sprawdzenia i rozpoznać stan nieprzygotowanego konta.

**Kontrakt:** Opisać nowe polecenia, lokalne wymagania, bezpieczne przygotowanie profili i przypisań oraz odwołanie dostępu. Oddzielić test Auth bez profilu od testu ról. Zapisać, że przed późniejszą publikacją wymagane są migracje obu hostowanych baz i kontrola kont według osobnego zatwierdzonego planu. Nie dokumentować implementacji S-02 jako już dostępnej.

### Kryteria sukcesu

#### Weryfikacja automatyczna

- `npm run check:deployment` potwierdza poprawne kopiowanie migracji i zachowanie istniejących zabezpieczeń przygotowania CI oraz wdrożenia.
- Cały przebieg `smoke:local` → `smoke:access:local` przechodzi na świeżym, izolowanym projekcie Supabase; nie używa hostowanej bazy, nie wymaga profilu dla podstawowego konta smoke i sprząta własne fixture oraz preview.
- Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`; `git diff --check` nie zgłasza błędów.

#### Weryfikacja ręczna

- W przeglądarce trener loguje się bezpośrednio do panelu, rozróżnia osoby o tej samej nazwie, otwiera właściwą kartę i wraca do listy; widoki są czytelne na telefonie oraz obsługiwane klawiaturą.
- Podopieczny widzi własną nazwę i swojego trenera; konto bez przypisania i konto bez profilu pokazują właściwe komunikaty; wylogowanie odbiera dostęp, także po ponownym otwarciu panelu.
- Operator na lokalnych kontach wykonuje udokumentowaną zmianę przypisania; stary trener traci dostęp przy kolejnym odczycie, a nowy widzi wyłącznie właściwą osobę. Niedostępność lokalnego backendu daje komunikat błędu, nie pustą listę.

Po zaliczeniu automatycznych sprawdzeń tej fazy zatrzymać się na potwierdzenie powyższych testów ręcznych przez użytkownika. Nie oznaczać ich jako wykonane na podstawie testu HTTP.

## Strategia testowania

### Testy jednostkowe i kontraktowe

Testować rozróżnienie błędów oraz zabezpieczenia runnera, bo pomylenie stanu pustego z awarią lub celu lokalnego z hostowanym ma realne konsekwencje. Nie dodawać testów odtwarzających strukturę komponentów. `access-context.test.mjs` może importować czysty moduł TypeScript przez eksperymentalne usuwanie typów Node 22.22.3; moduł nie może zależeć od wirtualnego `astro:env/server` ani nierozwiązywalnych aliasów runtime.

### Testy integracyjne

Fixture obejmuje dwie pary trener–podopieczny, nieprzypisanego podopiecznego oraz użytkownika bez profilu. Zmiana przypisania podczas testu daje również pustą listę trenera. Konta tworzyć raz na przebieg z losowymi hasłami, bez nadmiarowych ponownych logowań. Prawdziwe JWT użytkowników służą do asercji; token administratora nie dowodzi działania RLS.

Przetestować wszystkie operacje zapisu dostępne przez Data API, w tym upsert, a następnie porównać stan fixture przez uprzywilejowanego klienta. Podmiana metadanych Auth, UUID w URL lub filtra Data API nie może rozszerzyć dostępu. Para po zmianie przypisania ma działać bez nowego logowania. Test odświeżania sesji kontroluje metadane wygaśnięcia zapisanej sesji bez zmiany podpisanego JWT, wykonuje rzeczywisty refresh lokalnego Auth i sprawdza nowe cookies oraz kolejny odczyt.

Nie włączać rejestracji hostowanej. Nowy runner nie używa ścieżki signup; konta testowe tworzy administracyjnie wyłącznie w lokalnym backendzie. Kluczy, haseł, nagłówków Cookie i pełnych odpowiedzi Auth nie wypisywać w logach ani artefaktach. Nie resetować istniejącej bazy dewelopera.

### Kroki testowania ręcznego

Wykonać trzy kryteria fazy 3 na danych lokalnych, w oddzielnych sesjach przeglądarki. Sprawdzić co najmniej widok telefonu i komputera, fokus linków oraz komunikaty stanów pustych. Kontrolę niedostępności przeprowadzić wyłącznie na własnej instancji testowej i po niej ją przywrócić.

## Zagadnienia dotyczące wydajności

Przy ustalonej skali do 9 osób pełna lista bez paginacji jest wystarczająca. Odczyt listy nie może wykonywać osobnego zapytania dla każdej osoby; filtrowanie według przypisania ma zachodzić w bazie. Wykorzystać indeks relacji trenera i klucze profili. Nie wprowadzać cache danych osobowych ani liczbowego budżetu opóźnień, którego PRD nie ustala.

## Uwagi dotyczące migracji

Zmiana jest addytywna: nowe tabele i uprawnienia, bez przepisywania `auth.users` oraz bez automatycznego profilowania istniejących kont. Stare konta bez profilu zachowują logowanie i wylogowanie, ale nie dostają danych domenowych. Konta z przygotowanym profilem i bez relacji mają poprawny pusty stan.

Lokalnie używać `db push --local`, bez `db reset`; typy generować z lokalnego schematu. W CI migracje trafiają do świeżego projektu przed startem. Na hostowanych środowiskach kolejność przyszłego wdrożenia to zatwierdzony plan → migracje i uprawnienia → przygotowanie kont → publikacja → testy; operacje te nie są wykonywane przez tę zmianę. Cofnięcie aplikacji do startera nie wymaga usuwania nowych tabel. Przy błędzie migracji przygotować poprawkę naprzód, bez automatycznego kasowania danych.

## References

- [PRD: FR-001, FR-002, US-01 i kontrola dostępu](../../foundation/prd.md)
- [Roadmapa: S-01](../../foundation/roadmap.md)
- [Stos i ograniczenia](../../foundation/tech-stack.md)
- [Plan pierwszego wdrożenia startera](../../deployment/deploy-plan.md)
- Kod: `src/lib/supabase.ts:5`, `src/middleware.ts:12`, `src/env.d.ts:1`, `src/pages/dashboard.astro:7`, `src/pages/api/auth/signin.ts:19`.
- Testy i CI: `scripts/smoke.mjs`, `scripts/local-smoke.mjs`, `scripts/prepare-ci-supabase.mjs:38`, `scripts/deployment.test.mjs`, `.github/workflows/ci.yml`.
- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [sesje SSR](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [dane użytkowników](https://supabase.com/docs/guides/auth/managing-user-data). Sprawdzone 2026-09-14; szczegóły `setAll` porównano z zainstalowanym pakietem.
- Kontrakt śledzenia wykonania: `.agents/skills/10x-plan/references/progress-format.md`. Nazwy nagłówków faz i sekcji poniżej zachowują jego format maszynowy.

## Progress

> `- [ ]` oznacza oczekujące, `- [x]` wykonane. Po ukończeniu kroku dopisz ` — <commit sha>`. Tytuły i numery kroków pozostają stałe; jest to jedyne miejsce pól wyboru w planie.

### Phase 1: Profile, przypisania i izolacja danych

#### Automated

- [x] 1.1 Migracja stosuje się na lokalnej bazie; ponowne uruchomienie nie kasuje ani nie duplikuje danych, a ograniczenia modelu odrzucają nieprawidłowe profile i relacje. — fafbf2a
- [x] 1.2 `npm run check:access:db` przechodzi pełną macierz izolacji z rzeczywistymi sesjami obu ról i kontem bez profilu. — fafbf2a
- [x] 1.3 `node --test scripts/access-runner.test.mjs` potwierdza lokalny cel i brak zapisów przy odrzuconej konfiguracji. — fafbf2a
- [x] 1.4 Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`. — fafbf2a

### Phase 2: Panel trenera i podopiecznego

#### Automated

- [x] 2.1 `npm run smoke:access:local` potwierdza panel i kartę trenera, panel podopiecznego z nazwą trenera, puste stany, konto bez profilu oraz jednolite `404` dla obcego i błędnego UUID. — b434ca6
- [x] 2.2 Test sesji potwierdza ponowny odczyt z cookies, rzeczywiste odświeżenie sesji, brak dostępu po wylogowaniu i po odebraniu relacji; odpowiedzi spersonalizowane oraz zapisujące cookies mają zakaz współdzielonego cache. — b434ca6
- [x] 2.3 `node --experimental-strip-types --test scripts/access-context.test.mjs` odróżnia brak profilu od błędu i sprawdza bezpieczne mapowanie błędów Auth oraz danych. Pomocnik nie wymaga importów runtime Astro w tych testach. — b434ca6
- [x] 2.4 Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`, następnie `npm run smoke:local` oraz `npm run check:deployment`. — b434ca6

### Phase 3: Powtarzalne sprawdzenie S-01 i integracja CI

#### Automated

- [x] 3.1 `npm run check:deployment` potwierdza poprawne kopiowanie migracji i zachowanie istniejących zabezpieczeń przygotowania CI oraz wdrożenia.
- [x] 3.2 Cały przebieg `smoke:local` → `smoke:access:local` przechodzi na świeżym, izolowanym projekcie Supabase; nie używa hostowanej bazy, nie wymaga profilu dla podstawowego konta smoke i sprząta własne fixture oraz preview.
- [x] 3.3 Na Node 22.22.3 przechodzą kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`; `git diff --check` nie zgłasza błędów.

#### Manual

- [ ] 3.4 W przeglądarce trener loguje się bezpośrednio do panelu, rozróżnia osoby o tej samej nazwie, otwiera właściwą kartę i wraca do listy; widoki są czytelne na telefonie oraz obsługiwane klawiaturą.
- [ ] 3.5 Podopieczny widzi własną nazwę i swojego trenera; konto bez przypisania i konto bez profilu pokazują właściwe komunikaty; wylogowanie odbiera dostęp, także po ponownym otwarciu panelu.
- [ ] 3.6 Operator na lokalnych kontach wykonuje udokumentowaną zmianę przypisania; stary trener traci dostęp przy kolejnym odczycie, a nowy widzi wyłącznie właściwą osobę. Niedostępność lokalnego backendu daje komunikat błędu, nie pustą listę.
