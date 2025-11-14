<!-- b4d8910e-42f7-475b-b482-ca4e67a2f120 b9bf19a6-7808-4e46-8dea-1df57fefa8de -->
# Specyfikacja wymagań biznesowych — MVP rozliczania mediów

## 1. Zakres i założenia

- **Zakres**: jedno mieszkanie, jeden aktywny najemca (w danym czasie).
- **Okres rozliczeniowy**: pełne miesiące kalendarzowe; brak rozliczeń proporcjonalnych w miesiącu.
- **Obowiązywanie warunków**: warunki rozliczeniowe (kwoty/ceny/prognozy) obowiązują od 1. dnia miesiąca.
- **Podatki**: ceny jednostkowe zawierają podatek (VAT) wliczony w cenę.
- **Blokada raportu po zrealizowaniu**: po oznaczeniu raportu jako „zrealizowano” dalsze zmiany są zablokowane; odblokowanie tylko przez administratora; zdarzenie jest rejestrowane.

## 2. Role i dostęp

- **Najemca**: 
- wprowadza/aktualizuje własne odczyty liczników wyłącznie w dozwolonym oknie czasowym,
- ma podgląd własnych raportów rozliczeniowych.
- **Administrator**:
- zarządza warunkami rozliczeniowymi (kwoty/ceny/prognozy, obowiązujące od 1. dnia miesiąca),
- zarządza wymianami liczników,
- może dodawać/edytować odczyty (także po oknie czasowym) i korygować datę/czas pomiaru,
- generuje/regeneruje raporty, oznacza „zrealizowano”, odblokowuje raporty,
- ma pełny wgląd oraz odpowiedzialność za proces.

- **Polityki dostępu (RLS)**: włączone. Najemca ma dostęp tylko do własnych danych w ramach przypisanego `propertyId`; administrator ma pełny dostęp w ramach `propertyId`.

- **Dane najemcy (PII)**: przechowujemy wyłącznie e‑mail oraz opcjonalne `displayName`; brak telefonu i adresu korespondencyjnego.
- **Ograniczenie najemców**: dokładnie jeden aktywny najemca przypisany do `propertyId` w danym czasie.

## 3. Pomiary i przypisanie do miesiąca (kotwiczenie)

- **Liczniki**: zimna woda, ciepła woda, ogrzewanie (CO).
- **Precyzja odczytu**: 3 miejsca po przecinku.
- **Okno przypisania odczytu do miesiąca N**: 
- od ostatnich 3 dni miesiąca N−1 (włącznie),
- do pierwszych 5 dni miesiąca N (włącznie).
- **Zasady wyboru odczytu przypisanego do miesiąca N**:
- jeśli istnieją odczyty z dni 1–5 miesiąca N → wybierz najwcześniejszy z tego zakresu,
- w przeciwnym razie, jeśli istnieją odczyty z 3 ostatnich dni miesiąca N−1 → wybierz najpóźniejszy,
- w przeciwnym razie odczyt przypisany do N jest brakujący (raport zablokowany do czasu uzupełnienia).
- **Unikalność przypisania**: ten sam odczyt może być przypisany (kotwiczyć) maksymalnie jeden miesiąc.
 
 - **Wiele odczytów w oknie**: dopuszczalne jest rejestrowanie wielu odczytów w oknie −3/+5; system automatycznie wybiera odczyt przypisany do miesiąca wg powyższych reguł; w interfejsie wskazany jest odczyt wybrany.
 - **Nadpisanie wyboru**: administrator może ręcznie wskazać, który odczyt zakotwiczyć do miesiąca N (operacja jest rejestrowana w audycie).

- **Prezentacja w UI**: odczyt wybrany do miesiąca jest oznaczony; w przypadku ręcznego nadpisania wyboru przez administratora (override) zaznaczenie jest wyraźne.
- **Zachowanie UI poza oknem −3/+5**: pola wprowadzania dla najemcy są zablokowane z jasnym komunikatem; edycje i backdaty dostępne wyłącznie dla administratora w osobnym formularzu; komentarz jest opcjonalny.
- **Onboarding odczytów**: wymagany miesiąc startowy i wartości bazowe dla wszystkich liczników; pierwszy raport możliwy dopiero po posiadaniu odczytów N i N+1.

## 4. Zużycie i precyzje

- **Definicja zużycia** (dla każdego licznika):
\[ zużycie(N) = \max(0,\; odczyt\_{N+1} - odczyt\_N) \]
- **Jednostki**: m³ (woda), GJ (ogrzewanie).
- **Precyzje**: 
- zużycie: 3 miejsca po przecinku,
- ceny jednostkowe: 4 miejsca po przecinku,
- wartości pieniężne: 2 miejsca po przecinku, zaokrąglenie „half‑up”.
 - **Prezentacja liczb**: UI i e‑mail prezentują zużycie (3), ceny (4) i kwoty (2) zgodnie z zasadą „half‑up”.
 
 - **Walidacje operacyjne**:
 - zakres odczytów: 0–9 999 999,999; wartości ujemne są niedozwolone,
 - spadek odczytu bez wymiany licznika skutkuje zużyciem równym 0 dla tej pary miesięcy; przypadek jest oznaczany jako anomalia i nie blokuje procesu.

## 5. Warunki rozliczeniowe (miesięczne)

- **Parametry obowiązujące od 1. dnia miesiąca**:
- kwota stała zarządcy,
- cena jednostkowa zimnej wody (PLN/m³),
- cena jednostkowa podgrzania ciepłej wody (PLN/m³),
- cena jednostkowa ogrzewania (PLN/GJ),
- prognozowane miesięczne zużycia: zimna woda (m³), ciepła woda (m³), ogrzewanie (GJ),
- jednostka ogrzewania domyślnie GJ.
- **Cena ciepłej wody dla kosztów**: 
\[ cena\_{CW} = cena\_{ZW} + cena\_{podgrzania} \]
- **Zaliczka najemcy**: miesięczna kwota zaliczki przekazywana do rozliczenia salda.
 
 - **Prognozy równe 0**: dopuszczalne; nie blokują raportu, ale generują ostrzeżenie informacyjne.

- **Wersjonowanie miesięczne**: `advancePayment`, stawki i prognozy są wersjonowane od 1. dnia miesiąca.
- **Retroaktywne zmiany**: dozwolone tylko dla administratora; wymagają ręcznej regeneracji raportów dla dotkniętych miesięcy; raport oznaczony „zrealizowano” należy uprzednio odblokować.

## 6. Wyliczenia kosztów i salda

- **Koszty mediów** (za miesiąc):
- zimna woda: \[ koszt\_{ZW} = zużycie\_{ZW} \times cena\_{ZW} \]
- ciepła woda: \[ koszt\_{CW} = zużycie\_{CW} \times (cena\_{ZW} + cena\_{podgrzania}) \]
- ogrzewanie: \[ koszt\_{CO} = zużycie\_{CO} \times cena\_{CO} \]
- **Koszt stały**:
\[ koszt\_{stały} = kwota\_{zarządcy} - \big( prognoza\_{ZW} \times cena\_{ZW} + prognoza\_{CW} \times (cena\_{ZW} + cena\_{podgrzania}) + prognoza\_{CO} \times cena\_{CO} \big) \]
- **Czynsz rzeczywisty**:
\[ czynsz\_{rzeczywisty} = koszt\_{stały} + (koszt\_{ZW} + koszt\_{CW} + koszt\_{CO}) \]
- **Saldo** (dodatnie = nadpłata; ujemne = dopłata):
\[ saldo = zaliczka\_{najemcy} - czynsz\_{rzeczywisty} \]
- **Zaokrąglanie operacyjne**:
- zużycie: do 3 miejsc po przecinku,
- ceny: do 4 miejsc po przecinku,
- koszt pozycji (media): zużycie × cena, zaokrąglony do 2 miejsc metodą „half‑up”,
- sumy, czynsz rzeczywisty i saldo: do 2 miejsc metodą „half‑up”.

## 7. Warunki generacji i status raportu

- **Komplet danych wymagany**: do wygenerowania raportu za miesiąc M wymagane są odczyty przypisane do M i do M+1 (łącznie po jednym na każdy licznik w obu miesiącach).
- **Blokada przy braku danych**: brak któregokolwiek odczytu blokuje generację raportu.
- **Wysyłka po wygenerowaniu**: raport jest wysyłany jako treść e‑mail (HTML + wersja plaintext) w języku pl‑PL do najemcy i administratora; brak linków i załączników. Jeśli adresy są identyczne, odbiorcy są deduplikowani. Temat e‑maila zawiera adres lokalu i miesiąc raportu.
- **Status „zrealizowano”**: po oznaczeniu raportu jest on zablokowany; odblokowanie wyłącznie przez administratora, bez obowiązku podania powodu; zdarzenie jest rejestrowane.
- **Unikalność raportu**: jeden raport na kombinację (umowa × miesiąc). Ponowna generacja nadpisuje wartości i rejestruje różnice.
 
 - **Regeneracja raportu**: ponowna generacja nie wysyła e‑maila automatycznie; dostępna jest akcja „Wyślij ponownie e‑mail”.
 - **Anty‑duplikacja wysyłek**: dla danego raportu obowiązuje throttling — maksymalnie jedna udana wysyłka co 10 minut; statusy i próby są rejestrowane.

- **Idempotencja i throttling wysyłek**: stosowany jest klucz idempotencji `(reportId, recipient)` oraz pole `lastSentAt`; deduplikacja odbiorców wg adresu e‑mail; egzekwowane jest ograniczenie ≥10 minut między udanymi wysyłkami na raport/odbiorcę.

## 8. Wymiana licznika

- **Skutek od wskazanego miesiąca**: odczyty liczone względem nowej bazy ustawionej na zadaną wartość początkową.
- **Ciągłość historyczna**: miesiące przed wymianą pozostają bez zmian.
- **Monotoniczność**: po wymianie dopuszcza się przerwanie monotoniczności względem wcześniejszych odczytów (od miesiąca wymiany licznik liczony od nowej bazy).
 
 - **Parametry operacji**: obowiązkowe wskazanie miesiąca skuteczności i wartości bazowej nowego licznika; numer seryjny licznika jest opcjonalny; podanie powodu nie jest wymagane.

- **Zabezpieczenia**: zmiany wpływające na miesiące oznaczone „zrealizowano” wymagają świadomego potwierdzenia administratora (modal) i zapisu notatki do audytu.

## 9. Walidacje i wyjątki

- **Monotoniczność odczytów**: odczyty powinny być niemalejące w czasie dla danego licznika, z wyjątkiem okresu od miesiąca wymiany licznika. Naruszenie bez wymiany nie blokuje — system liczy zużycie 0 i oznacza anomalię.
- **Wysokie odchylenia**: odchylenie zużycia powyżej 50% względem odpowiedniej miesięcznej prognozy jest flagowane ostrzeżeniem. Próg jest konfigurowalny per licznik i lokal. Zapis jest dozwolony; komentarz jest opcjonalny.
- **Uzasadnienia**: odblokowanie raportu oraz zapisy z ostrzeżeniem nie wymagają podania powodu; wszystkie zdarzenia są rejestrowane.

- **Prezentacja ostrzeżeń**: ostrzeżenie jest widoczne inline w formularzu odczytu, jako ikona w historii odczytów oraz jako nota w e‑mailu z raportem.

## 10. Harmonogram powiadomień (e‑mail)

- **Dzień 1, 09:00 (Europe/Warsaw)**: przypomnienie do najemcy o wprowadzeniu odczytów za bieżący miesiąc.
- (usunięto eskalację Dzień 2)
- **Po komplecie 3 odczytów dla miesiąca M+1**: automatyczna kalkulacja i wysyłka raportu za miesiąc M do obu stron.
- **+72h po wysyłce raportu**: jeśli raport nie ma statusu „zrealizowano”, przypomnienie do administratora o weryfikacji i oznaczeniu.
- **Obsługa DST**: zadanie harmonogramu uruchamiane co godzinę; wysyłka wykonywana, gdy lokalnie jest 09:00±15 min.
- **Niezawodność**: przy tymczasowych błędach wysyłka jest ponawiana z retry: po 5 minutach, po 1 godzinie i po 24 godzinach.

## 11. Lokalizacja, eksport, raportowanie

- **Locale i waluta**: pl‑PL, PLN.
- **Eksport CSV**: wchodzi do MVP dla administratora; szczegóły w sekcji 16.
 
 - **Format raportu e‑mail**: minimalny, responsywny HTML z inline‑CSS + wariant plaintext (multipart/alternative); brak obrazów oraz załączników; temat: „[Adres] — Raport: MMMM YYYY (pl‑PL)” (jeśli dostępny, użyj `propertyLabel` zamiast adresu).
- **Nadawca e‑mail (From/Reply‑To)**: alias Gmail „Właściciel — Rozliczenia mediów”; Reply‑To do właściciela; w środowisku deweloperskim podgląd e‑maila bez rzeczywistej wysyłki i log treści.

## 12. Rejestrowanie zmian

- **Ślad zmian**: każda modyfikacja jest rejestrowana wraz z zakresem zmiany (przed/po), osobą wykonującą i czasem zdarzenia; przechowywany jest diff pól.
- **Snapshoty raportów**: przechowywany jest snapshot HTML wysłanych e‑maili (wersja raportu per wysyłka).
- **Retencja**: pełny audyt jest przechowywany bezterminowo.

- **Potwierdzenia operacji**: akcje „Zrealizowano”, „Odblokuj”, „Regeneruj”, „Wymiana licznika”, „Override kotwiczenia” wymagają modalnego potwierdzenia; notatka jest opcjonalna i dołączana do audytu wraz z diffem zmian.

## 13. Kryteria akceptacji (MVP)

1. Komplet 3 odczytów skutkuje poprawnym wyliczeniem: zużyć (3 miejsca), kosztów (pozycje do 2 miejsc „half‑up”), kosztu stałego, czynszu rzeczywistego i salda; wysłany jest raport e‑mail (HTML+plaintext) do deduplikowanych odbiorców.
2. Brakujący odczyt blokuje raport; brak eskalacji w Dniu 2; po uzupełnieniu danych generacja i wysyłka następują automatycznie.
3. Przypadki brzegowe zaokrągleń są zgodne z przyjętymi zasadami (pozycje do 2 miejsc „half‑up”; sumy/czynsz/saldo do 2 miejsc „half‑up”).
4. Koszt ciepłej wody liczony jako suma ceny zimnej wody i ceny podgrzania.
5. Parametry rozliczeniowe obowiązują od 1. dnia miesiąca i są dobierane według miesiąca raportu; `advancePayment` wersjonowane miesięcznie.
6. Wymiana licznika od miesiąca N: miesiąc N−1 bez zmian; miesiąc N liczony od nowej bazy; numer seryjny opcjonalny.
7. Raport po „zrealizowano” jest zablokowany; odblokowanie wymaga uprawnień administratora; powód nie jest wymagany; wszystkie operacje są rejestrowane, w tym snapshot HTML wysyłki.
8. Ponowna generacja nadpisuje istniejący raport (umowa × miesiąc); różnice są rejestrowane; ponowna wysyłka tylko z akcji administratora i z throttlingiem 10 min.
9. Harmonogram realizuje przypomnienie Dzień 1 o 09:00 lokalnie; po komplecie M+1 uruchamia kalkulację i wysyłkę; retry 5 min/1 h/24 h przy błędach tymczasowych.
10. Przypisanie odczytów do miesięcy respektuje priorytet: 1–5 dnia miesiąca N, a w razie braku — 3 ostatnie dni miesiąca N−1; jeden odczyt przypisuje co najwyżej jeden miesiąc; administrator może nadpisać wybór.

11. Brak duplikacji wysyłek dzięki idempotencji i throttlingowi (maksymalnie jedna udana wysyłka na 10 minut na raport/odbiorcę).
12. Wysyłki on‑time ≥95% (przypomnienia D1 09:00±15 oraz automaty po komplecie M+1).
13. 100% pokrycia testami kalkulacji, w tym scenariusze zaokrągleń brzegowych.
14. Widoczność ostrzeżeń odchylenia i anomalii w UI oraz w treści e‑maila.

## 14. Dane lokalu (adres i identyfikator)

- **Pola adresowe**: `street`, `number`, `unit`, `postalCode`, `city`, opcjonalnie `propertyLabel`.
- **Identyfikacja w komunikacji**: w temacie e‑mail używać `propertyLabel` lub sformatowanego adresu.
- **Niezmienność w raportach „zrealizowano”**: adres/etykieta użyte w gotowym raporcie są zamrożone i nie podlegają późniejszym zmianom danych lokalu.

## 15. Kokpit administratora

- **Zakres**: widok miesięcy z informacją o kompletności odczytów, liczbie ostrzeżeń, ostatniej wysyłce i błędach.
- **Nawigacja**: szybkie linki do sekcji „Odczyty” oraz „Raporty”.

## 16. Eksport CSV

- **Uprawnienia**: dostępny wyłącznie dla administratora.
- **Odczyty**: eksport w zadanym zakresie dat oraz per licznik.
- **Raporty**: eksport dla miesięcy zawierający zużycia, koszty, koszt stały, czynsz rzeczywisty i saldo.
- **Do doprecyzowania**: nagłówki, separator i kodowanie (do ustalenia w kolejnej iteracji).

## 17. Retencja logów technicznych

- **Okres**: logi transportu e‑mail i zadań harmonogramu przechowywane przez 90 dni.
- **Zawartość**: bez danych osobowych (bez PII); audyt biznesowy i snapshoty HTML są przechowywane bezterminowo.

## Aneks: Ustalenia techniczne (informacyjnie)

- **Uwierzytelnianie**: Supabase Magic Link (bez haseł); sesje 30 dni.
- **RLS**: polityki włączone; najemca dostęp tylko do własnych danych (`propertyId`), administrator pełny dostęp.
- **E‑mail**: Gmail SMTP (hasło aplikacji); dane dostępowe przechowywane jako sekrety środowiskowe; w środowisku deweloperskim podgląd e‑mail bez rzeczywistej wysyłki.
- **Hosting**: Vercel (aplikacja), Supabase (Postgres, auth, harmonogramy).

## Aneks B: UAT i sekrety

- **Sekrety i środowiska**: Gmail app password, konto testowe, projekt Supabase.
- **Dane testowe**: przygotowane odczyty i warunki dla co najmniej 3 kolejnych miesięcy.
- **Przegląd**: checklist UAT obejmująca kalkulacje, wysyłki (w tym retry i throttling), audyt i eksporty.
- **Harmonogram**: zamknięcie UAT do dnia 10 od startu prac nad MVP.