---
project: GymPlanner
researched_at: 2026-09-14
recommended_platform: Cloudflare Workers Free + Supabase Free
runner_up: Netlify Free + Supabase Free
context_type: mvp
decision_status: accepted
accepted_at: 2026-09-14
tech_stack:
  language: TypeScript 6.0.3
  framework: Astro 7.3.2 + React 19.2.6
  runtime: Cloudflare workerd; Node.js for tooling
---

## Recommendation

**Wdróż MVP na Cloudflare Workers Free, z Supabase Free jako bazą PostgreSQL i usługą uwierzytelniania.** Użytkownik wybrał tę rekomendację po przedstawieniu porównania platform i trzech analiz ryzyka. Zatwierdzenie decyzji infrastrukturalnej nie jest zatwierdzeniem planu wdrożenia.

Cloudflare uzyskał 34/34 punkty w przyjętej ocenie technicznej i dopasowaniu do projektu: umożliwia tani start i wykorzystuje już zainstalowany adapter. Przy 10–100 tys. lekkich żądań miesięcznie koszt usług może wynosić 0 USD, pod warunkiem przestrzegania limitów CPU, transferu, bazy i pozostałych usług. Bez pomiarów pełnych funkcji treningowych nie można zagwarantować darmowego działania. Własna domena, poczta i opcjonalne AI nie są zawarte w tej prognozie. [Cennik Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Supabase](https://supabase.com/pricing).

### Kontekst i odpowiedzi z wywiadu

- Brak potrzeby WebSockets, stałych połączeń i procesów pozostających aktywnych między żądaniami.
- Priorytet: najniższy miesięczny koszt, najlepiej bez opłat. Nie ustalano budżetu czasu.
- Brak wcześniejszego doświadczenia z platformami hostingowymi.
- Odbiorcy: Polska; brak potrzeby optymalizacji wielokontynentalnej.
- Osobni dostawcy hostingu i bazy są akceptowani; pozostaje wybrane Supabase.
- PRD: mała skala, trwałe wyniki treningów, kontrola dostępu trener–podopieczny, brak fałszywych potwierdzeń zapisu. AI jest opcjonalne.
- Lokalnie sprawdzono: Astro 7.3.2, adapter Cloudflare 14.3.1, Wrangler 4.131.1. Obecny build działa; funkcje treningowe i uprawnienia domenowe pozostają do implementacji. Nie wykonywano wdrożenia ani pomiarów produkcyjnych.

## Platform Comparison

Ocena jest heurystyką porównawczą, nie benchmarkiem. Z = zaliczone (2), C = częściowo (1), N = niezaliczone (0). Wagi: CLI ×3, zarządzanie ×3, dokumentacja ×2, API wdrożeniowe ×3, MCP/integracja ×1; maksymalnie 24 punkty techniczne. CLI obejmuje udokumentowane nieinteraktywne API, więc brak osobnego polecenia rollback sam w sobie nie dyskwalifikuje platformy.

| Platforma          | CLI-first | Managed/serverless | Dokumentacja | Stabilne API | MCP/integracja       | Technicznie /24 |
| ------------------ | --------- | ------------------ | ------------ | ------------ | -------------------- | --------------- |
| Cloudflare Workers | Z         | Z                  | Z            | Z            | Z*                   | 24              |
| Vercel             | Z         | Z                  | Z            | Z            | C — MCP Beta         | 23              |
| Netlify            | Z         | Z                  | Z            | Z            | Z*                   | 24              |
| Fly.io             | Z         | C                  | Z            | Z            | C — MCP experimental | 20              |
| Railway            | C         | Z                  | Z            | Z            | Z*                   | 21              |
| Render             | Z         | Z                  | Z            | Z            | Z*                   | 24              |

\* Oficjalna integracja jest dostępna, lecz nie znaleziono osobnej deklaracji GA dla każdego MCP. To nie gwarancja stabilności MCP; zwykłe CLI/API stanowią podstawę operacji. Dostępność podstawowego hostingu, CLI i API potwierdzono w aktualnych dokumentacjach; brak etykiety beta nie jest dowodem formalnego GA wszystkich funkcji dodatkowych.

Twarde filtry: wszystkie sześć platform może obsłużyć JS/TS SSR, ale alternatywy wymagają wymiany adaptera i ponownej weryfikacji. Obecnego artefaktu Cloudflare nie można przenieść bez przebudowania. **Cloudflare Pages odpada dla adaptera 14.3.1**, który obsługuje Workers. Nie ma wymogu stale aktywnego procesu, więc nie zastosowano filtra trwałych połączeń. [Adapter Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

Dopasowanie dodaje do oceny technicznej: możliwość darmowego utrzymania 0–6, lokalizację wykonania blisko Polski 0–2, zgodność z obecnym adapterem 0–2. Brak premii za znajomość platformy; współlokacja bazy nie daje przewagi. Wagi i oceny dopasowania są jawną oceną autora na podstawie poniższych ograniczeń.

| Platforma          | Technicznie | Darmowe utrzymanie | Polska/UE | Obecny adapter | Razem /34 |
| ------------------ | ----------: | -----------------: | --------: | -------------: | --------: |
| Cloudflare Workers |          24 |                  6 |         2 |              2 |    **34** |
| Netlify            |          24 |                  4 |         0 |              0 |    **28** |
| Render             |          24 |                  2 |         2 |              0 |    **28** |
| Railway            |          21 |                  3 |         2 |              0 |    **26** |
| Vercel             |          23 |                  0 |         2 |              0 |    **25** |
| Fly.io             |          20 |                  0 |         2 |              0 |    **22** |

Netlify wygrywa remis z Render dzięki brakowi obowiązkowego usypiania funkcji po 15 minutach i bardziej przewidywalnemu limitowi Free. Cloudflare wygrywa również bez dwupunktowej premii za obecny adapter; wcześniejszy wybór nie przesądził wyniku.

**Cloudflare.** Wrangler obejmuje publikację, rollback i logi; platforma zarządza runtime, udostępnia REST API i dokumentację Markdown/llms.txt. Oficjalne integracje obejmują MCP oraz CI. Lokalna zgodność adaptera jest już potwierdzona buildem. Za darmowym limitem żądań kryje się jednak tylko 10 ms CPU na wykonanie; czas oczekiwania na sieć nie jest czasem CPU. Usługi dodatkowe: KV, D1, R2, Queues i Durable Objects, niewymagane w proponowanym MVP. Nie oceniano eksperymentalnych Containers jako podstawy aplikacji. [Limity](https://developers.cloudflare.com/workers/platform/limits/), [integracje i dokumentacja](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/).

**Vercel.** Pełny serverless, dobre CLI, REST API, Markdown i podglądy; MCP pozostaje Beta. Aktualny adapter 11.0.10 deklaruje Astro ^7.0.0. Hobby jest ograniczony do osobistego, niekomercyjnego użycia; nie ustalono, że GymPlanner spełnia ten warunek, dlatego nie traktujemy Hobby jako pewnej darmowej opcji. Pro to 20 USD/miesiąc plus podatki/nadwyżki. Nie włączać ISR dla prywatnych stron, bo trafienie w cache może ominąć middleware. WebSockets są teraz Beta i ograniczone czasem funkcji; nie są wymagane. [Hobby](https://vercel.com/docs/plans/hobby), [Pro](https://vercel.com/docs/plans/pro-plan), [adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/), [MCP](https://vercel.com/docs/agent-resources/vercel-mcp), [WebSockets](https://vercel.com/docs/functions/websockets), [CLI](https://vercel.com/docs/cli).

**Netlify.** Zalicza CLI/API dzięki `netlify deploy`, logom i endpointowi przywracania wdrożenia; ma zarządzane funkcje, Git previews, Markdown i oficjalny MCP. Astro 7 jest oficjalnie wspierane, ale wymaga zmiany adaptera. Darmowe funkcje domyślnie wykonują się w Ohio; wybór regionu UE wymaga Pro/Enterprise, co oznacza dodatkową drogę do Supabase w UE. Netlify Database ogłoszono GA w kwietniu 2026; baza i Blobs nie uzasadniają migracji z Supabase. [Astro 7](https://www.netlify.com/changelog/2026-06-22-astro-7/), [regiony](https://docs.netlify.com/build/functions/configuration/), [MCP](https://github.com/netlify/netlify-mcp), [Database](https://www.netlify.com/blog/netlify-database/), [CLI](https://cli.netlify.com/commands/deploy/), [API](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/).

**Fly.io.** `fly deploy`, logi, obrazy poprzednich wydań i Machines REST/OpenAPI zapewniają operacje bez panelu. Zarządzanie oceniono częściowo: trzeba dobrać maszynę, RAM, health checks, obrazy i autosuspend. Oficjalny MCP jest experimental. Nowy użytkownik otrzymuje krótki trial, nie stały darmowy przydział. Dostępne są regiony UE, Managed Postgres, Tigris i Upstash; root filesystem nie jest trwałym magazynem danych. Astro wymaga adaptera Node i odpowiedniej wersji Node. [Trial](https://fly.io/docs/about/free-trial/), [API](https://fly.io/docs/machines/api/), [MCP](https://fly.io/docs/flyctl/mcp-server/), [rollback](https://fly.io/docs/blueprints/rollback-guide/), [Astro](https://docs.astro.build/en/guides/deploy/flyio/).

**Railway.** Zarządzane usługi, GraphQL API, dokumentacja Markdown i oficjalny MCP są mocnymi stronami. CLI oceniono częściowo: potwierdzono deploy i logi, ale dokumentacja rollback kieruje do panelu; nie zweryfikowano konkretnej nieinteraktywnej operacji rollback. `railway redeploy` nie oznacza cofnięcia. Free ma stały kredyt 1 USD/miesiąc, co może wystarczyć do bardzo małego, uśpionego projektu; nie wystarcza w przyjętym modelu stale aktywnej aplikacji. Dostępny jest Amsterdam. Poradnik Railway zawiera stare `output: "hybrid"`; dla Astro 7 używać aktualnego adaptera Node. [Plany](https://docs.railway.com/pricing/plans), [rollback](https://docs.railway.com/guides/roll-back-bad-deploy), [API](https://docs.railway.com/integrations/api), [MCP](https://docs.railway.com/ai/mcp-server), [regiony](https://docs.railway.com/deployments/regions).

**Render.** CLI, API rollback, zarządzane usługi, dokumentacja dla agentów i oficjalny MCP spełniają pięć kryteriów. Dla SSR potrzebny jest Node Web Service, nie Static Site. Frankfurt jest dostępny, lecz Free usypia po 15 minutach; rozruch trwa około minuty. Render zastrzega także możliwość zawieszenia Free przy dużym ruchu inicjowanym do zewnętrznej bazy/API; próg nie jest opublikowany. To istotne przy Supabase. Free Postgres wygasa po 30 dniach, więc nie zastępuje wybranej bazy. [Free](https://render.com/docs/free), [regiony](https://render.com/docs/regions), [MCP](https://render.com/docs/mcp-server), [dokumentacja](https://render.com/docs/llm-support), [API rollback](https://api-docs.render.com/reference/rollback-deploy).

### Koszty przy 10–100 tys. żądań miesięcznie

Szacunki w USD, przed podatkami, sprawdzone 2026-09-14. Żądania to wszystkie odpowiedzi HTTP, w tym zasoby, a nie liczba użytkowników lub wizyt. Założenie transferu: średnio 100 kB/odpowiedź, czyli około 1–10 GB. Dla funkcji: 100 ms czasu wykonania i 1 GB przydzielonej pamięci; dla CPU Workers wymagany jest osobny pomiar. Supabase rozlicza własny transfer niezależnie. To modele, nie pomiary GymPlanner.

| Platforma  | Szacunek hostingu                                             | Warunek i ograniczenie                                                                                                                        |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare | 0 USD                                                         | ≤100 tys. dynamicznych żądań/dzień, ≤10 ms CPU/wykonanie, pozostałe limity; Paid od 5 USD                                                     |
| Netlify    | 0 USD przy 10 tys.; 100 tys. w modelu przekracza Free         | 300 kredytów/mies.; wyczerpanie blokuje projekty; Personal od 9 USD                                                                           |
| Render     | 0–0,75 USD; przy braku płatności nadmiar powoduje zawieszenie | 5 GB transferu, potem 0,15 USD/GB; uśpienie, 750 h/workspace, dodatkowe ograniczenie zewnętrznych połączeń; płatny serwer 7–7,75 USD w modelu |
| Railway    | około 5 USD na Hobby; Free tylko przy zużyciu ≤1 USD          | 0,2 GB średniego RAM + 0,01 vCPU + 1–10 GB daje 2,25–2,70 USD zasobów, ale minimum Hobby to 5 USD                                             |
| Vercel     | orientacyjnie 20 USD na Pro                                   | Hobby 0 USD tylko dla osobistego niekomercyjnego użycia; zasoby i transfer mogą zmienić koszt                                                 |
| Fly.io     | roboczo 4–6 USD + 0,02–0,20 USD transferu                     | Jedna stale działająca shared CPU/512 MB w UE; dokładny region i czas działania zmieniają rachunek; bez dysku i dedykowanego IPv4             |

Netlify: cztery wdrożenia produkcyjne ×15 kredytów, transfer ×20/GB, compute ×10/GBh i żądania ×2/10 tys. Daje około 85 kredytów dla 10 tys. i 308 dla 100 tys. żądań. Railway: RAM 10 USD/GB-mies., CPU 20 USD/vCPU-mies., egress 0,05 USD/GB. [Netlify kredyty](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/), [Netlify plany](https://www.netlify.com/pricing/), [Render plany](https://render.com/docs/new-workspace-plans), [Render ceny](https://render.com/pricing), [Railway ceny](https://docs.railway.com/pricing), [Fly ceny](https://fly.io/docs/about/pricing/).

Supabase Free: 500 MB bazy, 50 tys. aktywnych użytkowników miesięcznie, 5 GB egress i osobny przydział cached egress, 1 GB plików, maksymalnie dwa aktywne projekty. To wystarczenie musi zostać potwierdzone pomiarami. Free nie obejmuje automatycznych backupów; niski ruch przez siedem dni może spowodować pauzę. Pro od 25 USD/miesiąc jest osobnym kosztem, nie składnikiem Workers Paid. [Supabase ceny](https://supabase.com/pricing), [pauzowanie](https://supabase.com/docs/guides/platform/free-project-pausing), [backupy](https://supabase.com/docs/guides/platform/backups).

### Shortlisted Platforms

#### 1. Cloudflare Workers + Supabase Free (Recommended)

Najlepszy bilans kosztu, obecnej konfiguracji i obsługi przez CLI. Wybrać konkretny region Supabase `eu-central-1` (Frankfurt) blisko użytkowników; nie zmienia to globalnego charakteru Workers. Wybór regionu bazy nie oznacza gwarancji przechowywania wszystkich logów i przetwarzania wyłącznie w UE. [Regiony Supabase](https://supabase.com/docs/guides/platform/regions).

#### 2. Netlify + Supabase Free

Alternatywa przy problemach z runtime Workers lub CPU. Darmowy limit jest mniejszy, a połączenie funkcji z USA do bazy w UE wymaga pomiaru opóźnień. Zmiana platformy nie rozwiąże ograniczeń Supabase Free.

#### 3. Render + Supabase Free

Alternatywa z pełnym Node i regionem Frankfurt, gdy ważniejsza stanie się zgodność bibliotek. Darmowe usypianie i niejawny próg ruchu do zewnętrznego API ograniczają przydatność do regularnych treningów.

## Anti-Bias Cross-Check: Cloudflare Workers + Supabase Free

### Devil's Advocate — Weaknesses

1. **Mały ruch nie gwarantuje darmowego SSR.** Renderowanie większej rozpiski lub kosztowna biblioteka może przekroczyć 10 ms CPU i powodować błędy 1102. Pomiar musi objąć logowanie i realistyczny trening, nie tylko stronę główną.
2. **Uśpiona baza blokuje działającą stronę.** Przy małym ruchu Supabase może się zatrzymać; użytkownik zobaczy stronę, ale nie odczyta ani nie zapisze wyników. [Pauzowanie](https://supabase.com/docs/guides/platform/free-project-pausing).
3. **Rollback kodu nie odtworzy danych.** Błędna migracja lub zapis pozostanie w bazie, a Free nie daje automatycznych backupów. Wymagane eksporty poza bazę i sprawdzenie odtwarzania. [Backupy](https://supabase.com/docs/guides/platform/backups), [rollback Workers](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
4. **Staging może użyć produkcyjnych danych.** Sam inny URL nie izoluje bazy; podgląd musi otrzymać odrębny projekt Supabase i odpowiednie sekrety. Obecne role i RLS domenowe nie są jeszcze zaimplementowane.
5. **Token do wdrożenia może mieć szerszy zasięg niż projekt.** Workers Scripts Write jest uprawnieniem na poziomie konta. Nie potwierdzono możliwości zawężenia standardowego tokenu do jednego Workera; przed automatyzacją trzeba rozwiązać to zgodnie z AGENTS.md, np. przez izolowane konto projektu. [Zakresy tokenów](https://developers.cloudflare.com/fundamentals/api/reference/template/).

### Pre-Mortem — How This Could Fail

Poniżej hipotetyczny scenariusz, nie opis stanu projektu.

Po sześciu miesiącach GymPlanner ma kilku regularnych użytkowników, ale trener przestaje mu ufać. Na początku sprawdzono tylko stronę główną i uznano darmowe limity za wystarczające. Gdy pojawiły się dłuższe plany i historia treningów, część żądań zaczęła przekraczać limit CPU. Interfejs nie odróżniał zapisu rozpoczętego od potwierdzonego, więc podopieczni zamykali stronę z przekonaniem, że wyniki zostały zachowane.

Podczas urlopu aktywność spadła i baza została wstrzymana. Aplikacja nadal się otwierała, ale logowanie i odczyt planów nie działały. Nie było uzgodnionej procedury wznowienia ani osoby sprawdzającej powiadomienia. W pośpiechu poprawiono konfigurację i przetestowano ją na podglądzie, który korzystał z produkcyjnej bazy. Dane testowe zmieszały się z rzeczywistymi wynikami.

Następnie migracja zmieniła strukturę zapisów. Cofnięcie Workera przywróciło poprzedni kod, lecz nie schemat ani dane. Zespół odkrył wtedy, że darmowa baza nie zapewnia oczekiwanych automatycznych kopii, a ręczny eksport nigdy nie był odtwarzany. Brak logów podglądu dodatkowo wydłużył diagnozę. Problemem nie był sam wybór darmowych usług, lecz przyjęcie, że brak rachunku oznacza brak obowiązków operacyjnych. Właśnie te założenia należy sprawdzić przed udostępnieniem aplikacji prawdziwym podopiecznym.

### Unknown Unknowns

- **Zmiany adaptera:** zainstalowany 14.3.1 używa Vite/workerd już w `npm run dev`, obsługuje `npm run preview`, nie obsługuje Pages. `astro:env/server` pozostaje obsługiwane; stare przykłady `Astro.locals.runtime` nie pasują. Potwierdzono dokumentacją oraz lokalnym kodem adaptera.
- **Automatyczne zasoby:** obecny build dodaje `SESSION` KV i `IMAGES`. Kod aplikacji nie korzysta z `Astro.session` ani `astro:assets`; sesja Supabase działa przez cookies. W planie rozważyć `session: false` i passthrough obrazów, żeby nie tworzyć zbędnych zależności. Images ma własny limit i cennik; nie zakładać, że binding oznacza nielimitowane darmowe użycie. [Images](https://developers.cloudflare.com/images/pricing/).
- **Podgląd bez logów:** Preview URLs nie mają Workers Logs, `wrangler tail` ani Logpush. Diagnostykę prowadzić na oddzielnym Workerze staging, z własną bazą. Podgląd jest publiczny, jeśli nie dodano Cloudflare Access. [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).
- **Poczta do użytkowników:** wbudowany SMTP Supabase nie jest przeznaczony do wysyłki produkcyjnej i ogranicza odbiorców do zespołu projektu. Zaproszenia lub reset hasła wymagają zaplanowania własnego SMTP; samo logowanie hasłem przygotowanym kontem nie wymaga wysyłania e-maila. [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Uprawnienia i konfiguracja builda:** ograniczenie tokenu GitHub do repozytorium nie ogranicza automatycznie uprawnień tokenu Cloudflare. Dodatkowo `.nvmrc` wskazuje zbyt stary Node dla części zależności, a CI słucha `master` zamiast uzgodnionego `main`. To lokalnie potwierdzone przeszkody przed wdrożeniem, niezależne od platformy.

## Operational Story

- **Preview deploys:** docelowo GitHub Actions dla zaufanych PR/branchy: build, potem `npx wrangler versions upload --preview-alias <alias>` po skonfigurowaniu środowiska staging. To podgląd wersji, nie promocja produkcji. Do testów wymagających logów używać osobnego Workera staging i osobnego Supabase Free. Zabezpieczyć dostęp Cloudflare Access. Nie udostępniać sekretów kodowi z forków; nie zakładać, że każdy fork PR dostanie preview. Natywne Workers Builds też obsługuje branche, lecz wybór repozytorium to GitHub Actions. [Branche](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), [podglądy](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/).
- **Secrets:** lokalnie ignorowane `.dev.vars`; wdrożone `SUPABASE_URL` i `SUPABASE_KEY` jako Workers Secrets, oddzielnie dla staging i produkcji. `SUPABASE_KEY` to klucz publishable/anon odpowiedni dla uwierzytelniania i RLS, nie service_role. Token CI w GitHub Environment Secrets i tylko na wybrane środowisko. Wartości dostępne runtime i kodowi z uprawnieniem ich wykorzystania — dostęp do deploya traktować jako wrażliwy; nie drukować ich w logach. Zmiana sekretów może tworzyć nowe wdrożenie, więc objąć ją planem. [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
- **Rollback:** `npx wrangler rollback <version-id> --name gymplanner` po ustaleniu docelowej nazwy, a następnie sprawdzenie logowania i odczytu. Dokumentacja mówi o natychmiastowym utworzeniu aktywnego wdrożenia; nie przyjmować gwarantowanego czasu przywrócenia całej aplikacji. Zmiany bazy, danych i zasobów nie cofają się razem z kodem. [Rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- **Approval:** badania, lokalne poprawki, kontrole i odczyt logów mogą być wykonywane w autoryzowanym zakresie. Najpierw Plan Mode i akceptacja konkretnego planu, następnie zapis do `context/deployment/deploy-plan.md`; dopiero potem zmiany produkcji. Zatwierdzenie tego dokumentu nie zatwierdza wdrożenia. Docelowy auto-deploy po merge do `main` wymaga uwzględnienia w planie. Usunięcie bazy/projektu i rotacja głównego sekretu pozostają po stronie człowieka. Bez tokenów DNS i billing; przy braku izolacji uprawnień do GymPlanner automatyzacja czeka na rozwiązanie, nie rozszerza samodzielnie dostępu.
- **Logs:** runtime `npx wrangler tail gymplanner --format json`, staging analogicznie z nazwą staging; logi CI `gh run view <run-id> --log-failed`. Token logów z Workers Tail Read zamiast tokenu wdrożeniowego, przy zachowaniu izolacji konta. Nie logować haseł, tokenów ani treści prywatnych komentarzy. MCP jest opcjonalny, a jego niepotwierdzony status GA nie blokuje podstawowego CLI. [Logi Workers](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/), [uprawnienia](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).

## Risk Register

L = małe, M = średnie, H = duże. Oceny są jakościowe, wynikają z architektury i dokumentacji, nie z zaobserwowanych awarii.

| Risk                                               | Source                              | Likelihood | Impact | Mitigation                                                                                           |
| -------------------------------------------------- | ----------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------- |
| SSR przekracza 10 ms CPU na Free                   | Devil's advocate                    | M          | H      | Zmierzyć logowanie i realistyczny plan na staging; zoptymalizować lub świadomie wybrać Paid od 5 USD |
| Supabase pauzuje przy małym ruchu                  | Devil's advocate / Pre-mortem       | M          | H      | Odbierać powiadomienia, opisać wznowienie; przy potrzebie ciągłej dostępności ponownie ocenić Free   |
| Brak użytecznej kopii danych                       | Devil's advocate / Pre-mortem       | M          | H      | Regularne eksporty poza usługę, z ochroną danych; próbne odtworzenie w oddzielnej bazie              |
| Rollback kodu nie pasuje do zmigrowanej bazy       | Pre-mortem                          | M          | H      | Migracje kompatybilne wstecz, backup przed migracją i sprawdzona procedura odtworzenia               |
| Staging zapisuje do produkcji                      | Devil's advocate / Pre-mortem       | M          | H      | Oddzielny Worker, projekt Supabase i sekrety; sprawdzenie celu przed smoke testem                    |
| Starter nie egzekwuje uprawnień trener–podopieczny | Research finding                    | H          | H      | Przed realnymi danymi wdrożyć role, relacje i RLS oraz sprawdzić izolację użytkowników               |
| Fałszywe potwierdzenie zapisu przy awarii          | Pre-mortem                          | M          | H      | Potwierdzać sukces dopiero po odpowiedzi bazy; pokazać błąd i zachować dane do ponowienia            |
| Niepotrzebne KV/Images i ich limity                | Unknown unknowns                    | M          | M      | W planie wyłączyć nieużywane sesje Astro i dobrać obsługę obrazów bez dodatkowych usług              |
| Brak logów Preview URLs                            | Unknown unknowns                    | H          | M      | Osobny staging Worker do diagnostyki; nie obiecywać `tail` dla URL podglądu                          |
| Zbyt szerokie uprawnienia tokenu konta             | Devil's advocate / Unknown unknowns | M          | H      | Potwierdzić realny scope; izolowane konto projektu lub inny zatwierdzony mechanizm; bez DNS/billing  |
| Niepoprawne poradniki dla wersji adaptera          | Unknown unknowns                    | M          | H      | Trzymać adapter 14.3.1/lockfile, korzystać z dev/preview Astro i potwierdzonego entrypointu Workers  |
| SMTP blokuje zaproszenia/reset                     | Unknown unknowns                    | M          | M      | Osobno zaplanować dostawcę SMTP przed włączeniem wysyłki do podopiecznych                            |
| Node i gałąź CI niezgodne z projektem              | Research finding                    | H          | M      | Wyrównać wspieraną wersję Node w lokalnym środowisku i CI; uzgodnione `main` uwzględnić w planie     |
| Koszty usług dodatkowych lub wyczerpanie Free      | Research finding                    | M          | M      | Monitorować CPU, transfer i rozmiar bazy; subdomena workers.dev na start; AI poza wariantem 0 USD    |
| MCP beta/experimental albo brak deklaracji GA      | Research finding                    | M          | L      | Podstawowe operacje przez udokumentowane CLI/API; nie uzależniać odzyskiwania od MCP                 |

## Getting Started

Poniższe kroki są wskazówkami do osobnego planu. Nie wykonano tworzenia kont, zasobów, konfiguracji CI ani wdrożenia.

1. **Przygotować i zatwierdzić plan w Plan Mode.** Uwzględnić Workers Free + Supabase Free, nazwę `gymplanner`, subdomenę `workers.dev`, dwa środowiska i konto projektu izolujące uprawnienia. Zatwierdzony plan zapisać do `context/deployment/deploy-plan.md`.
2. **Wyrównać Node i istniejącą konfigurację.** Lokalny Node 24.12.0 i `.nvmrc` 22.14.0 nie spełniają wymagań części zależności ESLint (`^22.22.3 || ^24.16.0 || >=26.3.0` według lokalnego raportu). Wybrać wspieraną wersję z tego zakresu, spójną w CI. Zachować adapter 14.3.1, `nodejs_compat` i istniejący entrypoint; rozważyć wyłączenie nieużywanych SESSION/IMAGES. Nie wykonywać `wrangler init` w istniejącym projekcie.
3. **Skonfigurować Supabase i środowiska zgodnie z planem.** Preferować Frankfurt; przygotować testową bazę i odrębne klucze runtime. Zaimplementować RLS przed rzeczywistymi danymi. Sekrety dostarczać przez zmienne środowiskowe lub magazyny platform, nigdy przez czat/repozytorium. Testowy smoke tworzy konto — uruchamiać go tylko wobec testowego Supabase.
4. **Sprawdzić aplikację lokalnie.** `npm run dev` już uruchamia workerd przez adapter. Kolejno `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build`; następnie `npm run preview` i odpowiednie testy logowania. Nie zastępować tego poradnikiem dla starego adaptera Pages. Build tworzy przekierowanie `.wrangler/deploy/config.json` do `dist/server/wrangler.json`; potwierdzono lokalnie.
5. **Po autoryzacji wdrożyć i sprawdzić najpierw staging.** Publikacja z katalogu projektu po buildzie: `npx wrangler deploy`; późniejsza produkcja wyłącznie do jawnie skonfigurowanego celu zgodnego z planem. Pomierzyć CPU, sprawdzić logowanie/zapis, limit bazy, logi i próbny rollback. Wariant GitHub Actions po merge do `main` skonfigurować w osobnym etapie. Składnię deploy/rollback/tail sprawdzono lokalnym Wranglerem 4.131.1 przez `--help`.

## Out of Scope

- Konfiguracja obrazów Docker i Dockerfile.
- Implementacja potoków CI/CD.
- Architektura wieloregionowego HA/DR oraz kontraktowe SLA.
- Realne wdrożenie, tworzenie zasobów, migracje bazy, rotacja sekretów.
- Gwarancja darmowego działania przyszłych funkcji, płatne AI i zakup domeny.
