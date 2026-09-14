Tak — masz rację. **Upraszczając projekt, usunąłem jego główną wartość.** Sam zapis „trening, czas, trudność” nie zastępuje arkusza z rozpiską ćwiczeń. Powinniśmy ograniczyć zakres, zachowując konkretne zadania trenera i podopiecznego.

## GymPlanner — MVP

### Główny problem

Trenerzy rozpisują treningi w arkuszach kalkulacyjnych, ponieważ łatwo dopasować je do podopiecznego. Uzupełnianie wyników w arkuszu na telefonie jest jednak niewygodne, a plan i jego wykonanie bywają trudne do porównania.

GymPlanner pozwala trenerowi rozpisać trening, a podopiecznemu wygodnie zapisać wyniki przy każdym ćwiczeniu.

### Najmniejszy zestaw funkcjonalności

Pierwsza uruchomiona wersja: do 9 osób łącznie, licząc trenerów i podopiecznych.

- Logowanie e-mailem i hasłem z rolą trenera lub podopiecznego, z sesją aktywną między wizytami — trener widzi swoich podopiecznych, a podopieczny wyłącznie własne treningi.
- Przy rozpisce i wynikach trener widzi wyraźnie wskazanego podopiecznego.
- Tworzenie i przypisywanie podopiecznemu planu z jednostkami treningowymi rozpisanymi na tydzień. Jednostki mogą się powtarzać, np. cztery treningi tygodniowo oparte na dwóch różnych jednostkach. Trener może ustawić inne ciężary, powtórzenia i RIR/RPE dla każdego wystąpienia tej samej jednostki w tygodniu.
- Określanie przez trenera okresu ważności planu, np. miesiąca, w którym realizowany jest tygodniowy układ jednostek. Po dacie końcowej nie można rozpoczynać nowych treningów z planu; rozpoczęte można dokończyć, a historię przeglądać i poprawiać.
- Rozpisanie ćwiczeń z parametrami wybieranymi przez trenera osobno dla każdego ćwiczenia: powtórzenia, serie, RPE/RIR, ciężar, uwagi lub czas trwania, np. dla deski. Trener może podać same powtórzenia albo bardziej szczegółowy zestaw parametrów.
- Trener może określić liczbę serii i powtórzeń konkretną liczbą, zakresem albo oznaczeniem „Bez limitu”. Podopieczny zapisuje rzeczywiste powtórzenia osobno dla każdej wykonanej serii ćwiczenia na powtórzenia. Przy planie 3–5 serii wykonanie i wypełnienie trzech serii spełnia wymaganie liczby serii. Jawne „Bez limitu” jest odrębne od braku podanej liczby serii. Zakresy są celami treningowymi: rzeczywiste liczby serii i powtórzeń poza zakresem można zapisać i zakończyć trening, a odchylenie od planu jest widoczne.
- Konfigurowanie superserii jako uporządkowanych grup ćwiczeń z własnymi parametrami, np. wyciskanie na powtórzenia, deska na czas i podciąganie. Trener określa liczbę rund całej grupy, np. trzy; podopieczny widzi skład, kolejność i liczbę rund. Jedna runda oznacza jedną serię każdego ćwiczenia; trzy rundy dają po trzy serie każdego ćwiczenia, bez dodatkowego mnożenia przez liczbę serii ćwiczenia.
- Opcjonalne przerwy między ćwiczeniami superserii określane czasem, dystansem lub otwartą instrukcją tekstową, np. „do tętna 120” albo „do całkowitego wypoczynku”. Przerwa przypisana po całej grupie jest widoczna i obowiązuje między rundami: po wykonaniu wszystkich ćwiczeń grupy, przed rozpoczęciem kolejnej rundy.
- Podział treningu na rozgrzewkę i część właściwą. Cała rozgrzewka jest oznaczana jednym statusem „wykonana/pominięta”, bez wyników i ocen jej ćwiczeń.
- Przeglądanie, edycja i usuwanie zaplanowanych treningów oraz ręczna aktualizacja przez trenera ciężarów, powtórzeń i RIR/RPE. Aktualizacja dotyczy tylko wskazanego tygodnia i nierozpoczętych treningów; rozpoczęte i zakończone zachowują rozpiskę.
- Zapisywanie przez podopiecznego wyników wykonania serii części właściwej oraz opcjonalnego komentarza do treningu z wyborem widoczności publiczny/prywatny. Publiczny komentarz widzą autor i jego przypisany trener; prywatny widzi tylko autor. Domyślna widoczność to publiczny. Wymagane wyniki zależą od konfiguracji ćwiczenia: np. rzeczywisty czas dla ćwiczenia na czas albo rzeczywiste powtórzenia i ciężar, jeśli został przewidziany przez trenera. Ocena trudności pozostaje obowiązkowa dla niepominiętych ćwiczeń części właściwej; RPE/RIR oryginalnej rozpiski podaje trener.
- Dla ćwiczenia poza superserią brak podanej liczby serii oznacza jedno wykonanie ćwiczenia.
- Podanie oceny trudności każdego niepominiętego ćwiczenia części właściwej i całego treningu w skali 1–10: 1 = łatwy, 10 = bardzo trudny / maksimum.
- Zakończenie treningu po oznaczeniu całej rozgrzewki jako wykonanej lub pominiętej, rozliczeniu serii części właściwej zgodnie z konfiguracją ćwiczenia i podaniu ocen trudności niepominiętych ćwiczeń części właściwej i całego treningu. Seria wykonana wymaga podania wyniku; komentarz nie jest wymagany.
- Ćwiczenie pominięte w całości jest oznaczone jako pominięte i nie wymaga oceny trudności.
- Możliwość poprawienia zakończonego treningu przez podopiecznego, w tym zamiany ćwiczenia w jednym konkretnym wykonaniu treningu. Trener widzi swoje ćwiczenie jako skreślone oraz zamiennik podany przez podopiecznego: nazwa, liczba serii, powtórzenia, poziom trudności i RIR lub RPE. Zmiana dotyczy tego wykonania, a oryginalna rozpiska pozostaje widoczna. Po korekcie trening jest oznaczony jako poprawiony, a trener widzi aktualne wyniki.
- Widok trenera pokazujący plan obok wykonania. Różnice liczbowe dotyczą tylko tego samego ćwiczenia i parametru; zamienniki są widoczne obok skreślonego oryginału. Zakończony trening zachowuje rozpiskę, według której został wykonany.

### Co NIE wchodzi w zakres MVP

- Samodzielna rejestracja i zaproszenia mailowe — na zaliczenie przygotowane konta trenera i podopiecznych z przypisanymi relacjami.
- Obsługa wszystkich dyscyplin — pierwsza wersja dotyczy treningu siłowego.
- Biblioteka ćwiczeń i filmy instruktażowe.
- Automatyczna progresja — parametry w kolejnych tygodniach aktualizuje trener.
- Import arkuszy.
- Czat, powiadomienia, płatności i integracje z zegarkami.
- Aplikacja natywna i tryb offline — na początek responsywny web.

### Kryteria sukcesu

- Trener może rozpisać i przypisać plan z tygodniowym układem jednostek i okresem ważności oraz aktualizować parametry w kolejnych tygodniach bez korzystania z arkusza.
- Podopieczny może otworzyć stronę internetową, odczytać rozpiskę, zapisać wyniki poszczególnych serii i zakończyć trening. Przy otwartym treningu wyraźnie widzi tydzień, konkretne wystąpienie jednostki i status treningu.
- Trener może porównać wartości planowane z rzeczywistymi w jednym widoku.
- Aplikacja uniemożliwia zakończenie treningu bez rozliczenia serii zgodnie z konfiguracją ćwiczenia lub bez ocen trudności niepominiętych ćwiczeń części właściwej i całego treningu.
- Użytkownicy nie mają dostępu do danych spoza przypisanych im relacji.
- Automatyczny test E2E potwierdza przepływ: trener tworzy trening → podopieczny zapisuje wykonanie → trener odczytuje wyniki.

### Wymagania jakościowe

- Potwierdzony zapis wyników przetrwa odświeżenie strony i ponowne logowanie.
- Przy błędzie zapisu użytkownik dowie się, że dane nie zostały zapisane; aplikacja nie pokaże fałszywego sukcesu.

### Dodatkowy efekt — opcjonalne rozszerzenie

- Podsumowanie treningu przez AI dla podopiecznego po wybraniu przycisku „Podsumuj trening” dla zakończonego treningu; mile widziane, ale nie decyduje o sukcesie MVP. Ma opisywać wykonany trening i trudności na podstawie wyników, ogólnej oceny trudności treningu, oceny trudności wpisanej przy każdym ćwiczeniu oraz komentarza. Ocena trudności ćwiczeń części właściwej i całego treningu ma skalę 1–10: 1 = łatwy, 10 = bardzo trudny / maksimum. Trener podaje RIR/RPE w planie, a podopieczny ocenia trudność w skali 1–10. Przy zamianie ćwiczenia w konkretnym wykonaniu treningu podopieczny podaje również RIR lub RPE zamiennika. Oceny niepominiętych ćwiczeń części właściwej i całego treningu są wymagane do zakończenia treningu, a komentarz jest opcjonalną notatką, domyślnie publiczną dla podopiecznego i jego przypisanego trenera, z możliwością ustawienia widoczności prywatnej.

- Po korekcie danych zakończonego treningu podsumowanie AI jest oznaczone jako nieaktualne. Podopieczny może ponownie wybrać „Podsumuj trening”.

**Ten zakres jest większy od osobistego dziennika, ale zachowuje sens pierwotnego pomysłu.** Zakres MVP obejmuje ręczne wpisywanie ćwiczeń, przygotowane konta i jeden format treningu. AI wykorzystujemy do wytworzenia projektu.
