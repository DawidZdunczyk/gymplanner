# Dostęp do przypisanych podopiecznych — krótki plan

> [Pełny plan](plan.md) · [Zmiana S-01](change.md) · [Roadmapa](../../foundation/roadmap.md)

## Co i dlaczego

Trener ma widzieć wszystkich swoich podopiecznych w jednym miejscu i jednoznacznie wybierać osobę. Ten pierwszy przepływ ustanawia też ochronę danych, na której oprą się późniejsze plany i wyniki treningów.

## Punkt wyjścia

Działa logowanie, sesja i wylogowanie. Dashboard pokazuje dziś tylko powitanie; nie istnieją profile, role, przypisania ani ich ochrona w bazie. Testy sprawdzają uwierzytelnianie, lecz nie granice dostępu między użytkownikami.

## Pożądany stan końcowy

Po logowaniu trener trafia do listy swoich podopiecznych i może otworzyć kartę wybranej osoby. Podopieczny widzi własne oznaczenie, przypisanego trenera oraz informację o przyszłej dostępności treningów. Brak przygotowanego profilu daje czytelny ekran oczekiwania z wylogowaniem.

## Kluczowe podjęte decyzje

| Decyzja             | Wybór                                            | Dlaczego                                                              |
| ------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Przypisania         | Najwyżej jeden trener na podopiecznego           | Jednoznaczna odpowiedzialność i dostęp.                               |
| Role                | Jedna rola na konto                              | Prostsze reguły oraz widoki.                                          |
| Tożsamość           | Nazwa i unikalny opis, bez e-maila drugiej osoby | Rozróżnia osoby o tej samej nazwie bez dodatkowego ujawniania danych. |
| Widok podopiecznego | Własna nazwa oraz nazwa przypisanego trenera     | Użytkownik rozpoznaje poprawne przypisanie.                           |
| Logowanie           | Bezpośrednio do panelu roli                      | Krótsza droga do aplikacji.                                           |
| Brak profilu        | Ekran oczekiwania z zachowaną sesją              | Operator może dokończyć konfigurację bez ponownego zakładania konta.  |
| Wybór osoby         | Osobna karta podopiecznego                       | Jednoznaczny adres pod późniejsze funkcje treningowe.                 |

Wszystkie siedem decyzji potwierdził użytkownik. Sposób realizacji wynika z badania istniejącego kodu.

## Zakres

**W zakresie:** profile i bieżące przypisania, odczyt ograniczony w bazie, panel obu ról, karta podopiecznego, trwała sesja, procedura operacyjna i automatyczne testy dostępu.

**Poza zakresem:** treningi, rejestracja, zaproszenia, edycja profili przez użytkowników, panel administracyjny, wiele ról, wielu trenerów jednego podopiecznego, publikacja i zmiany hostowanych baz.

## Podejście

Strony serwerowe korzystają z istniejącego logowania i jednego klienta na żądanie. Baza pozwala użytkownikowi odczytać własny profil i dane drugiej osoby wyłącznie w ramach przypisania; zapisy przygotowuje operator. Zmiana relacji działa przy następnym odczycie bez ponownego logowania. Błędu dostawcy nie pokazujemy jako pustej listy.

## Fazy w skrócie

| Faza                     | Co dostarcza                                                             | Kluczowe ryzyko                                           |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1. Profile i przypisania | Model danych, procedurę przygotowania kont i testy izolacji              | Błędna rola lub dostęp poza relacją.                      |
| 2. Panel obu ról         | Listę, kartę, widok podopiecznego i właściwe stany konta                 | Stare cookies lub odpowiedź z danymi innej osoby w cache. |
| 3. Weryfikacja i CI      | Test S-01 na świeżej lokalnej bazie oraz końcową kontrolę w przeglądarce | CI bez migracji daje pozorny sukces.                      |

**Wymagania wstępne:** Node 22.22.3, zależności projektu, Docker i lokalny Supabase. Profile użytkowników nie są wymagane do planowania — ich przygotowanie należy do fazy 1. Nie ustalono szacunku ani budżetu czasu.

## Ryzyka i założenia

- Role i przypisania są przygotowywane operacyjnie; aplikacja ich nie edytuje.
- Uprawnienia zmieniają się przy następnym żądaniu; już otwarta strona nie jest zdalnie czyszczona.
- Zachowujemy równoległe poprawki testów i wdrożenia; nie nadpisujemy ich wcześniejszą wersją.
- Przed udostępnieniem potrzebny będzie osobno zatwierdzony plan migracji i publikacji. Plan S-01 tego nie zatwierdza.

## Kryteria sukcesu

- Trener widzi tylko przypisane osoby; obcy UUID i bezpośrednie API bazy nie omijają ochrony.
- Podopieczny widzi poprawnego trenera, a konto bez profilu otrzymuje ekran oczekiwania. Sesja działa po odświeżeniu; wylogowanie odbiera dostęp.
- Testy danych i HTTP przechodzą lokalnie oraz w izolowanym środowisku CI; użytkownik potwierdza końcowe sprawdzenia w przeglądarce.

Następny etap po przeglądzie: `/10x-implement assigned-trainee-access phase 1`. Plan i brief nie uruchamiają implementacji automatycznie.

Skill `10x-implement` jest zainstalowany. Użytkownik zatwierdził wykonanie trzech faz; końcowe testy ręczne wymagają potwierdzenia.
