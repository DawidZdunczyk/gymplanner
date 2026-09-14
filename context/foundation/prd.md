---
project: GymPlanner
version: 1
status: draft
created: 2026-09-13
context_type: greenfield
product_type: web-app
target_scale:
  users: small
# Celowo bez wartości na polecenie użytkownika; nie ustalać ani nie przyjmować domyślnego budżetu czasu.
timeline_budget: null
---

# GymPlanner — PRD

## Vision & Problem Statement

Hipoteza do sprawdzenia: podopiecznemu zapisującemu wyniki serii na telefonie przeszkadzają mało czytelne arkusze i opóźnienia w ich odświeżaniu. Korzystanie z arkuszy wymaga też dostosowywania formuł i samodzielnej analizy danych. Opis problemu jest przewidywaniem, nie wynika z obserwacji rzeczywistych treningów; jego koszt nie został zmierzony.

Proponowana wartość GymPlanner: podopieczny otrzymuje dopasowany plan udostępniony przez trenera i szybko, wygodnie uzupełnia wyniki. Trener ma wgląd do wszystkich swoich podopiecznych w jednym miejscu, bez przełączania arkuszy. Analiza w MVP obejmuje czytelne porównanie planu z wykonaniem i wskazanie różnic.

## User & Persona

Główna persona: podopieczny realizujący trening siłowy, który odczytuje plan od trenera i zapisuje wyniki poszczególnych serii w aplikacji webowej, otwierając stronę internetową. W razie konfliktu potrzeb obu ról MVP stawia jego wygodę na pierwszym miejscu.

### Secondary persona

Trener rozpisujący i przypisujący treningi, który potrzebuje wglądu w wyniki swoich podopiecznych w jednym miejscu oraz porównania planu z wykonaniem.

## Success Criteria

### Primary

- Pełny przepływ działa bez korzystania z arkusza: trener rozpisuje i przypisuje plan z tygodniowym układem jednostek, okresem ważności oraz parametrami aktualizowanymi w kolejnych tygodniach; podopieczny otwiera wybrany trening na stronie internetowej, oznacza rozgrzewkę jako wykonaną lub pominiętą, zapisuje wyniki serii części właściwej i rozlicza jej wykonanie, podaje oceny trudności niepominiętych ćwiczeń części właściwej i całego treningu, a następnie kończy trening; trener odczytuje plan obok wykonania oraz widzi różnice.

### Secondary

- Podopieczny może na żądanie otrzymać podsumowanie AI zakończonego treningu, opisujące wykonanie i trudności na podstawie wyników, ocen oraz komentarza, jeśli został dodany. Jest to opcjonalne rozszerzenie, a nie warunek sukcesu MVP.
- Po korekcie danych treningu podsumowanie jest oznaczone jako nieaktualne; podopieczny może ponownie wybrać „Podsumuj trening”.

### Guardrails

- Użytkownicy nie mają dostępu do danych spoza przypisanych im relacji.
- Zakończenie wymaga statusu wykonana/pominięta dla całej rozgrzewki, rozliczenia wykonania części właściwej, wymaganych wyników każdej wykonanej serii oraz ocen trudności niepominiętych ćwiczeń części właściwej i całego treningu. Komentarz jest opcjonalny; ćwiczenia rozgrzewki nie wymagają wyników ani ocen.
- Odchylenie rzeczywistej liczby serii lub powtórzeń od zaplanowanego zakresu jest widoczne i nie blokuje zakończenia treningu; wymagany jest zapis rzeczywistych wyników oraz pozostałych wymaganych ocen.
- Ćwiczenie pominięte w całości ma status pominiętego i nie wymaga oceny trudności.
- Aktualizacja trenera nie zmienia rozpiski rozpoczętych ani zakończonych treningów. Zakończony trening zachowuje rozpiskę, według której został wykonany; korekty wykonania przez podopiecznego pozostają dozwolone.

## User Stories

### US-01: Trener zleca trening, podopieczny zapisuje wykonanie, trener porównuje wyniki

- **Given** trener i podopieczny mają przygotowane konta oraz przypisaną relację.
- **When** trener rozpisuje i przypisuje plan z tygodniowym układem jednostek i okresem ważności, a podopieczny otwiera wybrany trening na stronie internetowej, oznacza rozgrzewkę jako wykonaną lub pominiętą, zapisuje wyniki wykonanych serii części właściwej i rozlicza jej wykonanie, ocenia trudność ćwiczeń części właściwej i całego treningu, a następnie kończy trening.
- **Then** trener widzi plan obok wykonania oraz różnice, a zakończony trening zachowuje rozpiskę, według której został wykonany.

#### Acceptance Criteria

- Cała rozgrzewka ma status wykonana/pominięta; jej ćwiczenia nie wymagają wyników ani ocen.
- Dla ćwiczenia części właściwej poza superserią brak liczby serii oznacza jedno wykonanie do rozliczenia.
- Serie są rozliczane zgodnie z konfiguracją ćwiczenia; każda wykonana seria ma wyniki wymagane przez tę konfigurację, np. czas albo powtórzenia i przewidziany ciężar. Przy zakresie 3–5 serii wystarczą trzy wykonane i wypełnione serie.
- Oceny trudności niepominiętych ćwiczeń części właściwej i całego treningu są wymagane do zakończenia treningu; komentarz jest opcjonalny.
- Podopieczny widzi tylko własne treningi, a trener dane przypisanych mu podopiecznych.
- Podsumowanie AI nie jest warunkiem zakończenia głównego przepływu.

### US-02: Podopieczny koryguje ćwiczenie w zakończonym treningu

- **Given** podopieczny ma zakończony trening z ćwiczeniem rozpisanym przez trenera.
- **When** podopieczny zamienia to ćwiczenie w konkretnym wykonaniu treningu i podaje nazwę zamiennika, liczbę serii, powtórzenia, ocenę trudności oraz RIR lub RPE.
- **Then** trener widzi w tym treningu swoje pierwotne ćwiczenie jako skreślone oraz ćwiczenie dodane przez podopiecznego wraz z podanymi parametrami.

#### Acceptance Criteria

- Zamiana dotyczy konkretnego wykonania treningu, nie całego planu ani innych wykonań jednostki.
- Oryginalne ćwiczenie pozostaje widoczne dla trenera jako skreślone.
- Trening jest oznaczony jako poprawiony, a trener widzi aktualne wyniki.
- RIR lub RPE zamiennika podaje podopieczny; RIR/RPE oryginalnego planu podaje trener.

### US-03: Podopieczny odczytuje superserię z rundami i przerwami

- **Given** trener przygotował superserię zawierającą uporządkowane ćwiczenia z osobno dobranymi parametrami oraz określił liczbę powtórzeń całej grupy.
- **When** podopieczny otwiera przypisany trening.
- **Then** widzi wyraźnie superserię, zawarte w niej ćwiczenia, kolejność ich wykonania, liczbę rund i przypisane przerwy.

#### Acceptance Criteria

- Runda oznacza wykonanie jednej serii każdego ćwiczenia całej grupy; trener może ustawić wielokrotne wykonanie grupy, np. trzy rundy dają po trzy serie każdego ćwiczenia. Liczba rund nie mnoży dodatkowej liczby serii ćwiczenia.
- W jednej grupie mogą wystąpić różne konfiguracje ćwiczeń, np. wyciskanie na powtórzenia, deska na czas i podciąganie.
- Przerwa między ćwiczeniami jest opcjonalna i może być określona czasem, dystansem lub otwartą instrukcją tekstową. Przykłady użytkownika: „do tętna 120”, „do całkowitego wypoczynku”.
- Podopieczny widzi również przerwę między rundami, jeśli trener ją określił: po wykonaniu wszystkich ćwiczeń grupy, przed rozpoczęciem kolejnej rundy.

### US-04: Podopieczny rozlicza liczbę serii z podanego zakresu

- **Given** trener rozpisał ćwiczenie na 3–5 serii, a pozostałe warunki zakończenia treningu są spełnione.
- **When** podopieczny wykonuje trzy serie i wpisuje rzeczywiste wyniki każdej z nich.
- **Then** liczba serii jest zaakceptowana i nie blokuje zakończenia treningu.

#### Acceptance Criteria

- Zakres 3–5 dopuszcza trzy wykonane i wypełnione serie; pięć nie jest obowiązkowe.
- Liczba serii i liczba powtórzeń mogą być określone konkretną liczbą, zakresem albo jako „Bez limitu”.
- Przy braku limitu serii podopieczny wpisuje wyniki każdej faktycznie wykonanej serii; dla ćwiczenia na powtórzenia podaje rzeczywistą liczbę powtórzeń w każdej serii.
- Brak wpisanej liczby serii poza superserią oznacza jedno wykonanie i jest odrębny od jawnie wybranego „Bez limitu”.
- Zakresy serii i powtórzeń są celami treningowymi. Podopieczny może zapisać rzeczywiste wyniki poniżej lub powyżej zakresu i zakończyć trening; odchylenie od planu jest widoczne.

## Functional Requirements

MVP obejmuje 14 wymagań must-have. FR-011, podsumowanie AI, ma priorytet nice-to-have. Wszystkie 15 wymagań przeszło rundę pytań krytycznych; rozstrzygnięcia znajdują się przy odpowiednich FR.

### Dostęp

- FR-001: Trener i podopieczny mogą logować się e-mailem i hasłem do przygotowanych kont i pozostawać zalogowani między wizytami. Priority: must-have
  > Socrates: Ciągłe logowanie przeszkadza podczas treningu. Rozstrzygnięcie użytkownika: sesja powinna pozostawać aktywna między wizytami; wymaganie zachowane i doprecyzowane.
- FR-002: Trener może przeglądać swoich podopiecznych w jednym miejscu, z wyraźnym wskazaniem osoby przy rozpisce i wynikach. Priority: must-have
  > Socrates: Łatwo pomylić podopiecznych. Rozstrzygnięcie użytkownika: przy rozpisce i wynikach musi być wyraźnie wskazana osoba; wymaganie zachowane i doprecyzowane.

### Planowanie treningu

- FR-003: Trener może rozpisać i przypisać podopiecznemu plan z tygodniowym układem jednostek, także powtarzających się, konfigurując osobno parametry każdego ćwiczenia (powtórzenia, serie, RPE/RIR, ciężar, uwagi, czas trwania) oraz podając liczbę serii i powtórzeń jako konkretną liczbę, zakres lub „Bez limitu”, z osobnymi ciężarami, powtórzeniami i RIR/RPE dla każdego wystąpienia jednostki w tygodniu. Priority: must-have
  > Socrates: Wspólne parametry powtarzanej jednostki ograniczałyby różnicowanie jej intensywności. Rozstrzygnięcie użytkownika: każde wystąpienie tej samej jednostki w tygodniu może mieć różne ciężary, powtórzenia i RIR/RPE.
- FR-004: Trener może przeglądać, edytować i usuwać zaplanowane treningi swoich podopiecznych oraz ręcznie aktualizować ciężary, powtórzenia i RIR/RPE tylko we wskazanym tygodniu i nierozpoczętych treningach. Priority: must-have
  > Socrates: Edycja mogłaby zmienić inne tygodnie lub rozpiskę, według której podopieczny już ćwiczy. Rozstrzygnięcie użytkownika: aktualizacja obejmuje tylko wskazany tydzień i nierozpoczęte treningi; rozpoczęte i zakończone zachowują rozpiskę.

### Wykonanie treningu

- FR-005: Podopieczny może odczytać własny plan treningu na stronie internetowej, z wyraźnie pokazanym tygodniem, konkretnym wystąpieniem jednostki i statusem otwartego treningu. Priority: must-have
  > Socrates: Powtarzające się jednostki stwarzają ryzyko otwarcia niewłaściwego treningu lub tygodnia. Rozstrzygnięcie użytkownika: przy otwartym treningu wyraźnie pokazujemy tydzień, konkretne wystąpienie jednostki i status treningu.
- FR-006: Podopieczny może zapisać wyniki wykonania serii części właściwej zgodnie z konfiguracją ćwiczenia wybraną przez trenera, np. rzeczywisty czas albo rzeczywiste powtórzenia i ciężar, jeśli został przewidziany. Priority: must-have
  > Socrates: Stały obowiązek wpisywania ciężaru nie pasuje do wszystkich ćwiczeń. Rozstrzygnięcie użytkownika: trener wybiera parametry osobno dla ćwiczenia i może podać same powtórzenia albo powtórzenia, serie, RPE/RIR, ciężar, uwagi lub czas trwania. Wymagane wyniki zależą od konfiguracji ćwiczenia, a ocena trudności pozostaje obowiązkowa dla niepominiętych ćwiczeń części właściwej; RPE/RIR oryginalnej rozpiski podaje trener.
- FR-007: Podopieczny może ocenić trudność ćwiczeń części właściwej i całego treningu w skali 1–10, gdzie 1 oznacza łatwy, a 10 bardzo trudny / maksimum; ćwiczenie pominięte w całości ma status pominiętego i nie wymaga oceny. Priority: must-have
  > Socrates: Ocena ćwiczenia pominiętego w całości wymuszałaby ocenienie czegoś niewykonanego. Rozstrzygnięcie użytkownika: takie ćwiczenie oznaczamy jako pominięte i nie wymagamy jego oceny trudności.
- FR-008: Podopieczny może dodać opcjonalny komentarz do treningu, domyślnie publiczny dla niego i jego przypisanego trenera, lub ustawić widoczność prywatną tylko dla siebie. Priority: must-have
  > Socrates: Nazwa „notatka” może sugerować prywatny wpis. Rozstrzygnięcie użytkownika: komentarz można oznaczyć jako prywatny; wprowadzamy wybór publiczny/prywatny. Publiczny komentarz widzą autor i jego przypisany trener; prywatny widzi tylko autor. Domyślna widoczność to publiczny.
- FR-009: Podopieczny może oznaczać serie jako wykonane lub pominięte i zakończyć trening po oznaczeniu rozgrzewki jako wykonanej lub pominiętej, rozliczeniu wykonania części właściwej, podaniu wymaganych wyników serii i ocen trudności niepominiętych ćwiczeń części właściwej i całego treningu, także gdy rzeczywista liczba serii lub powtórzeń odbiega od zaplanowanego zakresu. Priority: must-have
  > Socrates: Brak liczby serii w konfiguracji ćwiczenia utrudnia określenie, ile wykonań należy rozliczyć. Rozstrzygnięcie użytkownika: dla ćwiczenia poza superserią brak liczby serii oznacza jedno wykonanie ćwiczenia.

### Przegląd wyników

- FR-010: Trener może porównać plan z wykonaniem w jednym widoku, zobaczyć różnice liczbowe dla tego samego ćwiczenia i parametru oraz zamienniki obok skreślonych oryginałów, zachowując wgląd w rozpiskę zakończonego treningu. Priority: must-have
  > Socrates: Liczbowe porównanie różnych ćwiczeń po zamianie mogłoby być mylące. Rozstrzygnięcie użytkownika: różnice liczbowe tylko dla tego samego ćwiczenia i parametru; zamienniki pokazujemy obok skreślonego oryginału.
- FR-011: Podopieczny może uruchomić przyciskiem „Podsumuj trening” podsumowanie AI zakończonego treningu na podstawie wyników, ocen trudności i komentarza, jeśli został dodany, oraz ponownie wygenerować podsumowanie oznaczone jako nieaktualne po korekcie danych treningu. Priority: nice-to-have
  > Socrates: Po poprawieniu zakończonego treningu wcześniejsze podsumowanie opisuje stare dane. Rozstrzygnięcie użytkownika: oznaczamy podsumowanie jako nieaktualne; podopieczny może ponownie wybrać „Podsumuj trening”.

### Ważność planu i korekty

- FR-012: Trener może określić okres ważności planu; po dacie końcowej podopieczny nie może rozpoczynać nowych treningów z planu, ale może dokończyć rozpoczęte oraz przeglądać i poprawiać historię. Priority: must-have
  > Socrates: Wygaśnięcie planu mogłoby zablokować rozpoczęty trening lub dostęp do historii. Rozstrzygnięcie użytkownika: po dacie końcowej nie rozpoczynamy nowych treningów z planu; rozpoczęte można dokończyć, a historię przeglądać i poprawiać.
- FR-013: Podopieczny może poprawić zakończony trening, w tym zamienić ćwiczenie w jednym konkretnym wykonaniu, podając nazwę zamiennika, liczbę serii, powtórzenia, poziom trudności oraz RIR lub RPE; trener widzi oryginalne ćwiczenie jako skreślone obok zamiennika, oznaczenie poprawionego treningu i aktualne wyniki. Priority: must-have
  > Socrates: Trener mógł już obejrzeć wyniki przed ich korektą. Rozstrzygnięcie użytkownika: oznaczamy trening jako poprawiony; trener widzi aktualne wyniki.

### Organizacja jednostki treningowej

- FR-014: Trener może tworzyć uporządkowane superserie z liczbą rund, opcjonalnymi przerwami między ćwiczeniami określonymi czasem, dystansem lub tekstem oraz przerwą między pełnymi rundami, przy czym jedna runda oznacza jedną serię każdego ćwiczenia, a podopieczny widzi ćwiczenia, ich kolejność, liczbę rund i przypisane przerwy. Priority: must-have
  > Socrates: Osobna liczba serii ćwiczenia mogłaby zostać pomnożona przez rundy i dać niezamierzoną liczbę wykonań. Rozstrzygnięcie użytkownika: jedna runda oznacza jedną serię każdego ćwiczenia; trzy rundy dają po trzy serie każdego ćwiczenia.
- FR-015: Trener może podzielić trening na rozgrzewkę i część właściwą, a podopieczny oznacza całą rozgrzewkę jednym statusem wykonana/pominięta, bez wyników i ocen jej ćwiczeń. Priority: must-have
  > Socrates: Pełne wyniki i oceny dla rozgrzewki mogłyby zwiększać ilość wpisywania. Rozstrzygnięcie użytkownika: całą rozgrzewkę oznaczamy jednym statusem wykonana/pominięta, bez wyników i ocen jej ćwiczeń.

## Non-Functional Requirements

- Potwierdzony zapis wyników przetrwa odświeżenie strony i ponowne logowanie.
- Przy błędzie zapisu użytkownik dowie się, że dane nie zostały zapisane; aplikacja nie pokaże fałszywego sukcesu.
- Dane treningowe są dostępne wyłącznie zgodnie z przypisanymi rolami i relacjami. Prywatny komentarz widzi tylko autor; komentarz publiczny widzą autor i jego przypisany trener.

## Business Logic

Trening można zakończyć po zapisaniu wymaganych wyników i ocen, nawet gdy rzeczywiste wykonanie odbiega od planu, a oryginalna rozpiska pozostaje zachowana do porównania.

Wymagane wyniki zależą od konfiguracji ćwiczenia, np. czas albo powtórzenia i przewidziany ciężar. Cele serii i powtórzeń mogą być liczbą, zakresem lub „Bez limitu”; zapisane wyniki spoza zakresu są akceptowane i widoczne jako odchylenia. Wykonana seria części właściwej ma rzeczywisty wynik, niepominięte ćwiczenia części właściwej i cały trening wymagają ocen trudności 1–10, a komentarz jest opcjonalny. Ćwiczenie pominięte w całości ma status pominiętego i nie wymaga oceny. Rozgrzewka jest oznaczana jako wykonana lub pominięta jednym statusem dla całej części, bez wyników i ocen jej ćwiczeń. Poza superserią brak liczby serii oznacza jedno wykonanie; w superserii jedna runda oznacza jedną serię każdego ćwiczenia, a przerwa po grupie obowiązuje między rundami.

Aktualizacja rozpiski dotyczy wskazanego tygodnia i nierozpoczętych treningów. Rozpoczęte i zakończone zachowują rozpiskę; po wygaśnięciu planu nie można rozpoczynać nowych treningów, ale można dokończyć rozpoczęte oraz przeglądać i poprawiać historię. Korekta podopiecznego dotyczy konkretnego wykonania treningu. Zamiennik ćwiczenia jest widoczny obok skreślonego oryginału; trening ma oznaczenie poprawionego, a trener widzi aktualne wyniki. Różnice liczbowe dotyczą tylko tego samego ćwiczenia i parametru.

Opcjonalne podsumowanie wykonania i trudności powstaje na żądanie podopiecznego z wyników, ocen i komentarza, jeśli został dodany. Po korekcie danych jest oznaczone jako nieaktualne i może zostać ponownie wygenerowane na żądanie.

## Access Control

Ustalone: logowanie przez e-mail i hasło do przygotowanych kont trenera i podopiecznych, z przypisanymi relacjami. Sesja pozostaje aktywna między wizytami. MVP nie obejmuje samodzielnej rejestracji ani zaproszeń mailowych.

Trener widzi swoich podopiecznych, tworzy i przypisuje im treningi oraz porównuje plan z wykonaniem. Podopieczny widzi wyłącznie własne treningi, zapisuje ich wykonanie i może poprawić zakończony trening, w tym zamienić ćwiczenie w konkretnym wykonaniu z zachowaniem widoczności oryginału. Użytkownicy nie mają dostępu do danych spoza przypisanych im relacji. Przy rozpisce i wynikach trener widzi wyraźnie wskazanego podopiecznego.

Komentarz do treningu jest opcjonalną notatką z wyborem widoczności publiczny/prywatny. Publiczny komentarz widzą autor i jego przypisany trener; prywatny widzi tylko autor. Domyślna widoczność to publiczny.

Osoba otwierająca link do treningu bez zalogowania widzi formularz logowania. Dane treningu są dostępne dopiero po zalogowaniu i sprawdzeniu uprawnień.

## Non-Goals

- Samodzielna rejestracja i zaproszenia mailowe — pierwsza wersja korzysta z przygotowanych kont i przypisanych relacji.
- Inne dyscypliny, biblioteka ćwiczeń, filmy instruktażowe, import arkuszy i automatyczna progresja — zakres obejmuje ręcznie rozpisywany trening siłowy; parametry kolejnych tygodni aktualizuje trener.
- Czat, powiadomienia, płatności i integracje z zegarkami — wymagane MVP skupia się na planie i jego wykonaniu.
- Aplikacja natywna i tryb offline — pierwsza wersja to responsywna aplikacja webowa działająca online.
- Obowiązkowe dostarczenie podsumowania AI — FR-011 pozostaje opcjonalnym rozszerzeniem poza wymaganym zakresem MVP.

## Open Questions

1. Czy przewidywane problemy z arkuszami występują u rzeczywistych podopiecznych i trenerów oraz jaki mają koszt? Hipoteza do sprawdzenia; właściciel: użytkownik; termin nieustalony.
