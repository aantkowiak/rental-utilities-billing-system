# Database Scripts

Zbiór skryptów do zarządzania bazą danych Supabase w środowisku lokalnym.

## Dostępne skrypty

### `seed-db.sh`

Resetuje lokalną bazę danych Supabase i ładuje dane testowe.

**Użycie:**
```bash
npm run db:seed
```

**Co robi skrypt:**
1. Sprawdza czy Supabase CLI jest zainstalowane
2. Sprawdza czy Supabase jest uruchomiony (jeśli nie, uruchamia)
3. Resetuje bazę danych (kasuje wszystkie dane)
4. Aplikuje wszystkie migracje z `supabase/migrations/`
5. Ładuje dane testowe z `supabase/seed.sql`

**Dane testowe:**

Skrypt tworzy:
- 3 properties (nieruchomości)
- 3 użytkowników (1 admin, 2 tenants)
- 2 kontrakty
- Monthly conditions dla ostatnich 13 miesięcy
- Historyczne odczyty liczników za ostatni rok
- Przykładowy admin replacement reading

**Konta testowe:**
- Admin: `admin@example.com` / `password123`
- Tenant 1: `tenant1@example.com` / `password123`
- Tenant 2: `tenant2@example.com` / `password123`

**Wymagania:**
- Zainstalowane Supabase CLI (`npm install -g supabase` lub `brew install supabase/tap/supabase`)
- Uruchomiony Docker (wymagany przez Supabase)

## Struktura danych testowych

### Properties
- **Apartment A - Downtown** - nieruchomość w centrum
- **Apartment B - Suburbs** - nieruchomość na przedmieściach  
- **House C - Riverside** - dom nad rzeką

### Odczyty (Readings)
Dla każdej nieruchomości generowane są:
- **Baseline reading** - odczyt bazowy sprzed 13 miesięcy
- **Regularne miesięczne odczyty** - odczyty na koniec każdego miesiąca (25-28 dzień)
- Realistyczne wartości zużycia:
  - Zimna woda: 8-15 m³/miesiąc
  - Ciepła woda: 4-8 m³/miesiąc
  - Ogrzewanie: 1-7 GJ/miesiąc (wyższe zimą, niższe latem)

### Monthly Conditions
Dla każdej nieruchomości przez ostatnie 13 miesięcy:
- Opłata zarządcy: 150-200 PLN
- Cena zimnej wody: 5.50-7.50 PLN/m³
- Cena ciepłej wody z c.o.: 25-35 PLN/m³
- Cena ogrzewania: 180-220 PLN/GJ
- Zaliczka: 800-1200 PLN

## Inne przydatne komendy Supabase

```bash
# Uruchom Supabase lokalnie
supabase start

# Zatrzymaj Supabase
supabase stop

# Status Supabase
supabase status

# Reset bazy bez seedowania
supabase db reset --no-seed

# Otwórz Supabase Studio
open http://127.0.0.1:54323
```

## Troubleshooting

### Błąd: "Supabase CLI is not installed"
Zainstaluj Supabase CLI:
```bash
npm install -g supabase
# lub
brew install supabase/tap/supabase
```

### Błąd: "Docker is not running"
Uruchom Docker Desktop przed wykonaniem skryptu.

### Błąd: "Connection refused"
Sprawdź czy Supabase jest uruchomiony:
```bash
supabase status
```

Jeśli nie, uruchom:
```bash
supabase start
```

