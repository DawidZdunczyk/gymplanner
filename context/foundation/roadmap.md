---
project: GymPlanner
version: 1
status: draft
created: 2026-09-14
updated: 2026-09-14
prd_version: 1
main_goal: market-feedback
top_blocker: none
milestone_id: training-without-spreadsheets
milestone_seq: 1
milestone_status: done
---

# Mapa drogowa: GymPlanner

> Źródło: PRD v1, notatki discovery, ustalony stos, dokumenty infrastruktury i wdrożenia oraz automatycznie zbadana baza kodu.
> Dokument rozwijany na miejscu według konwencji dokumentacji podstawowej. Kolejność wynika z zależności, bez szacunków ani budżetu czasu.
> Nazwy sekcji i pól zachowują kontrakt narzędzi obsługujących mapę drogową; treść jest po polsku.

## Milestone

**M-1: Trening od planu do wyników bez arkusza** — Status: done

- **Cel:** Dostarczyć wymagany przepływ MVP: trener udostępnia plan, podopieczny zapisuje i kończy trening, a trener porównuje wykonanie z zachowaną rozpiską. Zapewnić również wymagane korekty, superserie, zmiany przyszłych tygodni i widoczność komentarzy.
- **Materiały źródłowe:** `context/foundation/prd.md` (v1); pomocniczo `context/foundation/shape-notes.md`, `context/foundation/tech-stack.md`, `context/foundation/infrastructure.md`, `context/deployment/deploy-plan.md`, `context/deployment/verification.md`.
- **Gotowe, gdy:** każdy element poniżej jest `done`, wszystkie 14 wymagań koniecznych oraz US-01–US-04 są zweryfikowane, a automatyczny test pełnego przepływu potwierdza utworzenie i przypisanie treningu → zapis wykonania → odczyt wyników trenera. Weryfikacja obejmuje trwałość zapisu, zachowanie rozpisek oraz odmowę dostępu poza relacją i do prywatnych komentarzy.
- **Kotwice zakresu:** FR-001–FR-010, FR-012–FR-015, US-01–US-04 oraz wymagania niefunkcjonalne i kontrola dostępu PRD. FR-011 jest poza wymaganym kamieniem milowym.
- **Przed udostępnieniem:** potwierdzić wdrożenie, zdalny test logowania i funkcji treningowych, logi, możliwość wycofania wersji oraz eksport i próbę odtworzenia danych. To kryterium udostępnienia, nie blokada lokalnego planowania. Zatwierdzony plan pierwszej publikacji dotyczy startera; publikacja nowych funkcji i danych wymaga właściwego planu wdrożenia i jego zatwierdzenia.

## Vision recap

Podopieczny otrzymuje plan od trenera i wygodnie zapisuje wyniki, a trener przegląda swoich podopiecznych i porównuje plan z wykonaniem w jednym miejscu. Problemy z czytelnością i odświeżaniem arkuszy pozostają hipotezą wymagającą sprawdzenia u rzeczywistych użytkowników. Pierwszeństwo ma wygoda podopiecznego, a opcjonalne AI nie decyduje o sukcesie MVP.

## North star

**S-04: Podopieczny zapisuje i kończy trening.** To pierwszy kluczowy rezultat walidacji — najmniejszy kompletny przepływ sprawdzający, czy aplikacja pomaga podopiecznemu podczas ćwiczeń. Wymaga wcześniejszego dostępu, planu i trwałego zapisu serii; S-05 od razu zamyka pętlę odczytem trenera.

Użytkownik wybrał cel `market-feedback` i brak blokady planowania (`none`). Obszary wymagające szczególnej staranności to **dane i logika serwerowa**: trwałość wyników, zachowanie rozpiski i izolacja dostępu wynikają bezpośrednio z wymagań niefunkcjonalnych oraz kontroli dostępu PRD. Interfejs i infrastruktura pozostają proste, przy zachowaniu wygodnego użycia na telefonie i weryfikacji przed udostępnieniem.

## At a glance

Aktualizacja 2026-09-14: na polecenie użytkownika pełny zakres S-02–S-09 zrealizowano wspólnie w [training-mvp-cycle](../changes/training-mvp-cycle/plan.md). Zachowano identyfikatory wycinków, a wspólna zmiana jest ich źródłem implementacji i [dowodów](../changes/training-mvp-cycle/verification.md). Status `done` poniżej oznacza funkcjonalność zweryfikowaną lokalnie. S-01 otrzymał ręczne potwierdzenie użytkownika 2026-09-14. Wszystkie 9 wycinków jest zakończonych, a kamień milowy lokalnego MVP zamknięty. Migracje zdalne, eksport/odtworzenie danych i próba z rzeczywistymi użytkownikami pozostają przed udostępnieniem.

| ID   | Change ID                    | Outcome                                             | Prerequisites | PRD refs                                             | Status |
| ---- | ---------------------------- | --------------------------------------------------- | ------------- | ---------------------------------------------------- | ------ |
| S-01 | assigned-trainee-access      | Trener widzi swoich podopiecznych                   | —             | FR-001, FR-002, US-01                                | done   |
| S-02 | publish-weekly-training-plan | Trener udostępnia tygodniowy plan podopiecznemu     | S-01          | FR-002, FR-003, FR-005, FR-012, FR-015, US-01, US-04 | done   |
| S-03 | record-training-sets         | Podopieczny rozpoczyna trening i zapisuje serie     | S-02          | FR-005, FR-006, FR-009, FR-012, US-01, US-04         | done   |
| S-04 | complete-rated-training      | Podopieczny rozlicza i kończy trening               | S-03          | FR-007, FR-009, FR-015, US-01, US-04                 | done   |
| S-05 | compare-training-results     | Trener porównuje plan z wykonaniem                  | S-04          | FR-002, FR-010, US-01                                | done   |
| S-06 | revise-future-training-week  | Trener zmienia przyszłe treningi                    | S-03          | FR-003, FR-004, FR-012, US-01                        | done   |
| S-07 | train-superset-rounds        | Trener zleca superserię, podopieczny wykonuje rundy | S-04          | FR-003, FR-006, FR-009, FR-014, US-03                | done   |
| S-08 | training-comment-visibility  | Podopieczny wybiera widoczność komentarza           | S-04          | FR-008, US-01                                        | done   |
| S-09 | correct-completed-training   | Podopieczny koryguje zakończony trening             | S-05, S-07    | FR-010, FR-012, FR-013, US-02                        | done   |

## Streams

Pomoc nawigacyjna; wymagania wstępne w tabeli i wpisach pozostają źródłem kolejności. Osobne strumienie mogą ruszyć dopiero po spełnieniu swoich zależności; równoległość wymaga koordynacji wspólnych reguł treningu.

| Stream | Theme                            | Chain                            | Note                                                                  |
| ------ | -------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| A      | Plan, wykonanie i odczyt wyników | S-01 → S-02 → S-03 → S-04 → S-05 | Pierwsza ścieżka do sprawdzenia produktu u obu ról.                   |
| B      | Zmiany przyszłych tygodni        | S-06                             | Odgałęzienie po S-03; nie zatrzymuje pierwszego zakończenia treningu. |
| C      | Rundy i korekty wykonania        | S-07 → S-09                      | Start po S-04; S-09 łączy się także ze strumieniem A po S-05.         |
| D      | Widoczność komentarza            | S-08                             | Start po S-04; niezależny od zmian planu i korekt ćwiczeń.            |

## Baseline

Historyczna baza przed implementacją, zbadana 2026-09-14 i potwierdzona przez użytkownika. Aktualny stan opisują tabela powyżej i raport training-mvp-cycle. Wybory technologii przyjęto zgodnie z `context/foundation/tech-stack.md`; poniższe dowody opisują realizację. Brak `context/foundation/lessons.md`.

- **Frontend: obecny szkielet** — Astro, React i routing według stosu; dashboard zawiera powitanie i wylogowanie, bez ekranów treningowych (`src/pages/dashboard.astro:7`).
- **Backend / API: częściowy** — istnieją endpointy logowania i wylogowania; brak API treningów (`src/pages/api/auth/signin.ts:13`, `src/pages/api/auth/signout.ts:7`).
- **Dane: częściowe** — istnieje klient Supabase, brak migracji domenowych, danych treningowych, przypisań i polityk dostępu do nich (`src/lib/supabase.ts:9`, `supabase/config.toml:53`).
- **Autoryzacja: częściowa** — logowanie i sesje są obecne; middleware chroni dashboard. Brak ról i uprawnień trener–podopieczny (`src/lib/supabase.ts:10`, `src/middleware.ts:5`, `src/middleware.ts:17`). Logowania nie budujemy ponownie.
- **Wdrożenie / infrastruktura: częściowe** — konfiguracja staging/production i CI istnieją, lokalne kontrole i testy HTTP logowania przeszły. Raport nie potwierdza udanej publikacji ani zdalnego testu i wycofania wersji (`wrangler.jsonc:18`, `.github/workflows/ci.yml`, `context/deployment/verification.md`). Bieżące lokalne poprawki CI są pracą zastaną; ta mapa ich nie zmienia.
- **Obserwowalność: częściowa** — logi Workers są skonfigurowane; zdalny odczyt logów i pomiary pozostają niepotwierdzone (`wrangler.jsonc:12`, `context/deployment/verification.md`). Brak testu funkcji treningowych, ponieważ same funkcje nie istnieją.

Z bloku `Forward: technical-roadmap` przejęto dosłownie:

- automatyczny test E2E potwierdza przepływ, w którym trener tworzy i przypisuje trening, podopieczny zapisuje wykonanie, a trener odczytuje wyniki. Dobór narzędzi i plan testowania należą do dalszego etapu.
- AI ma być wykorzystywane do wytworzenia projektu. Jest to osobne ustalenie od opcjonalnego podsumowania AI wewnątrz aplikacji.

## Foundations

Brak osobnych fundamentów. Minimalne przypisania, kontrola dostępu i ścieżka testowania obu ról powstają z S-01; przechowywanie planu z S-02, a trwałość wyników i weryfikacja odtworzenia z S-03. Test przepływu rośnie wraz z funkcjami do pełnego scenariusza w S-05. Nie ma powodu, aby wcześniej kończyć całą warstwę danych, API lub uprawnień. Istniejący szkielet logowania, budowania i publikacji pozostaje bazą.

## Slices

### S-01: Trener widzi swoich podopiecznych

- **Outcome:** Trener może zalogować się przygotowanym kontem, wrócić z zachowaną sesją i zobaczyć wyłącznie przypisanych podopiecznych; podopieczny korzysta z własnego konta. Tożsamość wybranej osoby jest jednoznaczna, a próby dostępu poza relacją są odrzucane.
- **Change ID:** assigned-trainee-access
- **PRD refs:** FR-001, FR-002, US-01
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Pierwszy przepływ ustanawia i sprawdza izolację użytkowników, zanim pojawią się jakiekolwiek dane treningowe.
- **Status:** done

Wykorzystać istniejące logowanie. W tym przepływie wprowadzić minimalne role, przypisania i ich egzekwowanie oraz powtarzalną weryfikację dwóch ról i obcej relacji na danych testowych. Przygotowanie kont i relacji pozostaje operacyjne, bez interfejsu rejestracji lub zaproszeń.

### S-02: Trener udostępnia tygodniowy plan podopiecznemu

- **Outcome:** Trener może rozpisać i przypisać plan z okresem ważności oraz tygodniowym układem jednostek, a podopieczny może odczytać własną rozpiskę z tygodniem, wystąpieniem jednostki i statusem.
- **Change ID:** publish-weekly-training-plan
- **PRD refs:** FR-002, FR-003, FR-005, FR-012, FR-015, US-01, US-04
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rozróżnienie tygodnia i wystąpienia jednostki musi być poprawne przed zapisem wyników, aby podopieczny nie ćwiczył według niewłaściwej rozpiski.
- **Status:** done

Każde wystąpienie powtarzanej jednostki ma niezależne parametry ćwiczeń: powtórzenia, serie, ciężar, RIR/RPE, uwagi lub czas. Serie i powtórzenia obsługują liczbę, zakres i „Bez limitu”; brak liczby serii poza superserią oznacza jedno wykonanie. Trener rozdziela rozgrzewkę i część właściwą. Zapis i odczyt po ponownym logowaniu muszą zachować plan. Egzekwowanie ważności przy rozpoczęciu należy do S-03; organizacja superserii do S-07.

### S-03: Podopieczny rozpoczyna trening i zapisuje serie

- **Outcome:** Podopieczny może rozpocząć wybrany ważny trening, zapisać rzeczywiste wyniki wykonanych serii lub oznaczyć pominięcia, a następnie wrócić do potwierdzonych wyników po odświeżeniu i ponownym logowaniu.
- **Change ID:** record-training-sets
- **PRD refs:** FR-005, FR-006, FR-009, FR-012, US-01, US-04
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Trwałość zapisu jest głównym warunkiem zaufania podopiecznego; sprawdzamy ją na pierwszym użytecznym przepływie wyników.
- **Status:** done

Wymagane wyniki wynikają z konfiguracji ćwiczenia: czas albo powtórzenia i ciężar, gdy jest przewidziany. Liczba, zakres, „Bez limitu” i brak liczby serii zachowują odrębne znaczenia. Rozpoczęcie utrwala rozpiskę; po wygaśnięciu planu można kontynuować rozpoczęty trening, lecz nie rozpoczynać nowego. Rzeczywiste wyniki mogą odbiegać od celu. Błąd zapisu jest widoczny i nigdy nie daje fałszywego potwierdzenia. Weryfikacja obejmuje trwałość, izolację oraz odtworzenie potwierdzonych danych treningowych w odizolowanym środowisku przed rzeczywistymi danymi.

### S-04: Podopieczny rozlicza i kończy trening

- **Outcome:** Podopieczny może oznaczyć całą rozgrzewkę jako wykonaną lub pominiętą, ocenić trudność i zakończyć trening po rozliczeniu wymaganych wyników, także przy odchyleniach od planu.
- **Change ID:** complete-rated-training
- **PRD refs:** FR-007, FR-009, FR-015, US-01, US-04
- **Prerequisites:** S-03
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rozliczanie celu jako sztywnego obowiązku zablokowałoby prawdziwy trening; ten wycinek weryfikuje główną potrzebę przed dalszym rozszerzaniem produktu.
- **Status:** done

Rozgrzewka nie wymaga wyników ani ocen ćwiczeń. Niepominięte ćwiczenia części właściwej oraz cały trening wymagają ocen 1–10; ćwiczenie pominięte w całości nie wymaga oceny. Przy celu 3–5 serii wystarczają trzy wykonane i wypełnione serie; wyniki poniżej lub powyżej zakresu też są dopuszczalne i widoczne. Brak obowiązkowych danych blokuje zakończenie z czytelnym wskazaniem braków. Rozpiska pozostaje zachowana. Test przepływu obejmuje teraz utworzenie i przypisanie planu przez trenera oraz zapis i zakończenie przez podopiecznego.

### S-05: Trener porównuje plan z wykonaniem

- **Outcome:** Trener może wybrać swojego podopiecznego i zobaczyć zachowany plan obok wyników zakończonego treningu, z czytelnymi różnicami dla tego samego ćwiczenia i parametru.
- **Change ID:** compare-training-results
- **PRD refs:** FR-002, FR-010, US-01
- **Prerequisites:** S-04
- **Parallel with:** S-06, S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Dopiero odczyt przez trenera zamyka podstawowy przepływ obu ról i pozwala sprawdzić, czy arkusz przestał być potrzebny.
- **Status:** done

Widok jednoznacznie identyfikuje podopiecznego i wykonanie treningu. Porównanie korzysta z rozpiski zachowanej przy rozpoczęciu. Automatyczny test E2E, czyli test pełnego działania aplikacji przez obie role, potwierdza: trener tworzy i przypisuje trening → podopieczny zapisuje i kończy → trener odczytuje wyniki. Prezentację zamienników i oznaczenie korekty uzupełnia S-09.

### S-06: Trener zmienia przyszłe treningi

- **Outcome:** Trener może przeglądać, edytować i usuwać zaplanowane treningi oraz aktualizować ciężary, powtórzenia i RIR/RPE we wskazanym tygodniu, zachowując rozpiski rozpoczętych i zakończonych wykonań.
- **Change ID:** revise-future-training-week
- **PRD refs:** FR-003, FR-004, FR-012, US-01
- **Prerequisites:** S-03
- **Parallel with:** S-04, S-05, S-07, S-08, S-09
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Edycję wprowadzamy po utrwalaniu rozpoczętej rozpiski, aby nie nadpisać planu, według którego podopieczny faktycznie ćwiczy.
- **Status:** done

Zmiana dotyczy tylko wskazanego tygodnia i nierozpoczętych treningów. Inne tygodnie, odrębne wystąpienia jednostki oraz historia pozostają nienaruszone. Usunięcie zaplanowanego treningu nie usuwa rozpoczętego wykonania ani historii. Weryfikacja obejmuje także sytuację, gdy podopieczny rozpoczyna trening podczas edycji trenera.

### S-07: Trener zleca superserię, podopieczny wykonuje rundy

- **Outcome:** Trener może ułożyć superserię z rundami i przerwami, a podopieczny odczytać kolejność ćwiczeń oraz rozliczyć odpowiadające rundom wykonania.
- **Change ID:** train-superset-rounds
- **PRD refs:** FR-003, FR-006, FR-009, FR-014, US-03
- **Prerequisites:** S-04
- **Parallel with:** S-05, S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Rundy mogą błędnie pomnożyć liczbę wymaganych wykonań; rozszerzamy wcześniej sprawdzony przepływ zakończenia zamiast projektować osobny mechanizm.
- **Status:** done

Każde ćwiczenie ma własne parametry, także w grupie mieszanej, np. powtórzenia i czas. Jedna runda daje jedną serię każdego ćwiczenia i nie mnoży dodatkowej liczby serii. Przerwy między ćwiczeniami mogą być czasem, dystansem lub tekstem; przerwa między rundami obowiązuje po całej grupie. Funkcja obejmuje zapis, odczyt i poprawne zakończenie treningu z grupą, korzystając z już dostępnych ocen i wyników.

### S-08: Podopieczny wybiera widoczność komentarza

- **Outcome:** Podopieczny może dodać opcjonalny komentarz do treningu i wybrać, czy widzi go również przypisany trener, czy wyłącznie autor.
- **Change ID:** training-comment-visibility
- **PRD refs:** FR-008, US-01
- **Prerequisites:** S-04
- **Parallel with:** S-05, S-06, S-07, S-09
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Słowo „publiczny” nie może oznaczać dostępu dla innych osób; osobny wycinek pozwala zweryfikować tę granicę prywatności.
- **Status:** done

Domyślna widoczność to publiczny: wyłącznie autor i jego przypisany trener. Prywatny komentarz widzi tylko autor, także po odświeżeniu i ponownym logowaniu. Wybór widoczności jest egzekwowany przy dostępie do treści; brak komentarza nigdy nie blokuje zakończenia treningu.

### S-09: Podopieczny koryguje zakończony trening

- **Outcome:** Podopieczny może poprawić zakończony trening, w tym zamienić ćwiczenie w konkretnym wykonaniu, a trener widzi oznaczenie korekty, aktualne wyniki i zamiennik obok skreślonego oryginału.
- **Change ID:** correct-completed-training
- **PRD refs:** FR-010, FR-012, FR-013, US-02
- **Prerequisites:** S-05, S-07
- **Parallel with:** S-06, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Korekta może zatrzeć pierwotną rozpiskę lub stworzyć mylące porównanie różnych ćwiczeń, dlatego korzysta z gotowego widoku wyników i rozliczania rund.
- **Status:** done

Zamiennik zawiera nazwę, liczbę serii, powtórzenia, trudność oraz RIR lub RPE podopiecznego. Oryginalny plan i jego RIR/RPE trenera pozostają zachowane. Korekta nie zmienia planu ani innych wykonań; jest dostępna również po wygaśnięciu planu. Różnice liczbowe dotyczą tylko tego samego ćwiczenia i parametru. Weryfikacja obejmuje także wykonania z superserią, bez ponownego mnożenia serii przez rundy.

## Backlog Handoff

- S-01: zakończony; 14/14 kryteriów [planu](../changes/assigned-trainee-access/plan.md), w tym ręczny odbiór użytkownika z 2026-09-14. Nie uruchamiać ponownie planowania tego samego zakresu.
- S-02–S-09: wspólna implementacja `training-mvp-cycle`, testy DB oraz dwa scenariusze E2E przeszły na świeżej bazie. [Mapa wymagań](../changes/training-mvp-cycle/requirements.md) wskazuje zakres każdej warstwy weryfikacji.
- Przed udostępnieniem: osobny zatwierdzony plan migracji ról i treningów, przygotowane konta, eksport i próba odtworzenia, testy zdalne, logi i rollback. Zatwierdzenie startera nie obejmuje migracji danych domenowych.
- Następna decyzja produktowa po udostępnieniu: sprawdzić North Star u rzeczywistych podopiecznych i trenerów. Opcjonalne AI pozostaje w Parked.

## Open Roadmap Questions

1. Czy przewidywane problemy z arkuszami występują u rzeczywistych podopiecznych i trenerów oraz jaki mają koszt? Hipoteza do sprawdzenia; właściciel: użytkownik; termin nieustalony.

Właściciel: użytkownik. Blok: nie — pytanie dotyczy walidacji produktu, nie możliwości planowania któregokolwiek wycinka. S-04 umożliwia pierwszą próbę z podopiecznym, a S-05 także ocenę korzyści trenera. Obserwacje mogą zmienić dalsze priorytety; samo dostarczenie funkcji nie potwierdza hipotezy.

## Parked

- **Samodzielna rejestracja i zaproszenia mailowe** — poza zakresem PRD; przygotowane konta i przypisania wystarczają. Publiczna rejestracja pozostaje wyłączona.
- **Inne dyscypliny, biblioteka ćwiczeń, filmy instruktażowe, import arkuszy i automatyczna progresja** — poza zakresem PRD; trening siłowy jest rozpisywany i aktualizowany ręcznie.
- **Czat, powiadomienia, płatności i integracje z zegarkami** — poza zakresem PRD; nie są potrzebne do planu i jego wykonania.
- **Aplikacja natywna i tryb offline** — poza zakresem PRD; pierwsza wersja to responsywna aplikacja webowa online.
- **Podsumowanie AI (FR-011)** — opcjonalne, poza wymaganym kamieniem milowym. Późniejsze wdrożenie musi zachować generowanie na żądanie oraz oznaczanie nieaktualności po korektach.

## Milestone History

- **M-1 — training-without-spreadsheets**, zamknięty 2026-09-14. Źródło: PRD v1. Zakres: S-01–S-09, FR-001–FR-010 i FR-012–FR-015, US-01–US-04. Wynik: lokalny przepływ plan → wykonanie → porównanie oraz wymagane rozszerzenia; testy DB/HTTP i E2E 2/2 PASS, ręczna akceptacja S-01 przez użytkownika. Wdrożenie i walidacja wartości u rzeczywistych użytkowników pozostają przed udostępnieniem.

## Done

2026-09-14: lokalna implementacja S-02–S-09 w `training-mvp-cycle`; pełny izolowany przebieg Auth → dostęp → treningi → E2E PASS. Po późniejszym potwierdzeniu ręcznego odbioru S-01 przez użytkownika zamknięto również S-01 i M-1. Nie archiwizowano zmian.
