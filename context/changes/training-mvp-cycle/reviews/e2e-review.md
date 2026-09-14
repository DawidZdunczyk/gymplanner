# Przegląd testu E2E — przepływ treningowy

Data: 2026-09-14. Zakres: `tests/e2e/fixtures.ts`, `tests/e2e/seed.spec.ts`, `tests/e2e/advanced.spec.ts`, pomocniczo konfiguracja Playwright i lokalne migracje. Podstawa: `context/foundation/test-plan.md`, `tests/e2e/AGENTS.md` i pięć antywzorców z `10x-e2e/references/e2e-anti-patterns.md`.

## Werdykt

Test ma sensowne asercje dla trwałości wyników i odczytu przez właściwego trenera. Nie mockuje Auth, aplikacji ani bazy. Dwa ustalenia dotyczące fixture zostały poprawione i ponownie sprawdzone w kodzie. Koordynator potwierdził końcowy wynik `npm run test:e2e:local`: **2/2 PASS**, 2026-09-14 o 20:45 UTC, z prawdziwym lokalnym Auth, API i bazą. Kontrolowana utrata wyników spowodowała wcześniej oczekiwany czerwony test; zmiana kontrolna została cofnięta przed końcowym zielonym przebiegiem.

## Pięć antywzorców

| Antywzorzec                       | Ocena                              | Dowód                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Halucynowana asercja              | Nie znaleziono                     | Po odświeżeniu sprawdzane są rzeczywiste wartości: 8 powtórzeń, 42.5 kg i wykonana rozgrzewka. Trener widzi trzy serie i ocenę 7/10, a cel pozostaje 40 kg. Znane obce UUID zwraca 404.           |
| Kruchy selektor                   | Nie znaleziono                     | `getByRole`, `getByLabel`, `getByText` oraz semantyczne zawężenie listitem/group/region. Brak CSS, XPath i pozycyjnej zależności od układu DOM.                                                   |
| Współdzielony stan między testami | Nie znaleziono                     | Fixture testowa tworzy trzy losowe konta, jedno przypisanie i osobne konteksty przeglądarki. Nazwy planu są stałe, ale rekordy należą do unikalnych użytkowników.                                 |
| Czekanie na czas                  | Nie znaleziono                     | Brak `waitForTimeout`; kroki czekają na stan przez asercje Playwright.                                                                                                                            |
| Brak czyszczenia                  | Poprawione i sprawdzone statycznie | `finally` usuwa konta, a kaskady usuwają profile i dane treningowe. Każda próba zamknięcia kontekstu i usunięcia konta ma własną obsługę błędu; następne zasoby nadal otrzymują próbę sprzątania. |

## Rozwiązane ustalenia

### E2E-01 — sprzątanie nie powinno przerwać się po pierwszej awarii

Status: rozwiązane — odrębne `try/catch` obu pętli potwierdzone w kodzie. Pierwotny priorytet: średni. Pierwotny kod zamykał konteksty przed usunięciem kont bez odrębnej obsługi wyjątków. Błąd zamknięcia lub usunięcia konta mógł przerwać pozostałe sprzątanie.

Wdrożony wzorzec: każda próba zamknięcia i usunięcia ma własny `try/catch`; wszystkie zasoby otrzymują próbę sprzątania niezależnie od wcześniejszych błędów. Ogólny błąd sprzątania jest zgłaszany po zakończeniu prób, bez sekretów.

### E2E-02 — błędny JSON statusu nie może znaleźć się w raporcie

Status: rozwiązane — parser zastępuje wyjątek stałym komunikatem `Invalid local Supabase status`. Pierwotny priorytet: średni. Pierwotne `JSON.parse(status.stdout)` nie sanitowało wyjątku; nieprawidłowy JSON mógł dołączyć fragment stdout z kluczami do raportu.

Wdrożony wzorzec: parsowanie ma `try/catch` i stały komunikat bez stdout ani oryginalnego `cause`. Runner `scripts/local-e2e.mjs` stosuje ten sam wzorzec.

### E2E-03 — kliknięcie przed podłączeniem obsługi React

Status: rozwiązane. Świeże środowisko CI ujawniło aktywny przycisk SSR „Rozpocznij trening” przed hydratacją: kliknięcie nie wysyłało POST i pozostawiało trening zaplanowany. Poprawka `useHydrated` oraz blokada fieldsetów utrzymują kontrolki wyłączone do podłączenia obsługi. `advanced.spec.ts` deterministycznie zatrzymuje dostarczenie JS przez route i sprawdza wyłączenie przycisku przed hydratacją; po odblokowaniu przechodzi pełny przepływ. Końcowe 2/2 PASS obejmuje poprawkę.

## Sesje, sekrety i granice

- Konta tworzone tylko dla lokalnego URL; aplikacja wymaga dokładnie `http://127.0.0.1:4321`. Fixture respektuje `SUPABASE_WORKDIR`.
- Klucz administracyjny służy przygotowaniu i sprzątaniu fixture. Kroki scenariusza wykonują żądania jako rzeczywiści użytkownicy przez osobne sesje.
- Hasła są losowe. `storageState` przekazywane w pamięci, bez zapisu do pliku. Status CLI przechwytywany, bez świadomego logowania sekretów; ścieżka błędu parsowania jest po poprawce również sanitowana.
- Trace i video są wyłączone. Screenshoty błędów oraz jawne screenshoty sukcesu w `advanced.spec.ts` pokazują wyłącznie lokalne, syntetyczne dane scenariusza; logowanie odbywa się przez API, więc hasło nie jest wpisywane w UI.
- Usunięcie Auth użytkownika ma kaskadową ścieżkę do profilu, planu, workoutu i komentarza. Test nie używa zasobów produkcyjnych.

## Zakres ochrony i ograniczenia

`seed.spec.ts` pokrywa tworzenie, edycję i usuwanie planowanej jednostki, zapis trzech serii przy celu 3–5, odchylenie powtórzeń/ciężaru, trwałość, zakończenie, odczyt trenera, zmianę komentarza z publicznego na prywatny i odmowę obcemu trenerowi.

`advanced.spec.ts` używa osobnych losowych fixture i viewportu 390×844. Przez prawdziwe HTTP przygotowuje plan, następnie przez UI wykonuje trzy rundy dwóch ćwiczeń, kończy trening i koryguje go pełnym zamiennikiem. Po odświeżeniu sprawdza wyniki i porównanie z niezmienionym oryginałem u trenera. Przypadek łączy `sets=5` z trzema rundami oraz `sets=null`, aby wykryć mnożenie i błędne pojedyncze wykonanie. Zatrzymanie JS sprawdza dodatkowo gotowość kontrolek do interakcji.

Te dwa scenariusze nie dowodzą samodzielnie konfliktów wersji, cofnięcia przypisania ani reguł wygasłego planu; potrzebne są odpowiednie dowody integracyjne ze strategii. Viewport mobilny nie zastępuje testów na rzeczywistych urządzeniach. Wynik lokalny nie potwierdza wdrożenia ani działania produkcji. Screenshoty dokumentują syntetyczny przepływ i nie stanowią pełnego audytu wizualnego lub dostępności.

## Weryfikacja wykonania

Dowody przekazane przez koordynatora, 2026-09-14, 20:45 UTC:

- `npm run test:e2e:local` — **2/2 PASS**. `advanced.spec.ts`: 28 s; `seed.spec.ts`: 22.4 s. Prawdziwy lokalny Auth, API i DB, bez atrap wewnętrznych granic.
- Wcześniejsza kontrolowana mutacja zmieniała wynik `getWorkout` na `results: null`. `seed.spec.ts` zawiódł dokładnie na asercji trwałości po reload: oczekiwane 8 powtórzeń, otrzymana pusta wartość. Asercja wykryła materializację ryzyka utraty wyników.
- Mutację cofnięto w `finally`; końcowy zielony przebieg obu scenariuszy wykonano na przywróconym kodzie, z naprawą hydratacji. Kontrolowane uszkodzenie nie pozostaje w kodzie.
- `advanced.spec.ts` potwierdził superserie, zamiennik, odświeżenie, odczyt trenera oraz kontrolki wyłączone przed hydratacją. Dodano screenshoty udanego przepływu na lokalnych danych syntetycznych.

Recenzent przeprowadził przegląd statyczny i targeted ESLint podczas tworzenia testu; końcowe uruchomienia oraz eksperyment mutacyjny wykonał koordynator. Wyniki wykonania powyżej pochodzą z jego raportu.
