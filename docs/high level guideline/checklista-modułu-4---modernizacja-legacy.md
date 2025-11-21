---
title: "Checklista Modułu 4 - Modernizacja legacy"
module: "m4-legacy"
description: "Kompleksowa checklista modernizacji legacy code"
source: "Przeprogramowani.pl - 10xDevs"
exported: "2025-11-21"
---

# Checklista Modułu 4 - Modernizacja Legacy Code

Kompleksowa checklista najważniejszych kroków z lekcji modułu 4 (4x) kursu 10xDevs. Każdy krok zawiera nazwę, opis, linki do promptów z 10xrules.ai oraz istotne uwagi.

---

## Spis treści

- [[4x1] Zrozumieć legacy code - onboarding](#4x1-zrozumieć-legacy-code---onboarding)
  - [Krok 1: Analiza hot spotów w repozytorium](#krok-1-analiza-hot-spotów-w-repozytorium)
  - [Krok 2: Wstępna analiza projektu z Gemini 2.5 Pro](#krok-2-wstępna-analiza-projektu-z-gemini-25-pro)
  - [Krok 3: Pogłębiona analiza głównych modułów](#krok-3-pogłębiona-analiza-głównych-modułów)
  - [Krok 4: Analiza kluczowych plików](#krok-4-analiza-kluczowych-plików)
  - [Krok 5: Synteza i aktualizacja dokumentu onboardingowego](#krok-5-synteza-i-aktualizacja-dokumentu-onboardingowego)
  - [Krok 6 (Alternatywny): Analiza projektów bez historii Git](#krok-6-alternatywny-analiza-projektów-bez-historii-git)
- [[4x2] Zrozumieć legacy code - analiza kodu](#4x2-zrozumieć-legacy-code---analiza-kodu)
  - [Krok 1: Utworzenie Action Planu dla problemu](#krok-1-utworzenie-action-planu-dla-problemu)
  - [Krok 2: Strategiczna implementacja logowania](#krok-2-strategiczna-implementacja-logowania)
  - [Krok 3: Reprodukcja błędu i zbieranie logów](#krok-3-reprodukcja-błędu-i-zbieranie-logów)
  - [Krok 4: Analiza zebranych logów](#krok-4-analiza-zebranych-logów)
  - [Krok 5: Aktualizacja Action Planu](#krok-5-aktualizacja-action-planu)
  - [Krok 6 (Bonus): Generowanie dokumentacji kodu](#krok-6-bonus-generowanie-dokumentacji-kodu)
- [[4x3] Testy regresji z multimodalnym AI](#4x3-testy-regresji-z-multimodalnym-ai)
  - [Krok 1: Wdrożenie testów regresji w projekcie](#krok-1-wdrożenie-testów-regresji-w-projekcie)
  - [Krok 2: Przygotowanie nagrania sesji użytkownika](#krok-2-przygotowanie-nagrania-sesji-użytkownika)
  - [Krok 3: Konfiguracja Gemini API](#krok-3-konfiguracja-gemini-api)
  - [Krok 4: Użycie 10x-test-planner do analizy video](#krok-4-użycie-10x-test-planner-do-analizy-video)
  - [Krok 5: Implementacja wygenerowanych testów](#krok-5-implementacja-wygenerowanych-testów)
  - [Krok 6: Weryfikacja i uruchomienie testów](#krok-6-weryfikacja-i-uruchomienie-testów)
- [[4x4] Modernizacja kodu aplikacji - AI vs codemods](#4x4-modernizacja-kodu-aplikacji---ai-vs-codemods)
  - [Krok 1: Analiza zakresu modernizacji](#krok-1-analiza-zakresu-modernizacji)
  - [Krok 2: Wykorzystanie migration guides jako kontekstu](#krok-2-wykorzystanie-migration-guides-jako-kontekstu)
  - [Krok 3: Wybór strategii modernizacji](#krok-3-wybór-strategii-modernizacji)
  - [Krok 4: Stopniowa migracja (podejście fazowe)](#krok-4-stopniowa-migracja-podejście-fazowe)
  - [Krok 5 (Przykład): Konwersja JavaScript → TypeScript](#krok-5-przykład-konwersja-javascript--typescript)
  - [Krok 6: Monitorowanie i weryfikacja](#krok-6-monitorowanie-i-weryfikacja)
- [[4x5] Modernizacja architektury z Domain-Driven Design](#4x5-modernizacja-architektury-z-domain-driven-design)
  - [Krok 1: Rozpoznanie domeny biznesowej (Dialog z ekspertem AI)](#krok-1-rozpoznanie-domeny-biznesowej-dialog-z-ekspertem-ai)
  - [Krok 2 (Alternatywa): Deep Research AI](#krok-2-alternatywa-deep-research-ai)
  - [Krok 3: Event Storming Workshop z AI (Facylitacja)](#krok-3-event-storming-workshop-z-ai-facylitacja)
  - [Krok 4: Analiza strategiczna (Subdomeny i Bounded Contexts)](#krok-4-analiza-strategiczna-subdomeny-i-bounded-contexts)
  - [Krok 5: Wdrożenie wzorców taktycznych DDD](#krok-5-wdrożenie-wzorców-taktycznych-ddd)
  - [Krok 6: Iteracyjne udoskonalanie modelu](#krok-6-iteracyjne-udoskonalanie-modelu)

[Sekcje końcowe]
- [Podsumowanie i kluczowe zasady](#podsumowanie-i-kluczowe-zasady)
- [Ostrzeżenia i pułapki](#ostrzeżenia-i-pułapki)
- [Zasoby i narzędzia](#zasoby-i-narzędzia)

---

### [4x1] Zrozumieć legacy code - onboarding

#### Krok 1: Analiza hot spotów w repozytorium
- **Opis**: Wykorzystaj skrypty Git do identyfikacji najczęściej modyfikowanych plików i modułów w ciągu ostatniego roku
- **Skrypty Unix/Linux**:
  ```bash
  # Najczęściej modyfikowane pliki
  git log --since="1 year ago" --pretty=format:"" --name-only --no-merges | \
    grep -vE "${EXCLUDE_PATTERN_GREP:-^$}" | \
    grep '.' | sort | uniq -c | sort -nr | head -n 10

  # Najczęściej modyfikowane moduły (katalogi)
  git log --since="1 year ago" --pretty=format:"" --name-only --no-merges | \
    grep -vE "${EXCLUDE_PATTERN_GREP:-^$}" | \
    awk -F/ -v OFS=/ 'NF > 1 {$NF = ""; print $0}' | \
    sort | uniq -c | sort -nr | head -n 10

  # Najaktywniejsi kontrybutorzy
  git log --since="1 year ago" --pretty=format:"%an <%ae>" --no-merges | \
    sort | uniq -c | sort -nr | head -n 5
  ```
- **Uwagi**: Dostosuj `EXCLUDE_PATTERN_GREP` aby wykluczyć pliki konfiguracyjne, testy, itp.

#### Krok 2: Wstępna analiza projektu z Gemini 2.5 Pro
- **Opis**: Wygeneruj podstawowy dokument onboardingowy na podstawie wyników analizy Git
- **Prompt**: [Wstępna analiza projektu](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l1-onboarding&prompt=7abc8860-a01b-414d-9d56-25facb0030cc)
- **Lokalizacja**: `.ai/onboarding.md`
- **Model**: Gemini 2.5 Pro (duże okno kontekstowe - 1M tokenów)
- **Uwagi**: Przekaż modelowi wyniki z analiz: top plików, top modułów, top kontrybutorów

#### Krok 3: Pogłębiona analiza głównych modułów
- **Opis**: Przeanalizuj szczegółowo moduły zidentyfikowane jako kluczowe
- **Prompt**: [Dogłębna analiza głównych modułów](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l1-onboarding&prompt=284e77e5-2cb3-4995-b5c6-0f6b4ae01603)
- **Uwagi**: Kontynuuj w tej samej konwersacji z Gemini co Krok 2

#### Krok 4: Analiza kluczowych plików
- **Opis**: Szczegółowa analiza 10 najważniejszych plików (hot spotów) w projekcie
- **Prompt**: [Analiza kluczowych plików](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l1-onboarding&prompt=8a063d3a-f71a-41f5-8b8d-bf42717bdd17)
- **Uwagi**: Kontynuuj w tej samej konwersacji

#### Krok 5: Synteza i aktualizacja dokumentu onboardingowego
- **Opis**: Zaktualizuj onboarding.md o wszystkie zebrane informacje
- **Prompt**: [Synteza dokumentacji onboardingowej](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l1-onboarding&prompt=3b5f1ca8-82a4-4753-8c96-d72261eed8c8)
- **Uwagi**: Finalna wersja dokumentu powinna zawierać: strukturę projektu, kluczowe moduły, pliki, kontrybutorów, obszary złożoności, pytania dla zespołu

#### Krok 6 (Alternatywny): Analiza projektów bez historii Git
- **Opis**: Dla projektów z minimalną historią Git, użyj bezpośredniej eksploracji struktury
- **Prompt**: [Analiza projektu bez historii git](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l1-onboarding&prompt=1aa0d2e3-e45f-4810-ac35-28841df40952)
- **Uwagi**: Wykorzystuje narzędzia list_dir, file_search, file_read zamiast historii commitów

---

### [4x2] Zrozumieć legacy code - analiza kodu

#### Krok 1: Utworzenie Action Planu dla problemu
- **Opis**: Wygeneruj kompleksowy plan działania dla konkretnego issue/błędu
- **Prompt**: [Plan działania do rozwiązywania problemu](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l2-analysis&prompt=72924dd9-a9f3-4444-b6ff-b0908cd53ed7)
- **Lokalizacja**: `.ai/{issue-name}-action-plan.md`
- **Elementy planu**:
  - Identyfikacja istotnych części kodu
  - Analiza historii commitów Git
  - Hipotezy dotyczące przyczyny problemu
  - Potencjalne osoby do kontaktu
  - Pytania do dalszej analizy
  - Konkretne następne kroki
- **Uwagi**: Dołącz onboarding.md i pełny opis problemu/issue

#### Krok 2: Strategiczna implementacja logowania
- **Opis**: Dodaj logi debugowania w kluczowych miejscach kodu (nowa konwersacja)
- **Prompt**: [Strategiczna implementacja logowania](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l2-analysis&prompt=a73fd19b-fcf8-4bd6-95ff-0c5baf54e493)
- **Uwagi**:
  - Rozpocznij nową konwersację
  - AI zasugeruje miejsca do umieszczenia console.log/logów
  - Skup się na kluczowych plikach wskazanych w action planie

#### Krok 3: Reprodukcja błędu i zbieranie logów
- **Opis**: Uruchom aplikację, odtwórz problem i zbierz dane z logów
- **Uwagi**: Zapisz zebrane logi do pliku - będą potrzebne w następnym kroku

#### Krok 4: Analiza zebranych logów
- **Opis**: Przeanalizuj logi z pomocą AI aby zidentyfikować wzorce i anomalie
- **Prompt**: [Analiza logów z reprodukucji błędów](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l2-analysis&prompt=4a3e5005-98b2-43eb-bf96-32dfaef3c92e)
- **Uwagi**:
  - Kontynuuj w tej samej konwersacji co Krok 2
  - Gemini 2.5 Pro może przeanalizować tysiące linii logów
  - Model wykryje wzorce i anomalie

#### Krok 5: Aktualizacja Action Planu
- **Opis**: Zaktualizuj action plan o nową wiedzę z analizy logów
- **Prompt**: [Aktualizacja planu działania po sesji analizy](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l2-analysis&prompt=00151de2-6444-47ff-9ccf-7468e7500104)
- **Uwagi**:
  - Kontynuuj w tej samej konwersacji
  - Zaktualizowana hipoteza będzie znacznie bardziej precyzyjna

#### Krok 6 (Bonus): Generowanie dokumentacji kodu
- **Opis**: Dodaj profesjonalną dokumentację (JSDoc, JavaDoc, Docstrings) do modułów
- **Prompt**: [Dodawanie profesjonalnej dokumentacji do modułu](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=l2-analysis&prompt=cd866cf0-e9fa-48ee-b5d5-7eaf75b8ac20)
- **Uwagi**:
  - Można użyć mniejszych/tańszych modeli (Claude 4.5 Haiku, Grok Code Fast)
  - Ułatwi przyszłą analizę i onboarding

---

### [4x3] Testy regresji z multimodalnym AI

#### Krok 1: Wdrożenie testów regresji w projekcie
- **Opis**: Zabezpiecz kluczowe scenariusze biznesowe testami E2E przed rozpoczęciem refaktoryzacji
- **Uwagi**: Testy regresji są NIEZBĘDNE przed modernizacją - chronią przed pogorszeniem funkcjonalności

#### Krok 2: Przygotowanie nagrania sesji użytkownika
- **Opis**: Nagraj wideo prezentujące kluczowe scenariusze biznesowe aplikacji
- **Format**: MP4, MOV, MPEG
- **Długość**: Od kilku sekund (jeden scenariusz) do kilku minut (przejście przez kluczowe fragmenty)
- **Wskazówki**:
  - Użyj dużych kursorów
  - Włącz "Pokazuj kliknięcia myszą"
  - Oznaczaj miejsca, w które klikasz
  - "Zoomuj" na kluczowe elementy interfejsu
- **Optymalizacja**: Zmniejsz FPS aby zredukować koszt (np. do 24 fps):
  ```bash
  ffmpeg -i input.mov -r 24 -c:v libx264 -crf 23 output.mov
  ```

#### Krok 3: Konfiguracja Gemini API
- **Opis**: Wygeneruj klucz API do Google AI Studio
- **URL**: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Uwagi**:
  - Darmowy tier pozwala na eksperymenty (ale dzieli się danymi)
  - Dla projektów komercyjnych doładuj klucz API
  - Koszt: ~40k tokenów za 60 sek. filmu w 24fps

#### Krok 4: Użycie 10x-test-planner do analizy video
- **Opis**: Wykorzystaj narzędzie CLI do analizy nagrania i generowania test planu
- **Narzędzie**: [@10xdevspl/test-planner](https://github.com/przeprogramowani/10x-test-planner)
- **Instalacja**:
  ```bash
  npm install -g @10xdevspl/test-planner
  ```
- **Użycie podstawowe**:
  ```bash
  npx @10xdevspl/test-planner --video=user-session.mov --outDir=./e2e
  ```
- **Z optymalizacją**:
  ```bash
  npx @10xdevspl/test-planner --video=user-session.mov --outDir=./e2e --optimize --fps=15
  ```
- **Zmienna środowiskowa**: `GEMINI_API_KEY=###`

#### Krok 5: Implementacja wygenerowanych testów
- **Opis**: Użyj Agenta AI do wdrożenia testów na podstawie test planu
- **Uwagi**:
  - Test planner generuje: test plan i instrukcje dla AI
  - Agent może zaimplementować testy używając wzorców POM (Page Object Model)
  - Weryfikuj i dostosuj wygenerowane testy

#### Krok 6: Weryfikacja i uruchomienie testów
- **Opis**: Upewnij się, że testy przechodzą przed rozpoczęciem refaktoryzacji
- **Uwagi**: To jest Twoja siatka bezpieczeństwa podczas modernizacji

---

### [4x4] Modernizacja kodu aplikacji - AI vs codemods

#### Krok 1: Analiza zakresu modernizacji
- **Opis**: Określ co dokładnie chcesz zmodernizować (język, framework, biblioteki)
- **Pytania do rozważenia**:
  - Jaki jest zakres modernizacji? (ES5→ES6, JavaScript→TypeScript, stara wersja frameworka→nowa)
  - Ile plików/modułów wymaga zmiany?
  - Czy istnieją migration guides od dostawcy technologii?
  - Czy istnieją gotowe codemody dla tej migracji?

#### Krok 2: Wykorzystanie migration guides jako kontekstu
- **Opis**: Dodaj oficjalne poradniki migracji jako kontekst dla AI
- **Przykłady**:
  - [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
  - [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- **Metody**:
  - Dodaj do "Custom Docs" w Cursorze (symbol `@Docs`)
  - Pobierz markdown i dodaj tymczasowo do projektu
  - Załącz bezpośrednio do promptu

#### Krok 3: Wybór strategii modernizacji
- **Opcja A - Tylko AI**: Dla małych projektów lub prostych transformacji
- **Opcja B - Tylko Codemods**: Dla dobrze zdefiniowanych, przewidywalnych transformacji w dużej skali
- **Opcja C - Hybrydowo** (REKOMENDOWANE):
  1. Użyj codemodów dla 80% przewidywalnych przypadków
  2. Użyj AI dla pozostałych 20% przypadków brzegowych
  3. AI może też generować kontekst dla codemodów (np. DOM renderowany komponentu)
- **Uwagi**:
  - **Codemods**: Precyzja, skalowalność, powtarzalność, kontrola (ale brak kontekstu semantycznego)
  - **AI Mods**: Nauka na przykładach, adaptacja, wykorzystanie wiedzy z treningu (ale halucynacje, brak determinizmu)
  - **Hybrydowe podejście**: Case study Slacka - 80% skuteczności przy migracji Enzyme → React Testing Library

#### Krok 4: Stopniowa migracja (podejście fazowe)
- **Faza 1**: Transformacje strukturalne (codemod lub AI)
  - Przykład: `var` → `let/const`, dodanie typów TypeScript
- **Faza 2**: Kontekstualne dostosowania (AI)
  - Przykład: Poprawa inferowanych typów, dostosowanie do nowych API
- **Faza 3**: Weryfikacja i testy
  - Uruchom testy regresji
  - Sprawdź logi budowania
  - Przetestuj kluczowe ścieżki użytkownika

#### Krok 5 (Przykład): Konwersja JavaScript → TypeScript
- **Narzędzie**: [ts-migrate](https://github.com/airbnb/ts-migrate) (AirBnb)
- **Kroki**:
  1. Skonfiguruj ts-migrate z pomocą AI
  2. Uruchom automatyczną konwersję
  3. Zidentyfikuj problematyczne pliki (gdzie ts-migrate nie poradził sobie)
  4. Użyj AI do ręcznej poprawy tych plików
  5. Weryfikuj i testuj

#### Krok 6: Monitorowanie i weryfikacja
- **Opis**: Upewnij się, że modernizacja nie zepsuje funkcjonalności
- **Metody weryfikacji**:
  - Uruchom wszystkie testy (unit, integration, E2E)
  - Sprawdź logi budowania (brak błędów)
  - Przeprowadź code review zmian
  - Testuj ręcznie kluczowe scenariusze
- **Uwagi**: To moment, gdzie testy regresji z [4x3] są KLUCZOWE

---

### [4x5] Modernizacja architektury z Domain-Driven Design

#### Krok 1: Rozpoznanie domeny biznesowej (Dialog z ekspertem AI)
- **Opis**: Przeprowadź dialog z AI wcielającym się w eksperta domenowego
- **Prompt**: [Rozpoznanie domeny biznesowej](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=domain-driven-design&prompt=e312deb5-460d-4365-9252-f771ffa8d1f9)
- **Model**: GPT-5, Claude 4.5 Sonnet lub Gemini 2.5 Pro
- **Elementy dialogu**:
  - Kluczowe procesy biznesowe
  - Bolączki użytkowników i stakeholderów
  - Terminologia domenowa (Ubiquitous Language)
  - Reguły biznesowe i ograniczenia
- **Uwagi**: AI może halucynować - weryfikuj informacje z prawdziwymi ekspertami domenowymi

#### Krok 2 (Alternatywa): Deep Research AI
- **Opis**: Wykorzystaj funkcje "Deep Research" w Gemini, ChatGPT lub Claude do zbierania informacji o domenie
- **Narzędzia**:
  - Gemini Deep Research
  - ChatGPT Research (GPT-5)
  - Claude.ai Projects
- **Uwagi**: Świetne dla nauki o nowej domenie, ale może zawierać nieaktualne informacje

#### Krok 3: Event Storming Workshop z AI (Facylitacja)
- **Opis**: Przeprowadź warsztat Event Storming z AI jako moderatorem
- **Prompt lokalny**: [Event Storming z whiteboard.md](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=domain-driven-design&prompt=454f0ce7-a205-4f7c-9023-ac84cdb67225)
- **Prompt przeglądarkowy**: Użyj artefaktów Claude.ai zamiast whiteboard.md
- **Fazy warsztatu**:
  1. Odkrywanie zdarzeń domenowych (Domain Events)
  2. Dodawanie komend (Commands)
  3. Identyfikacja aktorów (Actors)
  4. Agregowanie w konteksty
  5. Definiowanie polityk i reguł biznesowych
- **Format wyjściowy**: Diagram Mermaid w whiteboard.md lub artefakt
- **Uwagi**:
  - To narzędzie do wydobywania wiedzy z TwojEJ głowy
  - AI jest moderatorem, TY jesteś ekspertem
  - Sesja może trwać 15-30 minut

#### Krok 4: Analiza strategiczna (Subdomeny i Bounded Contexts)
- **Opis**: Zidentyfikuj subdomeny i zdefiniuj Bounded Contexts
- **Prompt**: [Analiza strategiczna DDD](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=domain-driven-design&prompt=7dc96777-4ca1-4aee-a1df-1ad2cfcea0da)
- **Wejście**: Dokumenty z kroków 1-3 (dialog z ekspertem, event storming)
- **Wyjście**:
  - Klasyfikacja subdomen (Core/Supporting/Generic)
  - Zdefiniowane Bounded Contexts
  - Propozycja Ubiquitous Language dla każdego kontekstu
  - Context Map (wzorce integracji)
- **Kluczowe koncepcje DDD (Poziom Strategiczny)**:
  - **Subdomeny**: Core Domain (przewaga konkurencyjna), Supporting Subdomain (wsparcie), Generic Subdomain (standardowe rozwiązania)
  - **Bounded Context**: Granica językowa i implementacyjna gdzie Ubiquitous Language ma spójne znaczenie
  - **Context Mapping**: Wzorce integracji między kontekstami
- **Uwagi**:
  - AI może błędnie klasyfikować Core Domain jako Generic - weryfikuj!
  - Twoja przewaga konkurencyjna = Core Domain

#### Krok 5: Wdrożenie wzorców taktycznych DDD
- **Opis**: Zaimplementuj wzorce taktyczne w wybranym Bounded Context
- **Prompt**: [Implementacja wzorców taktycznych DDD](https://10xrules.ai/prompts?org=10xdevs&collection=m4-legacy&segment=domain-driven-design&prompt=8344c81b-b447-4795-8ee0-1798decdd280)
- **Wzorce do wdrożenia**:
  - **Agregaty** (Aggregates): Granice spójności transakcyjnej
  - **Aggregate Root**: Główna encja agregatu
  - **Obiekty Wartości** (Value Objects): Niezmienne koncepty bez tożsamości
  - **Encje** (Entities): Obiekty z unikalną tożsamością
  - **Repozytoria** (Repositories): Abstrakcja persystencji agregatów
  - **Domain Events**: Zdarzenia sygnalizujące zmiany stanu
- **Uwagi**:
  - Rozpocznij od najprostszego Bounded Context
  - AI może generować zbyt "akademicki" kod - dostosuj do praktyki
  - Zachowaj równowagę między dogmatyzmem DDD a pragmatyzmem

#### Krok 6: Iteracyjne udoskonalanie modelu
- **Opis**: Weryfikuj i udoskonalaj model domenowy na podstawie feedbacku
- **Metoda**:
  - Testuj implementację z prawdziwymi wymaganiami biznesowymi
  - Zbieraj feedback od ekspertów domenowych
  - Aktualizuj Ubiquitous Language
  - Refaktoryzuj kod zgodnie z nową wiedzą
- **Uwagi**: DDD to proces ciągłego uczenia się i udoskonalania modelu

---

## Podsumowanie i kluczowe zasady

### Główne tematy modułu 4:
1. **Onboarding do projektów legacy/brownfield** - wykorzystanie analizy Git i AI
2. **Debugowanie i analiza kodu** - action plany, instrumentacja, analiza logów
3. **Testy regresji** - multimodalne AI do generowania testów z video
4. **Modernizacja kodu** - hybrydowe podejście (codemods + AI)
5. **Modernizacja architektury** - Domain-Driven Design z pomocą AI

### Kluczowe zasady:
- ✅ **ZAWSZE** najpierw testy regresji, potem refaktoryzacja
- ✅ **Weryfikuj** sugestie AI, szczególnie w domenach biznesowych
- ✅ **Łącz** tradycyjne narzędzia (codemods, AST) z AI
- ✅ **Podejście fazowe** - małe kroki z weryfikacją
- ✅ **Dokumentuj** proces i decyzje architektoniczne

### Rekomendowane modele:
- **Gemini 2.5 Pro**: Analiza dużych projektów (1M okno kontekstowe)
- **Gemini 2.5 Flash**: Analiza video (multimodalne, tanie)
- **GPT-5 / Claude 4.5 Sonnet**: Reasoningowe podejście do DDD i debugowania
- **Claude 4.5 Haiku / Grok Code Fast**: Generowanie dokumentacji (tanio)

---

## Ostrzeżenia i pułapki

### ⚠️ Halucynacje jako fałszywe reguły biznesowe
- AI może wymyślać nieistniejące procesy biznesowe
- Zawsze weryfikuj z prawdziwymi ekspertami domenowymi

### ⚠️ Pułapka uśredniania (Twój Core Domain jako Generic)
- AI trenowane na generycznych danych może nie rozpoznać Twojej unikalności
- Krytycznie oceniaj klasyfikację subdomen

### ⚠️ Brak wychwytywania niuansów podczas Event Storming
- AI nie "rozumie" - naśladuje wzorce facylitatora
- Może zapisywać sprzeczne informacje bez kwestionowania
- Ty musisz zapewniać spójność logiczną

### ⚠️ Ograniczenia kontekstu przy długich sesjach
- AI może "zapomnieć" o wcześniejszych ustaleniach
- Regularnie rób podsumowania i checkpointy

### ⚠️ Zbyt czyste wzorce taktyczne
- AI generuje "książkowe" implementacje, które mogą być niepraktyczne
- Dostosuj do realiów Twojego projektu i wymagań wydajnościowych

---

## Zasoby i narzędzia

### Narzędzia
- **10xRules.ai Prompt Library**: https://10xrules.ai/
- **10x-test-planner**: https://github.com/przeprogramowani/10x-test-planner
- **ts-migrate (AirBnb)**: https://github.com/airbnb/ts-migrate

### Dokumentacja
- **Google AI Studio**: https://aistudio.google.com/
- **OpenRewrite**: https://docs.openrewrite.org/
- **jscodeshift**: https://github.com/facebook/jscodeshift

### Materiały wideo (YouTube)
- Event-Driven Architecture - projektowanie systemów opartych o zdarzenia
- Domain-Driven Design (Blue Book) - klasyczna książka Eric Evans
- Mikroserwisy - budowa systemów złożonych z małych usług
- Reactive Systems - tworzenie responsywnych systemów

---

**Powodzenia w modernizacji Twojego legacy code! 🚀**