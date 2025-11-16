# Plan refaktoryzacji nazwy tabeli: monthly_conditions → monthly_advances (DEV)

## Cel
Zmiana nazwy tabeli bazy danych z `monthly_conditions` na `monthly_advances` oraz wszystkich powiązanych referencji, aby kod bazy danych był spójny z nową terminologią "Zaliczki miesięczne".

## Podejście (Development Environment)
Ponieważ nie jesteśmy jeszcze na produkcji, **edytujemy istniejące migracje** zamiast tworzyć nowe. Po edycji resetujemy lokalną bazę danych.

## Zakres zmian

### 1. Migracje bazy danych - EDYCJA ISTNIEJĄCYCH

#### 1.1 Plik: `20251019120000_create_initial_schema.sql`
Zmienić:
- Nazwę tabeli `monthly_conditions` → `monthly_advances`
- Wszystkie referencje w komentarzach
- Nazwy constraintów i indexów zawierających "monthly_conditions"
- Nazwę triggera `update_monthly_conditions_updated_at`
- **UWAGA**: Kolumna `monthly_conditions_id` w `reports` została usunięta w późniejszej migracji, więc ta zmiana nie dotyczy tego pliku

#### 1.2 Plik: `20251019120100_create_rls_policies.sql`
Zmienić:
- Nazwy polityk RLS (wszystkie z "monthly_conditions" → "monthly_advances")
- Referencje do tabeli w `on monthly_conditions` → `on monthly_advances`
- Komentarze

#### 1.3 Plik: `20251111120000_refactor_to_base_final_months.sql`
Zmienić:
- Komentarz wspominający `monthly_conditions_id` (linia 16)
- **Uwaga**: Ta migracja usuwa kolumnę `monthly_conditions_id`, więc zaktualizujemy tylko komentarze

### 2. Seed data

#### 2.1 Plik: `supabase/seed.sql`
Zmienić:
- `TRUNCATE TABLE monthly_conditions` → `monthly_advances`
- `INSERT INTO monthly_conditions` → `INSERT INTO monthly_advances`
- Komentarze "Monthly Conditions" → "Monthly Advances"
- Nazwy zmiennych w skryptach PL/pgSQL (`monthly_conditions_count`)

### 3. Reset bazy danych
```bash
supabase db reset
```
To usunie dane, zastosuje wszystkie migracje od nowa i uruchomi seed.sql

### 4. Typy TypeScript (Supabase)

#### 4.1 Regeneracja typów
```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

#### 4.2 Aktualizacja src/types.ts
Zmienić:
- `type MonthlyAdvanceRow = Tables<"monthly_advances">;` (było `"monthly_conditions"`)

### 3. Kod aplikacji

#### 3.1 Serwisy
Pliki do sprawdzenia/aktualizacji:
- `src/lib/services/MonthlyAdvanceService.ts` - sprawdzić czy bezpośrednio odwołuje się do nazwy tabeli
- Inne serwisy, które mogą robić JOIN z monthly_conditions

#### 3.2 Zapytania SQL w kodzie
Przeszukać całą bazę kodu pod kątem:
```bash
grep -r "monthly_conditions" src/ --include="*.ts" --include="*.tsx"
```

Miejsca wymagające aktualizacji:
- Bezpośrednie zapytania SQL (jeśli istnieją)
- Supabase client queries z nazwami tabel
- Komentarze odnoszące się do starych nazw

#### 3.3 Nazwa kolumny monthly_conditions_id → monthly_advances_id
Przeszukać referencje do:
- `monthlyConditionsId` w DTO/typach
- `monthly_conditions_id` w zapytaniach

### 4. Testy

#### 4.1 Testy jednostkowe
Sprawdzić czy testy nie używają bezpośrednio nazw tabel:
- `src/lib/services/__tests__/MonthlyAdvanceService.test.ts`
- `src/pages/api/v1/monthly-advances/__tests__/monthly-advances.routes.test.ts`

#### 4.2 Testy integracyjne
Jeśli istnieją testy integracyjne z prawdziwą bazą, będą wymagały aktualizacji setup/teardown.

### 5. Dokumentacja

#### 5.1 Pliki dokumentacji do aktualizacji
- `.ai/db-plan.md` - zmienić nazwę tabeli na `monthly_advances`
- `.ai/database_planning_conversation_summary.md` - zaktualizować odniesienia
- `.ai/database-schema-creation.md` - jeśli zawiera schemat
- Wszelkie diagramy lub opisy relacji

### 6. Polityki RLS

Sprawdzić i zaktualizować w migracji:
```sql
-- Example: Update RLS policies
DROP POLICY IF EXISTS "monthly_conditions_tenant_select" ON monthly_advances;
CREATE POLICY "monthly_advances_tenant_select" ON monthly_advances
  FOR SELECT
  USING (property_id = ANY (current_property_ids()));

-- Podobnie dla wszystkich innych polityk
```

### 7. Funkcje bazodanowe

Sprawdzić czy istnieją funkcje PostgreSQL/PL/pgSQL, które:
- Odwołują się do tabeli `monthly_conditions`
- Używają kolumn `monthly_conditions_id`
- Wymagają aktualizacji

### 8. Indeksy i constrainty

Po renaming sprawdzić czy wszystkie indeksy i ograniczenia zostały prawidłowo przeniesione:
```sql
-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'monthly_advances';

-- Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'monthly_advances'::regclass;
```

## Kolejność wykonania

1. ✅ **Przygotowanie**
   - Backup bazy danych (jeśli produkcja)
   - Utworzenie brancha git: `feat/rename-monthly-conditions-table`

2. **Analiza**
   - Przeszukanie wszystkich plików pod kątem referencji
   - Identyfikacja wszystkich miejsc wymagających zmian
   - Lista zależności (foreign keys, functions, policies)

3. **Migracja bazy danych**
   - Utworzenie pliku migracji SQL
   - Test migracji na lokalnej bazie Supabase
   - Weryfikacja że wszystkie constrainty działają

4. **Regeneracja typów**
   - Uruchomienie generatora typów Supabase
   - Commit nowych typów

5. **Aktualizacja kodu**
   - Zmiana wszystkich referencji w kodzie aplikacji
   - Aktualizacja testów
   - Fix lintów

6. **Testy**
   - Uruchomienie wszystkich testów jednostkowych
   - Testy integracyjne (jeśli istnieją)
   - Manualne testy UI

7. **Dokumentacja**
   - Aktualizacja plików w `.ai/`
   - README jeśli zawiera odniesienia do schematu

8. **Deploy**
   - Push zmian
   - Weryfikacja w środowisku testowym
   - Deploy do produkcji (z planem rollback)

## Ryzyko i mitygacja

### Ryzyko 1: Utrata danych podczas migracji
**Mitygacja:** 
- Backup przed migracją
- Test na kopii bazy
- `ALTER TABLE RENAME` jest bezpieczne i atomowe

### Ryzyko 2: Broken references w kodzie
**Mitygacja:**
- Comprehensive grep/search
- Testy jednostkowe i integracyjne
- TypeScript type checking pomoże wyłapać problemy

### Ryzyko 3: RLS policies mogą przestać działać
**Mitygacja:**
- Dokładne sprawdzenie wszystkich polityk
- Test z różnymi rolami (tenant/admin)
- Weryfikacja dostępu do danych

### Ryzyko 4: Downtime podczas deploy
**Mitygacja:**
- Blue-green deployment jeśli możliwe
- Migracja jest szybka (rename table)
- Plan rollback gotowy

## Rollback plan

Jeśli coś pójdzie nie tak:

1. **Rollback migracji bazy:**
```sql
ALTER TABLE monthly_advances RENAME TO monthly_conditions;
ALTER TABLE reports 
  RENAME COLUMN monthly_advances_id TO monthly_conditions_id;
-- Przywrócenie polityk RLS do poprzedniego stanu
```

2. **Rollback kodu:**
```bash
git revert <commit-hash>
```

3. **Regeneracja typów ze starej struktury**

## Checklist przed rozpoczęciem

- [ ] Backup bazy danych utworzony
- [ ] Branch git utworzony
- [ ] Wszystkie obecne testy przechodzą
- [ ] Plan rollback przygotowany
- [ ] Czas na wykonanie zaplanowany (poza godzinami szczytu jeśli produkcja)

## Szacowany czas wykonania

- Analiza i przygotowanie: 30 min
- Utworzenie migracji: 45 min
- Aktualizacja kodu: 1-2 godz.
- Testy: 1 godz.
- Dokumentacja: 30 min
- **Razem: ~4 godziny**

