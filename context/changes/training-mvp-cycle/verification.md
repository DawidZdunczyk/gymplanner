# Weryfikacja pełnego MVP

Data: 2026-09-14. Środowisko: lokalne, Node 22.22.3, prawdziwy Supabase Auth/Postgres/RLS, Cloudflare workerd i Chromium. Zakres: 14 obowiązkowych FR pierwotnego PRD; opcjonalny FR-011 nie jest częścią wdrożonej funkcjonalności.

## Wynik

Implementacja i automatyczna weryfikacja lokalnego MVP są zakończone. Pięć kryteriów 10xBuilder podanych przez użytkownika ma dowody poniżej. Nie jest to potwierdzenie przyznania odznaki ani zdalnego wdrożenia. Formalne zakończenie S-01 nadal wymaga ręcznego potwierdzenia trzech kryteriów jego planu.

| Kryterium użytkownika          | Implementacja i dowód                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kontrola dostępu               | Logowanie, sesje, role, przypisania i RLS. Smoke Auth, testy DB/HTTP S-01 oraz odmowa znanego UUID obcemu trenerowi w E2E — PASS.                                                                            |
| CRUD właściwy dla domeny       | Trener tworzy, odczytuje, edytuje i usuwa nierozpoczęte jednostki treningowe. E2E przechodzi formularze i odświeża stan; DB dodatkowo dowodzi niezmienności innego tygodnia i odmowy edycji historii — PASS. |
| Logika biznesowa               | Zapis i zakończenie z wymaganymi wynikami/ocenami, dozwolone odchylenia, superserie, snapshot, korekty, ważność i prywatność. Testy DB oraz dwa scenariusze E2E — PASS.                                      |
| Dokumenty kontekstowe          | PRD, infrastruktura, roadmapa, plan implementacji, plan testów, przeglądy, mapa wymagań i ten raport.                                                                                                        |
| Test z perspektywy użytkownika | Dwa testy Playwright z rzeczywistą aplikacją i bazą; osobne sesje ról, zapis → reload → odczyt trenera. Dodatkowo wykonana próba celowego uszkodzenia chronionego zachowania.                                |

## Końcowe kontrole

| Polecenie / sprawdzenie                                                  | Wynik                                                                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx astro sync` → `npm run lint` → `npx astro check` → `npm run build`  | PASS, wykonane w tej kolejności po poprawce hydratacji. Astro check: 62 pliki, 0 błędów, 0 ostrzeżeń, 0 wskazówek.                                           |
| `npm run check:ci:local`                                                 | PASS, świeży projekt `gymplanner-ci-ea217680`: migracje od zera → smoke Auth w trybach signup i existing → S-01 DB/HTTP → treningi DB → E2E 2/2.             |
| E2E w powyższym świeżym projekcie                                        | `advanced.spec.ts`: 3,1 s; `seed.spec.ts`: 3,7 s; całość 7,4 s, bez ponowień.                                                                                |
| `npm run test:e2e:local` na istniejącym projekcie                        | PASS, 2/2 po poprawce hydratacji; niezależny przebieg przed kontrolą świeżej bazy.                                                                           |
| `npm run check:deployment`                                               | PASS, 11/11 testów zabezpieczeń konfiguracji i publikacji.                                                                                                   |
| `node --test scripts/access-runner.test.mjs`                             | PASS, 3/3.                                                                                                                                                   |
| `node --experimental-strip-types --test scripts/access-context.test.mjs` | PASS, 4/4.                                                                                                                                                   |
| `git diff --check`                                                       | PASS.                                                                                                                                                        |
| Sprzątanie środowiska                                                    | Runner zatrzymał podgląd. `docker ps` po zakończeniu potwierdził wyłącznie cztery kontenery istniejącego lokalnego projektu, bez kontenerów tymczasowego CI. |

Build bez `SITE_URL` zgłasza informację o pominięciu sitemap. Build testowy z lokalnym `SITE_URL` tworzy sitemap. Nie ma to wpływu na chronione panele.

## Co faktycznie sprawdzają testy

`seed.spec.ts` tworzy plan przez UI trenera, dodaje i edytuje jednostkę, tworzy i usuwa kopię, a następnie wykonuje trening jako podopieczny. Przy celu 3–5 zapisuje trzy serie, w tym 8 powtórzeń i 42,5 kg mimo celu 10 i 40 kg. Po odświeżeniu sprawdza dokładne wartości oraz rozgrzewkę; kończy trening i potwierdza odczyt wyników, ocen oraz niezmienionego celu u trenera. Zmiana komentarza publiczny → prywatny usuwa treść z widoku trenera, zachowując ją u autora. Obcy trener otrzymuje 404 dla znanego adresu.

`advanced.spec.ts` przygotowuje plan przez prawdziwe API, a na ekranie 390×844 wykonuje trzy rundy dwóch ćwiczeń: na powtórzenia i na czas. Cel serii jednego ćwiczenia wynosi pięć, drugiego jest pusty; oba otrzymują dokładnie trzy wykonania z rund. Korekta wprowadza zamiennik 3×12×25 kg, zachowując oryginalne 20 kg i RIR trenera. Odświeżenie i odczyt trenera potwierdzają aktualne dane oraz oznaczenie korekty. Test zatrzymuje pobieranie JavaScript i sprawdza nieaktywny przycisk rozpoczęcia przed hydratacją, po czym zwalnia skrypty i przechodzi zwykłą interakcję.

Testy DB uzupełniają przypadki brzegowe: zakazane zapisy poza RPC, nieprawidłowy JSON, konflikt dwóch operacji na tej samej wersji, niezmienność innego tygodnia, brakujące wyniki i oceny, pominięte ćwiczenia, cele fixed/range/unlimited, ważność planu, kontynuację i korektę po wygaśnięciu oraz cofnięcie przypisania. Każdy negatywny przypadek rozpiski zmienia jeden warunek poprawnych danych, aby inny błąd nie maskował badanej walidacji.

Nie wszystkie warianty formularzy są pokryte E2E. W szczególności wygaśnięcie planu sprawdzono w DB, a nie przez zmianę zegara przeglądarki. [Mapa FR](requirements.md) rozdziela dowody poszczególnych warstw.

## Wykryte błędy i dowód skuteczności testu

- Celowo zmieniono odczyt treningu tak, aby zwracał `results: null`. Test stał się czerwony dokładnie na asercji po odświeżeniu: oczekiwane 8 powtórzeń, otrzymane puste pole. Oryginalny kod przywrócono w `finally`; końcowe dwa przebiegi są zielone. Mutacja nie jest częścią aplikacji.
- Pierwsza próba całego świeżego CI wykryła możliwość kliknięcia przycisku SSR przed podłączeniem React. Panele blokują teraz formularze do hydratacji; deterministyczna regresja powyżej przeszła.
- Review backendu poprawił walidację pustego rodzaju celu i niesamodzielne dane testów negatywnych. Review UI poprawił kolejność superserii i identyfikację tygodnia. Review E2E poprawił niezależne sprzątanie zasobów i sanitację błędów parsera.

Koordynator obejrzał rzeczywiste screenshoty mobilnego wykonania oraz porównania trenera: bez widocznego nakładania lub ucinania treści. To przegląd obrazów przez agenta, nie ręczna akceptacja człowieka ani pełny audyt dostępności. Raport Playwright i obrazy syntetycznych danych są lokalnie w ignorowanym `playwright-report/`; ponowny test zastępuje raport.

## Pozostałe granice

- S-01: nie potwierdzono ręcznie punktów 3.4–3.6 — telefon/klawiatura, oba konta i wylogowanie, zmiana przypisania oraz komunikat przy niedostępności backendu. Stan pozostaje w [planie S-01](../assigned-trainee-access/plan.md).
- Zdalne migracje i publikacja: nie wykonano. Zatwierdzony plan startera nie obejmuje schematu ról ani treningów. Przed udostępnieniem potrzebny jest zatwierdzony plan, eksport i próba odtworzenia danych, zdalne testy oraz sprawdzenie wycofania wersji.
- Lista historii ma limit odpowiedzi Supabase (lokalnie 1000 rekordów); przyszła paginacja jest opisana w review. Komentarz w dwóch oknach tego samego autora stosuje ostatni zapis. Zmiana trenera ukrywa historię poprzedniej relacji również podopiecznemu; nie przenosi jej automatycznie nowemu trenerowi.
- Nie sprawdzono jeszcze hipotezy wartości u rzeczywistych trenerów i podopiecznych. AI jest opcjonalne i pozostaje w backlogu.

Przeglądy: [backend](reviews/backend-review.md), [UI](reviews/ui-review.md), [E2E](reviews/e2e-review.md). Materiały modułu 3 i ich zastosowanie: [course-check.md](course-check.md).
