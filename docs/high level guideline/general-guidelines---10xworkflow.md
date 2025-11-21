---
title: "General Guidelines - 10xWorkflow"
module: "m1-workflow"
description: "Kompendium najlepszych praktyk pracy z AI dla programistów"
source: "Przeprogramowani.pl - 10xDevs"
exported: "2025-11-21"
---

# General Guidelines - AI-Assisted Development

## 1. Wprowadzenie

### 1.1 Cel dokumentu

Ten dokument to kompendium najlepszych praktyk pracy z AI dla programistów, oparte na materiałach z kursu **10xDevs II edycja** (moduł 1: 10xWorkflow). Zawiera sprawdzone techniki, strategie i narzędzia, które pozwolą Ci efektywnie wykorzystać sztuczną inteligencję w codziennej pracy deweloperskiej.

### 1.2 Jak z niego korzystać

- **Przeczytaj sekcje 2-5** przed rozpoczęciem pracy z AI (wybór modelu, koszty, promptowanie, kontekst)
- **Wykorzystuj sekcję 8 (Best Practices)** jako szybką ściągawkę
- **Wróć do sekcji 6-7** gdy napotykasz problemy (zarządzanie kontekstem, ratowanie konwersacji)
- **Użyj checklisty 8.3** przed startem nowego projektu
- **Eksploruj sekcję 9** po zasoby i narzędzia

## Spis treści

1. [Wprowadzenie](#1-wprowadzenie)
   - 1.1 [Cel dokumentu](#11-cel-dokumentu)
   - 1.2 [Jak z niego korzystać](#12-jak-z-niego-korzystać)
2. [Wybór modelu AI i ocena modeli](#2-wybór-modelu-ai)
   - 2.1 [Podział na role: Koderzy vs Architekci](#21-podział-na-role-koderzy-vs-architekci)
   - 2.2 [Rekomendowane modele (październik 2025)](#22-rekomendowane-modele-październik-2025)
   - 2.3 [Wybór modelu w praktyce](#23-wybór-modelu-w-praktyce)
   - 2.4 [Obserwowanie trendów (nie benchmarków!)](#24-obserwowanie-trendów-nie-benchmarków)
   - 2.5 [Benchmarki syntetyczne - użyteczność i ograniczenia](#25-benchmarki-syntetyczne---użyteczność-i-ograniczenia)
   - 2.6 [Praktyczne testowanie](#26-praktyczne-testowanie)
3. [Zarządzanie kosztami](#3-zarządzanie-kosztami)
   - 3.1 [Modele rozliczeń](#31-modele-rozliczeń)
   - 3.2 [Tokeny jako podstawa rozliczeń](#32-tokeny-jako-podstawa-rozliczeń)
   - 3.3 [Optymalizacja kosztów](#33-optymalizacja-kosztów)
4. [Anatomia skutecznego prompta](#4-anatomia-skutecznego-prompta)
   - 4.1 [Pięć elementów prompta (hierarchia ważności)](#41-pięć-elementów-prompta-hierarchia-ważności)
   - 4.2 [Najlepsze praktyki](#42-najlepsze-praktyki)
   - 4.3 [Najczęstsze błędy](#43-najczęstsze-błędy)
5. [Zaawansowane techniki promptowania](#5-zaawansowane-techniki-promptowania)
   - 5.1 [Meta-Prompting](#51-meta-prompting)
   - 5.2 [Metoda Sokratejska](#52-metoda-sokratejska)
   - 5.3 [Brainstorming i eksploracja rozwiązań](#53-brainstorming-i-eksploracja-rozwiązań)
   - 5.4 [Planowanie zadań](#54-planowanie-zadań)
   - 5.5 [Promptowanie bez efektu potwierdzenia (sycophancy)](#55-promptowanie-bez-efektu-potwierdzenia-sycophancy)
   - 5.6 [Pozyskiwanie nowej wiedzy](#56-pozyskiwanie-nowej-wiedzy)
6. [Zarządzanie kontekstem](#6-zarządzanie-kontekstem)
   - 6.1 [Znaczenie kontekstu](#61-znaczenie-kontekstu)
   - 6.2 [Pliki pamięci](#62-pliki-pamięci)
   - 6.3 [Monitoring zużycia kontekstu](#63-monitoring-zużycia-kontekstu)
   - 6.4 [Optymalizacja kontekstu](#64-optymalizacja-kontekstu)
   - 6.5 [Reset kontekstu](#65-reset-kontekstu)
   - 6.6 [Context rot i context drift](#66-context-rot-i-context-drift)
7. [Ratowanie problematycznych konwersacji](#7-ratowanie-problematycznych-konwersacji)
   - 7.1 [Rozpoznawanie sygnałów ostrzegawczych](#71-rozpoznawanie-sygnałów-ostrzegawczych)
   - 7.2 [Strategia resetu z podsumowaniem](#72-strategia-resetu-z-podsumowaniem)
   - 7.3 [Zasada "trzech prób"](#73-zasada-trzech-prób)
   - 7.4 [Najlepsze praktyki](#74-najlepsze-praktyki)
8. [Best Practices - Podsumowanie](#8-best-practices---podsumowanie)
   - 8.1 [DO's](#81-dos)
   - 8.2 [DON'Ts](#82-donts)
   - 8.3 [Checklist przed rozpoczęciem projektu](#83-checklist-przed-rozpoczęciem-projektu)
9. [Zasoby i narzędzia](#9-zasoby-i-narzędzia)
   - 9.1 [Prompt Library](#91-prompt-library)
   - 9.2 [MVP Tracker](#92-mvp-tracker)
   - 9.3 [Przydatne linki](#93-przydatne-linki)

---

## 2. Wybór modelu AI

### 2.1 Podział na role: Koderzy vs Architekci

W praktycznej pracy z AI warto rozróżnić dwa typy modeli według ich zastosowania:

#### Asystent (Koder)
**Cel:** Szybkie wykonywanie codziennych zadań programistycznych
- Generowanie kodu na podstawie specyfikacji
- Pisanie testów jednostkowych
- Refaktoryzacja istniejącego kodu
- Dokumentacja kodu
- Debugging prostych problemów

**Zalety:**
- Niższe koszty operacyjne
- Szybsza odpowiedź
- Wystarczająca jakość dla rutynowych zadań

#### Model rozumujący (Architekt)
**Cel:** Rozwiązywanie złożonych problemów wymagających analizy i planowania
- Analiza wymagań biznesowych
- Projektowanie architektury systemu
- Planowanie implementacji złożonych features
- Debugowanie skomplikowanych problemów
- Code review i optymalizacja

**Zalety:**
- Głębsze rozumienie kontekstu
- Lepsza jakość rozumowania
- Skuteczniejsze w nietypowych scenariuszach

### 2.2 Rekomendowane modele (październik 2025)

#### Sesje planistyczne (Architekci)

| Kategoria | Modele | Zastosowanie |
|-----------|--------|--------------|
| **State-of-the-Art** | Gemini 2.5 Pro<br>GPT-5-High/Medium<br>Claude 4.5 Extended Thinking | Krytyczne decyzje architektoniczne<br>Złożone analizy biznesowe<br>Planning dużych features |
| **Budżetowe** | Grok 4 Fast Reasoning | Codzienne sesje planistyczne<br>Brainstorming<br>Mniejsze projekty |

#### Kodowanie wysokiej złożoności (Koderzy)

| Kategoria | Modele | Zastosowanie |
|-----------|--------|--------------|
| **State-of-the-Art** | Claude Sonnet 4.5 Thinking<br>GPT-5-Codex<br>Gemini 2.5 Pro | Nowe, złożone features<br>Integracje z zewnętrznymi API<br>Algorytmy i optymalizacja |
| **Budżetowe** | GPT-5 Low<br>Grok Code Fast 1 | Standardowe features<br>CRUD operations<br>Typowe wzorce |

#### Kodowanie niskiej złożoności (Koderzy)

| Kategoria | Modele | Zastosowanie |
|-----------|--------|--------------|
| **State-of-the-Art** | Claude Sonnet 4.5 Thinking<br>GPT-5-Codex<br>Gemini 2.5 Pro | Gdy jakość ma znaczenie<br>Kod produkcyjny<br>Wysokie wymagania jakościowe |
| **Budżetowe** | Grok Code Fast 1 | Prototypy<br>Skrypty narzędziowe<br>Eksperymenty |

### 2.3 Wybór modelu w praktyce

#### Matrix decyzji

```
                    Budżet nieograniczony          Budżet ograniczony
                    ─────────────────────          ──────────────────
Złożoność wysoka │  SOTA Architekt               │  Budżet Architekt
                 │  + SOTA Koder                 │  + Budżet Koder
                 │                                │
Złożoność niska  │  SOTA Koder                   │  Budżet Koder
                 │                                │
```

#### Przykłady zastosowań

**Scenariusz 1: Nowy feature w aplikacji e-commerce - system rekomendacji**
- **Planowanie:** Gemini 2.5 Pro (analiza wymagań, projektowanie architektury)
- **Implementacja:** Claude Sonnet 4.5 Thinking (złożona logika, integracje)
- **Testy:** Grok Code Fast 1 (generowanie test cases)

**Scenariusz 2: Refaktoryzacja legacy code**
- **Analiza:** GPT-5-Medium (zrozumienie istniejącego kodu)
- **Refaktoryzacja:** Claude Sonnet 4.5 Thinking (bezpieczne zmiany)
- **Dokumentacja:** Grok Code Fast 1 (generowanie komentarzy)

**Scenariusz 3: Szybki prototyp MVP**
- **Planowanie:** Grok 4 Fast Reasoning (szybkie decyzje)
- **Implementacja:** Grok Code Fast 1 (ekonomiczne kodowanie)

### 2.4 Obserwowanie trendów (nie benchmarków!)

#### OpenRouter - aktywność społeczności

**URL:** [OpenRouter Programming Rankings](https://openrouter.ai/rankings/programming?view=month)

**Co pokazuje:**
- Ranking popularności modeli wśród realnych użytkowników
- Miesięczna/tygodniowa aktywność (liczba zapytań)
- Realny monitoring przepływu zapytań w production

**Dlaczego to ważne:**
```
Społeczność używa → Model jest praktycznie użyteczny
Nikt nie używa → Prawdopodobnie problem z jakością/ceną/dostępnością
```

**Przykład odkrycia:**
grok-code-fast-1 regularnie przebija Claude Sonnet w popularności:
- 5-7x tańszy
- Podobna jakość dla typowych zadań
- Szybsze odpowiedzi

#### LM Arena - porównania anonimowe

**URL:** [LM Arena](https://lmarena.ai/)

**Jak działa:**
1. Dwa interfejsy, ukryte nazwy modeli (Model A vs Model B)
2. To samo zadanie dla obu
3. Użytkownik głosuje, który lepszy
4. Dopiero potem widzi nazwy

**Dlaczego to ważne:**
- Eliminuje bias (nie wiesz, który to GPT, a który Claude)
- Realny "vibe check" zamiast syntetycznych testów
- Community-driven rankings

**Ranking WebDev:**
[LM Arena WebDev Leaderboard](https://lmarena.ai/leaderboard/webdev)
- Specjalizowany ranking dla web development tasks
- Najbardziej relevant dla programistów

### 2.5 Benchmarki syntetyczne - użyteczność i ograniczenia

#### Popularne testy

| Benchmark | URL | Co testuje |
|-----------|-----|------------|
| **LiveBench** | https://livebench.ai/ | Generalne zdolności reasoning + coding |
| **SWE Bench** | https://www.swebench.com/ | Rozwiązywanie realnych GitHub issues |
| **GPQA Diamond** | https://arxiv.org/abs/2311.12022 | Pytania z nauki (PhD-level) |

#### Ograniczenia benchmarków

**1. Nadmierna optymalizacja ("teaching to the test")**
```
Model jest trenowany na podobnych zadaniach do benchmarku
→ Wysoki wynik w teście
→ Słabszy w realnych, nietypowych scenariuszach
```

**2. Brak różnorodności kontekstów**
```
Benchmark: algorytmy + struktury danych
Realny projekt: legacy code + weird API + business logic
```

**3. Zakażenie danych (data contamination)**
```
Model "widział" zadania z benchmarku podczas treningu
→ Zapamiętał odpowiedzi, nie nauczył się rozumowania
```

**4. Pominięcie aspektów praktycznych**
```
Benchmark mierzy: poprawność kodu
Nie mierzy: użyteczność, czytelność, maintainability, szybkość odpowiedzi
```

**5. Ograniczone definicje "jakości"**
```
Test sprawdza: "czy kod działa?"
Nie sprawdza: "czy kod jest dobry? czy jest bezpieczny? czy jest skalowalny?"
```

#### Przykład: SWE-Lancer

**Koncept:** AI agent próbuje zarabiać na Upwork rozwiązując zadania programistyczne

**Wyniki:**
- 40% zadań z Upwork = $400k z $1M możliwych

**Ale:**
- Wyniki zależne od **narzędzi** (nie tylko model)
- Wielokrotne próby: 7 iteracji dla 20% skuteczności (GPT-4o)
- Modele reasoning podnoszą jakość, ale ↑↑↑ koszty
- W realnym świecie: klient po 7 iteracjach odrzuci Cię

**Wniosek:** "Vibe check" > syntetyczne testy

### 2.6 Praktyczne testowanie

#### Testuj na swoim stacku

```
❌ "GPT-5 ma 95% w SWE Bench → jest najlepszy"
✅ "Testuję GPT-5 vs Grok vs Claude na moim projekcie (Next.js + Prisma)
    przez tydzień → wybieram najlepszy dla MOJEGO kontekstu"
```

#### Zmienne w realnym użyciu

**Jakość narzędzi w IDE/CLI:**
```
Model X w API: doskonały
Model X w Cursor: problemy z długim kontekstem (bug w integracji)
```

**Specyfika projektu:**
```
Model A: świetny w React
Model B: lepszy w backend (Node.js + Postgres)
```

**Twój workflow:**
```
Model A: doskonały dla Plan → Act workflow
Model B: lepszy dla szybkich iteracji bez planowania
```

#### Rekomendacja

**Tydzień testowy:**
1. Wybierz 2-3 modele z różnych kategorii (SOTA, mid-tier, budget)
2. Codzienne zadania na przemian (feature, refactor, debug, tests)
3. Trackuj: jakość, szybkość, koszty, frustration level
4. Decyzja na podstawie **praktyki**, nie benchmarków

---

## 3. Zarządzanie kosztami

### 3.1 Modele rozliczeń

#### Flat Rate
**Charakterystyka:**
- Stała miesięczna subskrypcja (np. 20-50 USD/miesiąc)
- Określona liczba zapytań lub czasu użycia
- Przewidywalny koszt niezależnie od intensywności użycia

**Przykłady:**
- Windsurf
- GitHub Copilot
- Claude Code

**Kiedy wybrać:**
- Intensywne codzienne użycie
- Chcesz przewidywalnego kosztu
- Eksperymentowanie bez obaw o koszty
- Polski język komunikacji bez konsekwencji kosztowych

#### Usage-based
**Charakterystyka:**
- Miesięczne doładowanie (np. 10-100 USD)
- Płatność za faktyczne zużycie tokenów
- Różne ceny dla różnych modeli

**Przykłady:**
- Cursor
- Zed
- Bezpośrednie API (OpenAI, Anthropic)

**Kiedy wybrać:**
- Nieregularne użycie
- Chcesz kontrolować koszty przez wybór modeli
- Duża różnorodność zadań (proste/złożone)
- Potrzebujesz dostępu do najnowszych modeli

#### Trend rynkowy
**Obserwacja:** Rynek przechodzi z modelu Flat Rate na Usage-based ze względu na:
- Większą elastyczność dla użytkowników
- Sprawiedliwszy model rozliczeń
- Możliwość oferowania wielu modeli w jednej platformie

**Rekomendacja:** Dla profesjonalnej pracy wybieraj platformy z Usage-based + możliwością strategicznego doboru modeli.

### 3.2 Tokeny jako podstawa rozliczeń

#### Czym są tokeny?

Token to podstawowa jednostka informacji przetwarzana przez model AI. W uproszczeniu:
- 1 token ≈ 4 znaki w języku angielskim
- 1 token ≈ 2-3 znaki w języku polskim
- 1 token ≈ 0.75 słowa w języku angielskim

#### Tokens In vs Tokens Out

**Tokens In (Input):**
- Twój prompt
- Kontekst (pliki, historia konwersacji)
- Instrukcje systemowe
- Zazwyczaj tańsze

**Tokens Out (Output):**
- Odpowiedź modelu
- Wygenerowany kod
- Wyjaśnienia
- Zazwyczaj droższe (nawet 10x!)

**Łączny koszt:** `Total Cost = (Tokens In × Price In) + (Tokens Out × Price Out)`

#### Przykłady cenników

| Model | Tokens In | Tokens Out | Różnica |
|-------|-----------|------------|---------|
| grok-code-fast-1 | $0.20/1M | $1.00/1M | 5x |
| GPT-5-Codex | $1.25/1M | $10.00/1M | 8x |
| Claude Sonnet 4.5 | $3.00/1M | $15.00/1M | 5x |
| Gemini 2.5 Pro | $1.25/1M | $5.00/1M | 4x |

**Przykładowa kalkulacja:**

Zadanie: Wygenerowanie komponentu React (1000 linii kodu)
- Prompt: ~500 tokenów (In)
- Kontekst: ~2000 tokenów (In)
- Odpowiedź: ~3000 tokenów (Out)

```
grok-code-fast-1:
  = (2500 × 0.20/1M) + (3000 × 1.00/1M)
  = $0.0005 + $0.003
  = $0.0035

GPT-5-Codex:
  = (2500 × 1.25/1M) + (3000 × 10.00/1M)
  = $0.003125 + $0.03
  = $0.033125

Różnica: ~9.5x
```

**Wniosek:** Przy podobnej jakości wyników, ekonomiczne modele mogą być **5-10x tańsze**.

### 3.3 Optymalizacja kosztów

#### Strategiczne dobieranie modeli

**Zasada:** Używaj najdroższych modeli tylko tam, gdzie mają realną przewagę.

```
Prosty CRUD endpoint    → Grok Code Fast 1    ($)
Złożona integracja API  → Claude Sonnet 4.5   ($$$)
Generowanie testów      → Grok Code Fast 1    ($)
Analiza architektury    → Gemini 2.5 Pro      ($$$$)
```

**Oszczędności:** Nawet 70% kosztów przy zachowaniu jakości tam, gdzie jest to krytyczne.

#### Język konwersacji: polski vs angielski

**Polski:**
- **Tokenizacja:** +50-67% więcej tokenów niż angielski
- **Wyniki OneRuler:** 1. miejsce w zadaniach "needle-in-haystack" (długi kontekst)
- **Koszty Usage-based:** Znacząco wyższe przy intensywnym użyciu
- **Kiedy używać:**
  - Flat Rate (koszt nie rośnie)
  - Zadania wymagające długiego kontekstu
  - Zespół preferuje polski

**Angielski:**
- **Tokenizacja:** Bardziej efektywny (baseline)
- **Koszty Usage-based:** Niższe o ~33-40%
- **Kiedy używać:**
  - Usage-based pricing
  - Duża ilość zapytań
  - Praca z angielską dokumentacją

**Rekomendacje:**
- **Flat Rate** → dowolny język (preferuj polski dla komfortu)
- **Usage-based** → rozważ angielski dla oszczędności

#### Batch processing vs pojedyncze prompty

**Źle:**
```
Prompt 1: "Add validation to email field in UserForm.tsx"
Prompt 2: "Add validation to password field in UserForm.tsx"
Prompt 3: "Add validation to username field in UserForm.tsx"
```
**Koszt:** 3× input context (za każdym razem cały plik)

**Dobrze:**
```
Prompt: "Add validation to email, password, and username fields in UserForm.tsx"
```
**Koszt:** 1× input context

**Oszczędności:** Do 60-70% na input tokens w powtarzalnych zadaniach.

#### Czyszczenie kontekstu

**Problem:** Każda wiadomość w historii = dodatkowe tokeny przy każdym zapytaniu.

**Rozwiązanie:**
- `/clear` po zakończeniu etapu pracy
- `/compact` w trakcie długiej sesji (kompresja historii)
- Unikaj bardzo długich konwersacji (>50 wiadomości)

**Oszczędności:** Nawet 80% na input tokens w długich sesjach.

---

## 4. Anatomia skutecznego prompta

### 4.1 Pięć elementów prompta (hierarchia ważności)

#### 1. Polecenie (bardzo ważne)

**Definicja:** Czasownik + jasno zdefiniowane działanie

**Proste operacyjne:**
```
"Napisz funkcję, która waliduje email"
"Zrefaktoruj ten kod używając TypeScript"
"Dodaj testy dla UserService"
```

**Złożone wieloetapowe:**
```
"Przeanalizuj UserService, zidentyfikuj problemy z bezpieczeństwem,
zaproponuj poprawki i napisz testy weryfikujące poprawki"
```

**Zarządzanie procesem myślenia (modele reasoning):**
```
"Zanim napiszesz kod, przeanalizuj wymagania i zaproponuj
3 różne podejścia z analizą trade-offs"
```

**Najczęstsze błędy:**
- Brak czasownika ("Email validation") → dodaj "Napisz"
- Zbyt ogólne ("Fix this") → precyzuj "Fix authentication error in login flow"
- Zakopane w kontekście → polecenie na początku prompta

#### 2. Kontekst (bardzo ważny)

**Referencje do plików i folderów:**
```
"Dodaj walidację email w @src/components/UserForm.tsx
zgodnie z wzorcem użytym w @src/components/LoginForm.tsx"
```

**Opis techniczny:**
```
Stack: Next.js 14, TypeScript, TailwindCSS, tRPC, Prisma
Struktura: app router, server components jako default
Procesy: Husky pre-commit, GitHub Actions CI/CD
```

**Opis produktowy (PRD):**
```
Problem: Użytkownicy często rezygnują podczas rejestracji
Target users: Niecierpliwi młodzi użytkownicy (18-25 lat)
Wymagania: Rejestracja ≤ 3 kliknięcia, OAuth social logins
KPI: Conversion rate >60%, bounce rate <15%
```

**Kiedy kontekst jest krytyczny:**
- Praca z istniejącą codebase (referencje!)
- Specyficzne wymagania biznesowe
- Ograniczenia techniczne (legacy code, specific libs)
- Zespołowe konwencje

#### 3. Format (ważny)

**Markdown z blokami kodu:**
````
"Zwróć odpowiedź w formacie:
## Analiza
[opis problemu]

## Rozwiązanie
```typescript
// kod
```

## Uzasadnienie
[wyjaśnienie]"
````

**Szablony markdown:**
```
"Wygeneruj dokumentację w formacie:
# Component Name
## Props
| Name | Type | Required | Default | Description |
## Usage Examples
## Notes"
```

**JSON/YAML (automatyzacja):**
```
"Zwróć konfigurację w formacie JSON:
{
  "validation": {
    "rules": [...],
    "messages": {...}
  }
}"
```

**Specjalistyczne formaty:**
- JSDoc: `"Dodaj JSDoc comments do wszystkich funkcji"`
- OpenAPI: `"Wygeneruj OpenAPI spec dla tego endpointa"`
- Docker Compose: `"Stwórz docker-compose.yml dla tego stacku"`
- GitHub Actions: `"Przygotuj workflow CI/CD dla Node.js projektu"`

#### 4. Rola (mniej ważna)

**Obserwacja:** W najnowszych modelach (2024-2025) rola straciła na znaczeniu, ale wciąż może pomóc.

**Kiedy dodać:**
- Specjalistyczna domena: `"Działaj jako security specialist"`
- Zawężenie perspektywy: `"Z perspektywy frontend developera"`
- Zmiana tonu: `"Jako doświadczony mentor, wyjaśnij krok po kroku"`

**Czas dodania:** 5-10 sekund → warto dodać "na wszelki wypadek"

**Nie przesadzaj:**
```
❌ "Jesteś super ultra mega doświadczonym ninja rockstar 10x developerem..."
✅ "Działaj jako senior backend developer"
```

#### 5. Przykłady (najmniej ważne w kodowaniu)

**Ograniczona przydatność w typowych zadaniach:**
- Modele są już wytrenowane na miliardach linii kodu
- Znają popularne wzorce i biblioteki
- Przykłady mogą niepotrzebnie zwiększać koszty (input tokens)

**Kluczowe w integracjach technicznych:**
```
"Napisz funkcję parsującą logi w tym formacie (podaj 2-3 przykłady logów):

[2025-01-15 14:23:45] INFO User logged in: user_id=123
[2025-01-15 14:24:12] ERROR Failed to connect: timeout=30s
"
```

**Few-Shot Learning:**
Gdy chcesz specyficznego stylu/wzorca:
```
"Wygeneruj komponenty w tym stylu:

Przykład 1:
export const Button = ({ label, onClick }: ButtonProps) => (
  <button onClick={onClick}>{label}</button>
);

Przykład 2:
export const Input = ({ value, onChange }: InputProps) => (
  <input value={value} onChange={onChange} />
);

Teraz wygeneruj komponent Select."
```

### 4.2 Najlepsze praktyki

**Hierarchia priorytetów:**
```
1. Polecenie (ZAWSZE jasne i precyzyjne)
2. Kontekst (ile potrzeba dla zrozumienia)
3. Format (jeśli wynik ma być przetworzony)
4. Rola (kilka sekund, można dodać)
5. Przykłady (tylko jeśli naprawdę trzeba)
```

**Unikanie "vibe coding":**
```
❌ "Zrób coś z tym userem, no wiesz, jakoś to ogarnij"
✅ "Dodaj walidację email i password do UserForm.tsx używając Zod"
```

**Inwestuj czas w Polecenie + Kontekst:**
- 80% wartości pochodzi z tych dwóch elementów
- 5 minut więcej na przygotowanie kontekstu = oszczędność godzin debugowania

### 4.3 Najczęstsze błędy

**Błąd #1: Zaniedbanie fundamentów na rzecz "upiększania" roli**
```
❌ Prompt (500 znaków roli + 20 znaków polecenia):
"Jesteś super doświadczonym architektem z 20-letnim doświadczeniem...
Zrób coś z tym kodem."

✅ Prompt (50 znaków roli + 200 znaków polecenia+kontekstu):
"Senior backend dev. Zrefaktoruj UserService.ts: wydziel walidację
do osobnego serwisu, zastosuj dependency injection, dodaj testy."
```

**Błąd #2: Ignorowanie ograniczeń kontekstu**
```
❌ Wklejanie całego projektu (100k+ tokenów)
✅ Referencje do kluczowych plików (@path/to/file)
```

**Błąd #3: Próba "wpakowania" całego projektu do prompta**
```
❌ [wklejka 50 plików jako "kontekst"]
✅ "Projekt używa Next.js 14 + Prisma. Wzorzec walidacji w @lib/validation.ts.
    Dodaj podobną walidację do @app/register/page.tsx"
```

---

## 5. Zaawansowane techniki promptowania

### 5.1 Meta-Prompting

#### Definicja
Meta-Prompting to zlecenie AI **poprawy własnego promptu**. Zamiast samemu optymalizować, pozwalasz modelowi ulepszyć komunikację.

#### Uniwersalny szablon

```
Ulepsz poniższy prompt według tych wytycznych:

1. **Rola**: Dodaj odpowiednią rolę eksperta, jeśli brakuje
2. **Kontekst**: Doprecyzuj kontekst techniczny i biznesowy
3. **Cel**: Wyraźnie określ oczekiwany rezultat
4. **Format**: Zaproponuj strukturę odpowiedzi
5. **Ograniczenia**: Dodaj istotne ograniczenia (techniczne, czasowe, budżetowe)
6. **Wyjaśnienie zmian**: Opisz, co i dlaczego zmieniłeś

---
PROMPT DO POPRAWY:
[twój bazowy prompt]
```

#### Przykład transformacji

**Prompt bazowy:**
```
"Napisz system rekomendacji produktów"
```

**Po Meta-Promptingu:**
```
Rola: Senior ML Engineer z doświadczeniem w e-commerce

Kontekst:
- E-commerce platform (Next.js + Python backend)
- 100k produktów, 50k aktywnych użytkowników
- Dane: historia zamówień, przeglądania, oceny
- Infrastruktura: AWS, PostgreSQL, Redis

Cel:
Zaprojektuj system rekomendacji produktów zwiększający CTR o ≥15%

Wymagania:
1. Real-time recommendations (<100ms)
2. Cold start handling (nowi użytkownicy)
3. A/B testing ready
4. Scalable to 500k users

Format odpowiedzi:
## Architektura
## Algorytm rekomendacji
## Data pipeline
## API design
## Metryki sukcesu
## Implementation plan

Ograniczenia:
- Budget: $2k/month infrastructure
- Timeline: MVP w 6 tygodni
- Zespół: 2 backend devs + 1 ML engineer
```

#### Efekt uboczny
Meta-Prompting zwiększa **Twoją świadomość** tego, jak komunikujesz się z AI. Po kilku iteracjach zaczniesz naturalnie pisać lepsze prompty.

### 5.2 Metoda Sokratejska

#### Kluczowy zwrot
```
"Zanim rozpoczniesz pracę, zadaj mi 5-10 pytań, które pomogą Ci
lepiej zrozumieć kontekst i wymagania."
```

#### Odwrócenie ról
Zamiast Ty → AI (instrukcje), masz AI → Ty (pytania o kontekst).

**Korzyści:**
- Odkrywasz **"nieznane niewiadome"** (czego nie wiesz, że nie wiesz)
- AI wyłapuje luki w Twoim założeniu
- Lepszy kontekst = lepsza implementacja

#### Przykład

**Standardowy prompt:**
```
"Zaprojektuj system rekomendacji produktów dla e-commerce"
```

**Metoda Sokratejska:**
```
"Chcę zaprojektować system rekomendacji produktów dla e-commerce.
Zanim zaproponujesz rozwiązanie, zadaj mi 7-10 pytań, które pomogą
Ci lepiej zrozumieć wymagania."
```

**AI zadaje pytania:**
```
1. Jaka jest wielkość katalogu produktów?
2. Czy masz dostęp do historii zakupów użytkowników?
3. Jakie inne sygnały zbieracie (przeglądania, wishlist, oceny)?
4. Jakie są wymagania czasowe (real-time vs batch)?
5. Jak dużo czasu użytkownicy spędzają na stronie (cold start problem)?
6. Jaki jest budżet infrastruktury?
7. Czy macie zespół ML, czy raczej backend devs?
8. Jakie metryki sukcesu są kluczowe (CTR, conversion, AOV)?
9. Czy są jakieś ograniczenia prawne (GDPR, privacy)?
10. Jaki jest timeline projektu?
```

**Rezultat:** Znacznie lepiej zdefiniowany problem + odkrycie kwestii, o których nie pomyślałeś (np. GDPR, cold start).

### 5.3 Brainstorming i eksploracja rozwiązań

#### Kluczowe pytanie
```
❌ "Jak zrobić X?"
✅ "W ile różnych sposobów można zrobić X?"
```

#### Właściwe sformułowanie kontekstu

**Szablon:**
```
Chcę [cel]. Jestem otwarty na różne podejścia.

Obecny stan:
- [opis obecnego rozwiązania/sytuacji]

Ograniczenia:
- Techniczne: [stack, legacy code, infrastruktura]
- Biznesowe: [budżet, timeline, compliance]
- Zespołowe: [skillset, dostępność]

Cele:
- [priorytet 1]
- [priorytet 2]
- [priorytet 3]

Przedstaw 4-5 różnych strategii podejścia do tego problemu.
Dla każdej opisz: założenia, trade-offs, timeline, koszty, ryzyka.
```

#### Iteracyjna eksploracja: szerokie → głębokie

**Faza 1: Szerokie spojrzenie**
```
"Przedstaw 5 różnych podejść do budowy systemu notyfikacji"
```

**Faza 2: Zagłębianie się**
```
"Rozwiń podejście #3 (WebSocket-based real-time notifications):
jakie są opcje implementacji, biblioteki, architektury?"
```

**Faza 3: Szczegóły**
```
"Dla Socket.io + Redis Pub/Sub: zaprojektuj szczegółową architekturę
z uwzględnieniem scalability, failover, monitoring"
```

#### Best Practices

**✅ DO:**
- Jasne ramy bez przedwczesnego zawężania
- Różnorodne perspektywy (architekt, tester, security, PM)
- Dokumentacja procesu (zapisuj wyniki brainstormingu)
- Doprecyzowanie kryteriów oceny (co jest najważniejsze?)

**❌ DON'T:**
- Zbyt wczesne przejście do szczegółów
- Przyjmowanie pierwszego "sensownego" rozwiązania
- Overthinking (eksploracja jako cel sam w sobie)
- Izolowanie od zespołu (włącz innych w dyskusję)

#### Najczęstsze błędy

**Błąd #1: Przedwczesne zawężenie**
```
❌ "Czy powinienem użyć Redux czy Zustand?"
✅ "Jakie są różne podejścia do zarządzania stanem w React?
    Projekt: dashboard z real-time data, 10+ widoków, 5 devs"
```

**Błąd #2: Eksploracja bez celu**
```
❌ 3 godziny brainstormingu, 20 opcji, żadna decyzja
✅ 45 min brainstormingu → 3-4 opcje → analiza trade-offs → decyzja
```

**Błąd #3: Brak zespołu**
```
❌ Solo eksploracja → prezentacja gotowego rozwiązania zespołowi
✅ Wstępna eksploracja z AI → dyskusja z zespołem → finalizacja
```

### 5.4 Planowanie zadań

#### Plan Mode (Claude Code)

**Aktywacja:** `Shift+Tab x2`

**Charakterystyka:**
- Model skupia się na planowaniu zamiast implementacji
- Nie wykonuje akcji (read-only)
- Dokładny plan przed kodem

**Workflow:**
```
1. Shift+Tab x2 (enter Plan Mode)
2. Opisz zadanie
3. AI generuje plan
4. Wybierz "3. Continue planning" (doprecyzuj)
5. Zatwierdź plan
6. Exit Plan Mode → nowa konwersacja z planem jako kontekst
7. Implementacja według planu
```

#### Szczegółowość planu

**Zła szczegółowość (zbyt ogólna):**
```
1. Dodaj autentykację
2. Stwórz dashboard
3. Dodaj testy
```

**Dobra szczegółowość (brak dodatkowych decyzji):**
```
1. Install dependencies: next-auth, @prisma/client, bcrypt
2. Create Prisma schema: User model (id, email, passwordHash, createdAt)
3. Generate Prisma client: npx prisma generate
4. Create /api/auth/[...nextauth].ts:
   - CredentialsProvider
   - Bcrypt password verification
   - JWT session strategy
5. Create middleware.ts: protect /dashboard/* routes
6. Create /app/login/page.tsx: login form with email/password
7. Create /app/dashboard/page.tsx: protected page, display user email
8. Add unit tests for auth API route (success, wrong password, user not found)
9. Add E2E test for login flow (Playwright)
```

**Kryterium:** Programista bez kontekstu powinien móc zaimplementować każdy krok bez dodatkowych pytań.

#### Best Practices

**Definition of Done:**
Każdy task powinien mieć jasne kryteria ukończenia:
```
Task: "Dodaj walidację formularza"

DoD:
- Email: regex validation, required
- Password: min 8 chars, 1 uppercase, 1 number, required
- Error messages: displayed below fields, red color
- Submit button: disabled during validation errors
- Unit tests: 100% coverage validation logic
- E2E test: form submission with invalid data shows errors
```

**Modelowanie edge cases:**
```
Plan powinien uwzględniać:
- Happy path (standard flow)
- Error scenarios (API failures, validation errors)
- Edge cases (empty data, special characters, race conditions)
- Loading states
- Accessibility (keyboard navigation, screen readers)
```

**Planowanie testów równolegle:**
Nie "dodaj testy" na końcu, ale plan testów **równolegle z implementacją**:
```
1. Create UserService.register() method
   Test: successful registration
   Test: duplicate email error
   Test: invalid email format error

2. Create API endpoint POST /api/users
   Test: API returns 201 on success
   Test: API returns 400 on validation error
   Test: API returns 409 on duplicate
```

#### Najczęstsze błędy

**Błąd #1: Plany na zbyt wysokim poziomie abstrakcji**
```
❌ "Zintegruj z API płatności"
✅ "
1. Create Stripe account, get API keys
2. Install @stripe/stripe-js, stripe (Node)
3. Create /api/create-payment-intent endpoint
4. Create CheckoutForm component with CardElement
5. Handle payment confirmation
6. Add webhook endpoint /api/stripe-webhook
7. Test with Stripe test cards
"
```

**Błąd #2: Ignorowanie stanu projektu**
```
❌ Plan zakłada czysty projekt
✅ Plan uwzględnia istniejący kod, migracje, backward compatibility
```

**Błąd #3: Brak review planu przed implementacją**
```
❌ Plan → natychmiastowa implementacja → problemy
✅ Plan → review (Ty + AI: "Czy czegoś nie przeoczyliśmy?") → implementacja
```

**Błąd #4: Pomijanie bezpieczeństwa i compliance**
```
❌ Plan implementacji bez uwzględnienia security
✅ Plan zawiera: input validation, XSS prevention, CSRF tokens, rate limiting, GDPR considerations
```

### 5.5 Promptowanie bez efektu potwierdzenia (sycophancy)

#### Problem: AI jako "potakiwacz"

Modele AI są trenowane do bycia pomocnymi i zgadzania się z użytkownikiem. To może prowadzić do:
- Potwierdzania złych decyzji
- Ignorowania ryzyk
- Braku krytycznego myślenia

#### 5 technik przeciwdziałania

#### 1. Adwokat diabła

**Szablon:**
```
Działaj jako skrajnie sceptyczny architekt oprogramowania,
który specjalizuje się w znajdowaniu problemów w projektach.

Twoje zadanie: znajdź wszystkie słabości, ukryte koszty,
ryzyka i potencjalne katastrofy w moim podejściu.

Nie oszczędzaj mojego ego - chcę surowej, bezlitosnej analizy.

Moje podejście:
[opis Twojego pomysłu]

Odpowiedź w formacie:
## Krytyczne ryzyka
## Ukryte koszty
## Techniczne pułapki
## Alternatywy do rozważenia
```

**Przykład:**
```
Planuję użyć MongoDB zamiast PostgreSQL dla aplikacji e-commerce.

AI (Adwokat diabła):
## Krytyczne ryzyka
- Brak transakcji ACID może prowadzić do niespójności zamówień/płatności
- Relacje między encjami (user-order-product) będą trudne do zarządzania
- JOIN-y będą wymagały application-level logic (wolniejsze, podatne na błędy)

## Ukryte koszty
- Zespół musi nauczyć się NoSQL patterns (czas, potencjalne błędy)
- Migration do SQL w przyszłości będzie kosztowna (jeśli się okaże, że potrzebujecie)
- Trudniejszy hiring (więcej devs zna SQL niż Mongo)
...
```

#### 2. Porównanie alternatyw

**Szablon:**
```
Zamiast oceniać mój wybór [X], przedstaw trzy najlepsze
alternatywne podejścia do tego samego problemu.

Dla każdego podejścia stwórz tabelę porównawczą:
- Koszty (setup, maintenance, scaling)
- Skalowalność
- Krzywa uczenia
- Ograniczenia
- Kiedy wybrać

Problem:
[opis problemu, który rozwiązujesz]

Mój obecny wybór:
[X]
```

**Rezultat:** Widzisz szerszy obraz, możesz podjąć świadomą decyzję.

#### 3. Analiza Pre-Mortem

**Szablon:**
```
Jest rok 2026. Projekt, który zaczęliśmy, okazał się kompletną katastrofą.

Napisz szczegółową analizę pre-mortem:

1. **Co poszło nie tak:**
   Jakie błędne założenia doprowadziły do porażki?

2. **Pierwsze sygnały ostrzegawcze:**
   Które problemy pojawiły się wcześnie, ale zostały zignorowane?

3. **Decyzje, których żałujemy:**
   Które wybory techniczne/biznesowe okazały się krytycznymi błędami?

4. **Czego nie przewidzieliśmy:**
   Jakie ryzyka nie były uwzględnione w planowaniu?

Projekt:
[opis projektu/pomysłu]
```

**Przykład:**
```
Projekt: Przepisanie monolitu na mikroservisy

Pre-Mortem (AI):
1. Co poszło nie tak:
- Rozbiliśmy monolit na 47 mikroservisi (zamiast 5-7)
- Każdy serwis miał własną bazę danych (nightmare debugowania)
- Brak proper service mesh = chaos w komunikacji
- Distributed tracing dodany za późno

2. Pierwsze sygnały:
- Po 3 miesiącach: 2x więcej bugów niż w monolicie
- Developer onboarding: z 2 dni → 2 tygodnie
- Deployment: z 5 min → 45 min (wszystkie serwisy)
...
```

#### 4. Zmiana ról i perspektyw

**Szablon:**
```
Oceń moje podejście z perspektywy:

a) Frontend developera (DX, maintenance)
b) Specjalisty ds. bezpieczeństwa (zagrożenia)
c) Chief Revenue Officera (wpływ na biznes)
d) DevOps engineera (deployment, monitoring)

Dla każdej perspektywy:
- Główne obawy
- Red flags
- Rekomendacje

Podejście:
[opis]
```

**Rezultat:** Multidimensional view problemu.

#### 5. Nieznane niewiadome

**Szablon:**
```
Jakie są "nieznane niewiadome" w tym podejściu?

Innymi słowy: o jakich potencjalnych problemach, ograniczeniach,
lub konsekwencjach powinienem wiedzieć, ale prawdopodobnie nie wiem,
że nie wiem?

Podejście:
[opis]

Zwróć szczególną uwagę na:
- Techniczne pułapki (performance, security, scalability)
- Zespołowe (skillset gaps, maintenance burden)
- Biznesowe (vendor lock-in, hidden costs)
- Długoterminowe konsekwencje
```

### 5.6 Pozyskiwanie nowej wiedzy

#### Uniwersalny szablon prompta edukacyjnego

```
**Rola asystenta:**
Jesteś doświadczonym [domena expertise] z 10+ letnim doświadczeniem
w nauczaniu [technologia/framework].

**Moje doświadczenie:**
- Poziom: [junior/mid/senior]
- Technologie, które znam: [lista]
- Technologie, których się uczę: [lista]

**Cel nauki:**
Chcę zrozumieć [co dokładnie] po to, żeby [konkretny cel].

**Moja obecna blokada:**
[Konkretny problem, który Cię powstrzymuje]

**Oczekiwania:**
1. Wyjaśnij koncepcję [X] w sposób dostosowany do mojego poziomu
2. Użyj wizualizacji (diagramy, kod, analogie)
3. Daj mi praktyczne instrukcje krok po kroku
4. Zaproponuj mini-projekt do przećwiczenia

**Format odpowiedzi:**
## Wyjaśnienie koncepcji
[prosta definicja + analogia]

## Dlaczego to ważne
[praktyczne zastosowania]

## Jak to działa
[wizualizacja + kod przykładowy]

## Praktyczne ćwiczenie
[mini-projekt krok po kroku]

## Dalsze kroki
[co dalej się uczyć]
```

#### Przykład zastosowania

```
Rola asystenta:
Jesteś doświadczonym DevOps Engineerem z 10+ letnim doświadczeniem
w nauczaniu Kubernetes i container orchestration.

Moje doświadczenie:
- Poziom: Mid backend developer
- Znam: Docker basics, Node.js, REST APIs, PostgreSQL
- Uczę się: Kubernetes, cloud deployment

Cel nauki:
Chcę zrozumieć Kubernetes Services i Ingress po to, żeby
zdeployować swoją Node.js aplikację na GKE (Google Kubernetes Engine).

Moja blokada:
Nie rozumiem różnicy między ClusterIP, NodePort, LoadBalancer
i kiedy użyć Ingress zamiast Service.

Oczekiwania:
1. Wyjaśnij różnice między typami Services
2. Użyj diagramów do wizualizacji
3. Pokaż przykładową konfigurację dla Node.js API
4. Zaproponuj plan deployment na GKE

[AI generuje szczegółową, dostosowaną odpowiedź]
```

#### Pogłębianie wiedzy

**Promptowanie iteracyjne:**
```
1. Podstawy: "Wyjaśnij X"
2. Doprecyzowanie: "Rozwiń punkt o Y, nie rozumiem Z"
3. Zmiana perspektywy: "Wyjaśnij to samo, ale z perspektywy performance"
4. Praktyka: "Pokaż przykład kodu implementującego X"
```

**Few-Shot Learning (pokazanie stylu):**
```
"Chcę nauczyć się pisać testy w stylu podobnym do tego przykładu:

[przykład 1 twojego test case]
[przykład 2 twojego test case]

Napisz podobne testy dla [nowa funkcjonalność],
zachowując ten sam styl i strukturę."
```

**Analogie:**
```
"Wyjaśnij [trudna koncepcja] używając analogii do [coś, co znasz dobrze]"

Przykład:
"Wyjaśnij Kubernetes Pods, Services, Deployments używając analogii
do restauracji (kuchnia, kelnerzy, menu)"
```

---

## 6. Zarządzanie kontekstem

### 6.1 Znaczenie kontekstu

**Kontekst = klucz do skutecznej współpracy z AI**

Bez kontekstu:
```
"Napraw bug w loginForm"
→ AI zgaduje, co może być nie tak
→ generyczny kod
→ nie pasuje do Twojego projektu
```

Z kontekstem:
```
"Napraw bug w @src/components/LoginForm.tsx:
Email validation fails for emails with '+' character.
Project uses Zod for validation (@src/lib/validation.ts)"

→ AI rozumie dokładnie problem
→ kod zgodny z projektem
→ używa istniejących wzorców
```

**Okno kontekstowe = ograniczony zasób**
- Każdy model ma limit (np. 200k tokenów)
- Historia konwersacji zajmuje miejsce
- Im więcej kontekstu, tym wyższe koszty

### 6.2 Pliki pamięci

#### CLAUDE.md (Claude Code)

**Lokalizacja:** `/project-root/CLAUDE.md`

**Cel:** Trwała pamięć projektu dostępna w każdej konwersacji

**Co zawierać:**
```markdown
# Project Name

## Tech Stack
- Framework: Next.js 14 (app router)
- Database: PostgreSQL + Prisma
- Auth: NextAuth.js
- Styling: TailwindCSS + shadcn/ui

## Build Instructions
npm install
npx prisma generate
npm run dev

## Code Conventions
- Components: PascalCase, one per file
- Utils: camelCase, grouped by domain
- Validation: Zod schemas in /lib/validation
- API routes: tRPC in /server/api

## Common Commands
- Test: npm test
- Lint: npm run lint:fix
- DB migrate: npx prisma migrate dev

## Project-specific shortcuts
- Auth patterns: see /lib/auth-utils.ts
- Error handling: see /lib/errors.ts
```

**Dbaj o zwięzłość:**
- ❌ Pełna dokumentacja (1000+ linii)
- ✅ Najważniejsze informacje (50-200 linii)

**Przykład:** [10xRules.ai CLAUDE.md](https://github.com/przeprogramowani/ai-rules-builder/blob/master/CLAUDE.md)

#### Analogiczne mechanizmy w innych narzędziach

- **Cursor:** `.cursorrules` lub `.cursor/rules`
- **GitHub Copilot:** `.github/copilot-instructions.md`
- **Aider:** `.aider.conf.yml`

### 6.3 Monitoring zużycia kontekstu

#### /context (Claude Code)

**Użycie:** Wpisz `/context` w konwersacji

**Wyświetla:**
```
Context Usage: 45,231 / 200,000 tokens (22.6%)

Breakdown:
- System prompt & tools:    12,450 tokens (27.5%)
- MCP tools:                 3,200 tokens (7.1%)
- Memory files (CLAUDE.md):  1,580 tokens (3.5%)
- Messages (conversation):  28,001 tokens (61.9%)
```

**Co to oznacza:**
- **System prompt & tools:** Niemodyfikowalne (narzędzia Claude Code)
- **MCP tools:** Twoje zainstalowane MCP servers (można wyłączyć niepotrzebne)
- **Memory files:** CLAUDE.md i inne pliki pamięci (utrzymuj zwięzłe!)
- **Messages:** Historia konwersacji (główny "pożeracz" kontekstu)

**Zależności:**
- ↓ Kontekst = ↑ Efektywność i szybkość odpowiedzi
- ↓ Kontekst = ↓ Koszty (usage-based pricing)
- ↓ Kontekst = wolniej zużywamy limity (flat rate)

### 6.4 Optymalizacja kontekstu

#### /compact - kompresja historii

**Użycie:** `/compact`

**Co robi:**
- AI podsumowuje dotychczasową konwersację
- Zastępuje długą historię krótkim podsumowaniem
- Zwalnia miejsce w oknie kontekstowym

**Kiedy używać:**
- Po zakończeniu etapu pracy (np. po zaimplementowaniu feature)
- Gdy /context pokazuje >70% zużycia
- Przed rozpoczęciem nowego, niezwiązanego zadania

**Selektywne zachowanie:**
```
/compact only keep discussion about authentication implementation
and remove all debugging conversation
```

**Skuteczność:**
- ✅ Działa dobrze dla podsumowania wykonanych zadań
- ⚠️ Może tracić istotne szczegóły (np. konkretne decyzje techniczne)
- ❌ Nie zawsze skuteczne (zależy od jakości podsumowania)

**Auto-compact vs manualne:**
- Niektóre narzędzia mają auto-compact (np. co 50 wiadomości)
- Lepiej kontrolować manualnie po etapach pracy

#### Świadome dołączanie plików

**Źle:**
```
[historia zawiera 20 plików z poprzednich zadań]
"Teraz dodaj walidację do UserForm.tsx"
→ AI dostaje kontekst wszystkich 20 plików (zbędne!)
```

**Dobrze:**
```
/clear (nowa konwersacja)
"Dodaj walidację do @src/components/UserForm.tsx
zgodnie z wzorcem z @src/lib/validation.ts"
→ AI dostaje tylko 2 pliki (wystarczające)
```

**Tip:** Używaj @ do jawnego wskazania plików zamiast polegania na historii.

#### Batch processing

**Źle (3 osobne zapytania):**
```
1. "Add email validation to LoginForm"
2. "Add password validation to LoginForm"
3. "Add submit button disable logic to LoginForm"
```
**Koszt kontekstu:** 3× pełny plik w historii

**Dobrze (1 zapytanie):**
```
"Add to LoginForm:
1. Email validation (regex, required)
2. Password validation (min 8 chars, required)
3. Disable submit button when validation errors"
```
**Koszt kontekstu:** 1× plik

### 6.5 Reset kontekstu

#### /clear - reset całej historii

**Użycie:** `/clear`

**Co robi:**
- Usuwa całą historię konwersacji
- Zachowuje CLAUDE.md i konfigurację
- Zaczyna od zera (zero tokenów w Messages)

**Kiedy używać:**
- Model zapętlił się w błędnych założeniach (zobacz: sekcja 7)
- Zupełnie nowe zadanie niezwiązane z poprzednim
- Stara dyskusja nic już nie wnosi

**Nie używaj bezmyślnie:**
```
❌ /clear po każdym zadaniu (tracisz kontekst projektu)
✅ /clear po zakończeniu dużego etapu lub gdy konwersacja problematyczna
```

### 6.6 Context rot i context drift

#### Context Rot
**Definicja:** Model "zapomina" szczegóły z początku długiej konwersacji.

**Objawy:**
- Model pyta o rzeczy, które już ustaliliście
- Ignoruje wcześniejsze decyzje
- Powtarza błędy, które już naprawiono

**Rozwiązanie:**
- `/compact` z zachowaniem kluczowych decyzji
- `/clear` + podsumowanie ręczne w nowej konwersacji

#### Context Drift
**Definicja:** Model traci zrozumienie realizowanego celu.

**Objawy:**
- Kod odchodzi od oryginalnego planu
- Model wprowadza zmiany "na boku" bez pytania
- Rozwiązania stają się coraz bardziej złożone bez dodania wartości

**Rozwiązanie:**
- Przypomnienie celu: "Focus: our goal is [X], not [Y]"
- `/clear` + nowa konwersacja z jasnym celem
- Plan Mode przed dalszą pracą

**Sygnały do akcji:**
- Rozmowa >50 wiadomości
- Wiele operacji edycji na tych samych plikach
- Spadek jakości odpowiedzi
- Frustracja ("przecież mówiłem już...")

---

## 7. Ratowanie problematycznych konwersacji

### 7.1 Rozpoznawanie sygnałów ostrzegawczych

#### Sygnał #1: Model wprowadza zmiany poza planem
```
Ty: "Add email validation"
AI: "Done. I also refactored the entire form structure,
     changed state management to Zustand, and updated styling"
```
**Red flag:** Niezaplanowane "ulepszenia"

#### Sygnał #2: Kod komplikuje się bez dodania funkcjonalności
```
Iteracja 1: 50 linii, działa
Iteracja 2: 120 linii, działa podobnie
Iteracja 3: 280 linii, działa tak samo (ale "lepiej")
```
**Red flag:** Rosnąca złożoność bez rosnącej wartości

#### Sygnał #3: Błędy w działających wcześniej miejscach
```
Ty: "Fix bug in UserForm"
AI: [wprowadza fix]
→ UserForm działa, ale teraz LoginForm się zepsuł
→ Następny fix: UserForm znowu nie działa
```
**Red flag:** Regresjie w poprzednio działającym kodzie

#### Sygnał #4: Frustracja i mniej precyzyjne instrukcje
```
Początkowo: "Add email validation using Zod schema matching pattern in @lib/validation.ts"
Po 10 iteracjach: "Just fix it please"
```
**Red flag:** Tracisz cierpliwość i precyzję

### 7.2 Strategia resetu z podsumowaniem

#### Krok 1: Rozpoznanie momentu

**Pytanie:** Czy ta konwersacja jest antyproduktywna?

**Tak, jeśli:**
- Zasada "trzech prób" (patrz: 7.3)
- Więcej czasu na debugowanie niż byłoby na pisaniu od zera
- Czujesz frustrację

#### Krok 2: Szablon prompta do podsumowania

```markdown
Zatrzymajmy się i przeanalizujmy dotychczasową konwersację.
Czuję, że zamiast zbliżać się do rozwiązania, kręcimy się w kółko.

Potrzebuję szczegółowego podsumowania, które pomoże rozpocząć
nową konwersację z czystym kontekstem:

**Co działa i powinno zostać zachowane:**
[Opisz elementy, które zostały poprawnie zaimplementowane.
Dla każdego wyjaśnij dlaczego działa dobrze i jakie decyzje
techniczne były kluczowe.]

**Gdzie nasze podejście zawiodło:**
[Zidentyfikuj konkretne momenty, gdzie zeszliśmy na manowce.
Jakie decyzje były błędne? Które próby naprawy pogarszały sytuację?
Bądź szczegółowy i krytyczny.]

**Czego się nauczyliśmy:**
[Jakie nowe informacje odkryliśmy o problemie? Które założenia
okazały się niepełne lub błędne? Czy pojawiły się dodatkowe
wymagania lub ograniczenia?]

**Zaktualizowany kontekst problemu:**
[Napisz kompletny opis problemu, który będzie punktem startowym
dla nowej konwersacji. Programista bez dostępu do tej historii
powinien zrozumieć cel, kontekst techniczny, ograniczenia,
i próby rozwiązania.]

Zapisz to podsumowanie w formacie Markdown do pliku:
conversation-summary-{timestamp}.md
```

#### Krok 3: Nowa konwersacja

```
/clear

[Wklej podsumowanie z poprzedniej konwersacji]

Na podstawie powyższego kontekstu, zaproponuj zaktualizowany
plan rozwiązania problemu uwzględniający to, czego się nauczyliśmy.
```

### 7.3 Zasada "trzech prób"

**Reguła:**
Jeśli trzeci fix wprowadza nowe problemy lub nie rozwiązuje oryginalnego → **RESET**

**Przykład:**
```
Problem: Email validation nie działa dla adresów z '+'

Próba 1: AI zmienia regex
→ Nowy problem: teraz nie akceptuje subdomen

Próba 2: AI poprawia regex
→ Nowy problem: performance issue (regex zbyt złożony)

Próba 3: AI "optymalizuje" regex
→ Nowy problem: wraca oryginalny bug + validation timeout

❌ STOP - to sygnał do resetu!
```

**Dlaczego trzeci?**
- Pierwsza próba: może być błąd w komunikacji
- Druga próba: może być nieprzewidziany edge case
- Trzecia próba: prawdopodobnie fundamentalny problem z podejściem

### 7.4 Najlepsze praktyki

#### DO:

**Reset proaktywnie:**
```
❌ 2 godziny frustrującego debugowania
✅ Rozpoznanie sygnałów po 20-30 min → reset
```

**Zbieraj wiedzę przed resetem:**
```
❌ /clear → zaczynasz od zera
✅ Podsumowanie → /clear → nowa konwersacja z wiedzą
```

**Analizuj wzorce:**
```
Jeśli często resetujesz przy podobnych problemach:
→ Ulepsz formułowanie wymagań
→ Dodaj więcej kontekstu do CLAUDE.md
→ Użyj Plan Mode przed implementacją
```

#### DON'T:

**Sunk cost fallacy:**
```
"Już 2 godziny spędziłem na tej konwersacji,
nie mogę teraz zresetować"
→ Jeszcze gorsza decyzja
```

**Obciążanie winą AI:**
```
❌ "Model jest beznadziejny, nic nie rozumie"
✅ "Prawdopodobnie problem w mojej komunikacji lub kontekście"
```

**Reset bez przygotowania:**
```
❌ /clear → "Fix email validation" (znowu ten sam problem!)
✅ /clear → [podsumowanie] → "Fix email validation with context: [learned lessons]"
```

**Ignorowanie wzorców:**
```
Jeśli 3 konwersacje pod rząd wymagają resetu przy podobnych zadaniach:
→ Problem nie jest w modelu, ale w Twoim workflow
→ Czas na meta-analizę: co robisz źle?
```

---

## 8. Best Practices - Podsumowanie

### 8.1 DO's

#### Wybór modelu

- ✅ Stosuj podział **Koder** (szybkie zadania) vs **Architekt** (planowanie, złożone problemy)
- ✅ Używaj **ekonomicznych modeli** do prostych zadań (testy, dokumentacja, CRUD)
- ✅ Wybieraj **SOTA** do złożonych problemów (nowe features, integracje, algorytmy)
- ✅ Monitoruj **trendy** (OpenRouter, LM Arena) zamiast śledzić benchmarki
- ✅ **Testuj praktycznie** na swoim stacku (tydzień testowy)

#### Koszty

- ✅ Świadomie wybieraj **język** (polski vs angielski) według modelu rozliczeń
  - Flat Rate → dowolny (preferuj polski dla komfortu)
  - Usage-based → rozważ angielski (33-40% oszczędności)
- ✅ Stosuj **batch processing** (10 plików jednym promptem zamiast 10 promptów)
- ✅ Regularnie **czyszcz kontekst** (/clear po etapach, /compact w trakcie)
- ✅ Strategicznie **dobieraj modele** według kosztów (5-10x różnice!)

#### Promptowanie

- ✅ Priorytet: **Polecenie + Kontekst** (80% wartości)
- ✅ Używaj **Meta-Promptingu** do ulepszania promptów (AI pomaga pisać lepsze prompty)
- ✅ Stosuj **Metodę Sokratejską** przy brakach kontekstu ("Zanim zaczniesz, zadaj mi 5-10 pytań...")
- ✅ Rozpoczynaj od **eksploracji** ("W ile sposobów można zrobić X?")
- ✅ **Planuj przed implementacją** (szczegółowy plan bez dodatkowych decyzji, patrz: sekcja 5.4)
- ✅ Używaj **technik anti-bias** (Adwokat diabła, Pre-Mortem, Porównanie alternatyw)

#### Kontekst

- ✅ Utrzymuj **zwięzłe CLAUDE.md** / Cursor Rules (50-200 linii najważniejszych informacji)
- ✅ Monitoruj **zużycie** (/context regularnie)
- ✅ Kompresuj **manualnie po etapach** (/compact po zakończeniu feature)
- ✅ **Resetuj** po zakończeniu zadania lub gdy konwersacja problematyczna (/clear)
- ✅ Świadomie **dołączaj pliki** (@path/to/file zamiast polegania na historii)

#### Konwersacje

- ✅ Rozpoznawaj **sygnały** problematycznych konwersacji (model kręci się w kółko, regresjie, frustracja)
- ✅ Stosuj zasadę **"trzech prób"** (3. fix wprowadza problemy → reset)
- ✅ **Resetuj z podsumowaniem** (zbierz wiedzę przed /clear)
- ✅ Rozbijaj **duże problemy** na małe części (sygnał: zapętlenie)

### 8.2 DON'Ts

#### Wybór modelu

- ❌ Nie polegaj **wyłącznie na benchmarkach** syntetycznych (vibe check > testy)
- ❌ Nie używaj **najdroższych modeli** do wszystkiego (5-10x przepłacanie)
- ❌ Nie ignoruj **ekonomicznych alternatyw** (często podobna jakość, znacznie niższy koszt)

#### Koszty

- ❌ Nie ignoruj **różnicy tokenowej** (polski vs angielski) przy Usage-based (+50-67% koszt!)
- ❌ Nie karm modelu **wielokrotnie tymi samymi informacjami** (dodaj do CLAUDE.md raz)
- ❌ Nie **zapełniaj kontekstu** niepotrzebnie (każda wiadomość = dodatkowe tokeny)

#### Promptowanie

- ❌ Nie zaniedbuj **polecenia i kontekstu** na rzecz "upiększania" roli
- ❌ Nie przyjmuj **pierwszego "sensownego" rozwiązania** (eksploruj opcje)
- ❌ Nie przechodź **od razu do implementacji** bez planu (patrz: sekcja 5.4)
- ❌ Nie pozwól AI być **"potakiwaczem"** (użyj technik anti-bias)

#### Kontekst

- ❌ Nie zapisuj **całej dokumentacji** w CLAUDE.md (tylko essentials)
- ❌ Nie ignoruj **context rot/drift** (długie konwersacje tracą jakość)
- ❌ Nie **zaśmiecaj kontekstu** (stare wiadomości = marnowanie tokenów)
- ❌ Nie próbuj **"wpakować" całego projektu** (referencje @ zamiast wklejania)

#### Konwersacje

- ❌ Nie trwaj **zbyt długo** przy problematycznej konwersacji (sunk cost fallacy)
- ❌ Nie **obciążaj winą AI** (często problem w komunikacji lub kontekście)
- ❌ Nie **resetuj bez podsumowania** (tracisz wiedzę z problematycznej sesji)
- ❌ Nie **ignoruj wzorców** w problemach (jeśli często resetujesz → ulepsz workflow)

#### Bezpieczeństwo

- ❌ Nie commituj **.env, sekretów** (deny w permissions)
- ❌ Nie udostępniaj **kluczy API** w promptach (hook validation)
- ❌ Nie wyłączaj **wszystkich uprawnień** (bypassPermissions tylko w sandbox!)

### 8.3 Checklist przed rozpoczęciem projektu

```
#### Środowisko

- [ ] Wybrany **model Koder** (codzienne zadania)
  - Rekomendacje: Claude Sonnet 4.5 Thinking, GPT-5-Codex (SOTA) | Grok Code Fast 1 (budżet)
- [ ] Wybrany **model Architekt** (planowanie, złożone problemy)
  - Rekomendacje: Gemini 2.5 Pro, GPT-5-Medium/High (SOTA) | Grok 4 Fast Reasoning (budżet)
- [ ] Zrozumiany **model rozliczeń** (Flat Rate vs Usage-based)
- [ ] Ustalony **budżet miesięczny** na AI ($20-100 dla indywidualnego developera)

#### Konfiguracja narzędzi

- [ ] Utworzony **plik kontekstu projektu** (np. CLAUDE.md / Cursor Rules - zwięzły! 50-200 linii)
  - Tech stack
  - Build instructions
  - Code conventions
  - Common commands
- [ ] Zablokowane **wrażliwe pliki** (.env, secrets/**) w narzędziu AI

#### Workflow

- [ ] Plan **komunikacji:** język (polski vs angielski)
  - Flat Rate → dowolny
  - Usage-based → rozważ angielski
- [ ] Strategia **promptowania** (Meta-Prompting, Metoda Sokratejska, planowanie zadań - patrz sekcja 5)
- [ ] Plan **zarządzania kontekstem**
  - Resetuj kontekst po zakończeniu feature/etapu
  - Regularnie monitoruj wykorzystanie kontekstu
- [ ] Zasada **rozbijania zadań**
  - Kryterium: zadanie implementowalne bez dodatkowych decyzji
  - Wielkość: 30-60 min pracy

#### Bezpieczeństwo

- [ ] Wyłączone **"Help improve Claude"** (jeśli prywatny kod)
  - Settings → Privacy → Turn off improvement opt-in
- [ ] Świadomość **przechowywania** (30 dni dla abuse detection nawet po wyłączeniu)
- [ ] **.env w .gitignore**
- [ ] Klucze API w **bezpiecznym miejscu** (nie w repo, nie w promptach)
  - Używaj environment variables
  - Dla testów: .env.example (bez wartości)

#### Wiedza

- [ ] Przeczytany **general-guidelines.md** 😉
- [ ] Znajomość **technik promptowania**
  - 5 elementów prompta (Polecenie > Kontekst > Format > Rola > Przykłady)
  - Meta-Prompting (AI ulepsza prompty)
  - Metoda Sokratejska (AI zadaje pytania)
- [ ] Znajomość **technik anti-bias**
  - Adwokat diabła, Pre-Mortem, Porównanie alternatyw, Zmiana perspektyw, Nieznane niewiadome
- [ ] Umiejętność **ratowania problematycznych konwersacji**
  - Rozpoznawanie sygnałów
  - Zasada "trzech prób"
  - Podsumowanie przed resetem
```

---

## 9. Zasoby i narzędzia

### 9.1 Prompt Library

**10xRules.ai Prompt Library**
- URL: https://10xrules.ai/prompts
- Dostęp przez zaproszenie: [Link](https://10xrules.ai/invites/hRumK9NKNSgkEuKYojXj_bzYfmqhFKFPW5SJ7StqygQ)
- Zawiera wszystkie prompty z modułów 2-5 10xDevs
- Kategoryzowane: Planning, Coding, Debugging, Learning, Documentation
- Możliwość kopiowania i adaptacji do własnych projektów

### 9.2 MVP Tracker

**10x-mvp-tracker**
- Repository: https://github.com/przeprogramowani/10x-mvp-tracker
- MCP server do automatycznej oceny statusu projektu
- Rekomendowany model: grok-code-fast-1 (ekonomiczny, wystarczająca jakość)

**Użycie:**
```
"Check status of my project. Use 10x-mvp-tracker MCP tool"
```

**Co analizuje:**
- Postęp implementacji features
- Coverage testów
- Dokumentacja
- Code quality metrics
- Gotowość do deployment

### 9.3 Przydatne linki

#### Dokumentacje narzędzi

- **Claude Code Docs:** https://docs.claude.com/en/docs/claude-code/overview
- **Cursor Docs:** https://docs.cursor.com/
- **GitHub Copilot Docs:** https://docs.github.com/en/copilot
- **Aider Docs:** https://aider.chat/docs/

#### Rankingi i porównania

- **OpenRouter Rankings Programming:** https://openrouter.ai/rankings/programming?view=month
- **LM Arena:** https://lmarena.ai/
- **LM Arena WebDev Leaderboard:** https://lmarena.ai/leaderboard/webdev

#### Benchmarki (z ostrożnością!)

- **LiveBench:** https://livebench.ai/
- **SWE Bench:** https://www.swebench.com/
- **GPQA Diamond:** https://arxiv.org/abs/2311.12022

#### Społeczności i zasoby

- **Awesome Claude Code:** https://github.com/hesreallyhim/awesome-claude-code
  - Curated list: tips, tricks, examples, integrations
- **Claude Code Templates:** https://github.com/davila7/claude-code-templates
  - Gotowe szablony dla popularnych stacków
- **SuperClaude Framework:** https://github.com/SuperClaude-Org/SuperClaude_Framework
  - Advanced patterns dla Claude-based automation
- **OpenRouter:** https://openrouter.ai/
  - Zunifikowany endpoint dla wielu modeli

---

## Changelog

- **2025-11-16 (v1.2):** Standaryzacja formatowania
  - Usunięto emoji z nagłówków sekcji (zgodnie z wytycznymi planu ujednolicenia)
  - Zaktualizowano anchor links w spisie treści (sekcje 8.1, 8.2)
  - Usunięto gwiazdki (⭐) z nagłówków hierarchii ważności w sekcji 4.1
  - Usunięto emoji (✅ ❌) z nagłówków DO/DON'T w sekcji 7.4
  - Emoji zachowane w treści sekcji (nie w nagłówkach) dla lepszej czytelności i SEO
- **2025-01-16 (v1.1):** Restrukturyzacja dokumentu
  - Połączono rozdziały 2 i 10 (Wybór modelu AI + Ocena i wybór modeli)
  - Usunięto rozdziały 8 (Narzędzia wizualizacji) i 9 (Workflow z AI w terminalu)
  - Zaktualizowano Best Practices i spis treści
  - Struktura: 9 rozdziałów (było 12)
- **2025-01-16 (v1.0):** Wersja 1.0 - Pełna implementacja dokumentu na podstawie planu
  - Wszystkie 12 sekcji z pełną treścią
  - Przykłady, tabele, diagramy
  - Best practices i checklist
  - Zasoby i linki

---

## Feedback i updates

Ten dokument będzie aktualizowany w miarę pojawiania się nowych narzędzi, modeli i best practices.

**Sugestie ulepszeń:** Otwórz issue w repozytorium kursu lub skontaktuj się z zespołem Przeprogramowani.

**Ostatnia aktualizacja rekomendacji modeli:** Październik 2025