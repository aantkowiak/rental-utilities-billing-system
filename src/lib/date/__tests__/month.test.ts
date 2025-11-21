import { describe, it, expect } from "vitest";
import {
  toYearMonth,
  yearMonthToDate,
  yearMonthToISODate,
  isoDateToYearMonth,
  getCurrentYearMonth,
  addMonths,
  compareYearMonths,
  isValidYearMonth,
  formatYearMonthLabel,
  getAllowedMonths,
  type YearMonth,
} from "../month";

describe("toYearMonth", () => {
  it("should convert a Date to YYYY-MM format", () => {
    const date = new Date(Date.UTC(2024, 5, 15)); // June 15, 2024
    expect(toYearMonth(date)).toBe("2024-06");
  });

  it("should handle January correctly", () => {
    const date = new Date(Date.UTC(2024, 0, 1));
    expect(toYearMonth(date)).toBe("2024-01");
  });

  it("should handle December correctly", () => {
    const date = new Date(Date.UTC(2024, 11, 31));
    expect(toYearMonth(date)).toBe("2024-12");
  });

  it("should zero-pad single-digit months", () => {
    const date = new Date(Date.UTC(2024, 2, 10)); // March
    expect(toYearMonth(date)).toBe("2024-03");
  });

  it("should handle year boundaries correctly", () => {
    const date = new Date(Date.UTC(2023, 11, 31)); // December 31, 2023
    expect(toYearMonth(date)).toBe("2023-12");
  });

  it("should use UTC time zone", () => {
    // Create a date at end of day in a different timezone
    // that might be next day in UTC
    const date = new Date(Date.UTC(2024, 5, 30, 23, 59, 59));
    expect(toYearMonth(date)).toBe("2024-06");
  });
});

describe("yearMonthToDate", () => {
  it("should convert YYYY-MM to Date object at first day of month", () => {
    const result = yearMonthToDate("2024-06");
    expect(result).toEqual(new Date(Date.UTC(2024, 5, 1, 0, 0, 0, 0)));
  });

  it("should handle January correctly", () => {
    const result = yearMonthToDate("2024-01");
    expect(result).toEqual(new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)));
  });

  it("should handle December correctly", () => {
    const result = yearMonthToDate("2024-12");
    expect(result).toEqual(new Date(Date.UTC(2024, 11, 1, 0, 0, 0, 0)));
  });

  it("should create date in UTC timezone", () => {
    const result = yearMonthToDate("2024-06");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("should throw error for invalid format without dash", () => {
    expect(() => yearMonthToDate("202406")).toThrow("Invalid YearMonth format: 202406. Expected YYYY-MM.");
  });

  it("should throw error for invalid format with wrong year length", () => {
    expect(() => yearMonthToDate("24-06")).toThrow("Invalid YearMonth format: 24-06. Expected YYYY-MM.");
  });

  it("should throw error for invalid month 00", () => {
    expect(() => yearMonthToDate("2024-00")).toThrow("Invalid month in YearMonth: 2024-00. Month must be 01-12.");
  });

  it("should throw error for invalid month 13", () => {
    expect(() => yearMonthToDate("2024-13")).toThrow("Invalid month in YearMonth: 2024-13. Month must be 01-12.");
  });

  it("should throw error for invalid month 99", () => {
    expect(() => yearMonthToDate("2024-99")).toThrow("Invalid month in YearMonth: 2024-99. Month must be 01-12.");
  });

  it("should handle leap year February", () => {
    const result = yearMonthToDate("2024-02");
    expect(result).toEqual(new Date(Date.UTC(2024, 1, 1, 0, 0, 0, 0)));
  });
});

describe("yearMonthToISODate", () => {
  it("should convert YYYY-MM to ISO date string (YYYY-MM-01)", () => {
    expect(yearMonthToISODate("2024-06")).toBe("2024-06-01");
  });

  it("should handle January correctly", () => {
    expect(yearMonthToISODate("2024-01")).toBe("2024-01-01");
  });

  it("should handle December correctly", () => {
    expect(yearMonthToISODate("2024-12")).toBe("2024-12-01");
  });

  it("should throw error for invalid format (delegates to yearMonthToDate)", () => {
    expect(() => yearMonthToISODate("2024-13")).toThrow("Invalid month in YearMonth");
  });

  it("should always return first day of month", () => {
    const result = yearMonthToISODate("2024-06");
    expect(result.endsWith("-01")).toBe(true);
  });
});

describe("isoDateToYearMonth", () => {
  it("should extract YYYY-MM from ISO date string", () => {
    expect(isoDateToYearMonth("2024-06-15")).toBe("2024-06");
  });

  it("should handle first day of month", () => {
    expect(isoDateToYearMonth("2024-06-01")).toBe("2024-06");
  });

  it("should handle last day of month", () => {
    expect(isoDateToYearMonth("2024-06-30")).toBe("2024-06");
  });

  it("should handle ISO datetime with time component", () => {
    expect(isoDateToYearMonth("2024-06-15T12:30:00Z")).toBe("2024-06");
  });

  it("should handle ISO datetime with full timestamp", () => {
    expect(isoDateToYearMonth("2024-06-15T12:30:00.123Z")).toBe("2024-06");
  });

  it("should throw error for invalid format (US date)", () => {
    expect(() => isoDateToYearMonth("06/15/2024")).toThrow("Invalid ISO date format: 06/15/2024");
  });

  it("should throw error for invalid format (non-date string)", () => {
    expect(() => isoDateToYearMonth("not-a-date")).toThrow("Invalid ISO date format: not-a-date");
  });

  it("should throw error for empty string", () => {
    expect(() => isoDateToYearMonth("")).toThrow("Invalid ISO date format: ");
  });
});

describe("getCurrentYearMonth", () => {
  it("should return a valid YearMonth format", () => {
    const result = getCurrentYearMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it("should return current month that is valid", () => {
    const result = getCurrentYearMonth();
    expect(isValidYearMonth(result)).toBe(true);
  });

  it("should return month within reasonable range", () => {
    const result = getCurrentYearMonth();
    const [year, month] = result.split("-").map(Number);
    const currentYear = new Date().getUTCFullYear();

    expect(year).toBeGreaterThanOrEqual(currentYear - 1);
    expect(year).toBeLessThanOrEqual(currentYear + 1);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });
});

describe("addMonths", () => {
  it("should add positive months", () => {
    expect(addMonths("2024-06", 3)).toBe("2024-09");
  });

  it("should handle zero months (identity)", () => {
    expect(addMonths("2024-06", 0)).toBe("2024-06");
  });

  it("should subtract months with negative value", () => {
    expect(addMonths("2024-06", -3)).toBe("2024-03");
  });

  it("should cross year boundary forward", () => {
    expect(addMonths("2024-10", 5)).toBe("2025-03");
  });

  it("should cross year boundary backward", () => {
    expect(addMonths("2024-03", -5)).toBe("2023-10");
  });

  it("should add exactly 12 months (one year)", () => {
    expect(addMonths("2024-06", 12)).toBe("2025-06");
  });

  it("should add 1 month from December to January next year", () => {
    expect(addMonths("2024-12", 1)).toBe("2025-01");
  });

  it("should subtract 1 month from January to December previous year", () => {
    expect(addMonths("2024-01", -1)).toBe("2023-12");
  });

  it("should handle multiple year spans forward", () => {
    expect(addMonths("2024-06", 30)).toBe("2026-12");
  });

  it("should handle multiple year spans backward", () => {
    expect(addMonths("2024-06", -30)).toBe("2021-12");
  });

  it("should handle February edge cases", () => {
    // Adding months from January should work correctly
    expect(addMonths("2024-01", 1)).toBe("2024-02");
    expect(addMonths("2024-01", 13)).toBe("2025-02");
  });

  it("should preserve first-day-of-month semantics", () => {
    // Business rule: billing always starts on first day of month
    const result = addMonths("2024-06", 3);
    const date = yearMonthToDate(result);
    expect(date.getUTCDate()).toBe(1);
  });
});

describe("compareYearMonths", () => {
  it("should return negative when a < b", () => {
    const result = compareYearMonths("2024-06", "2024-07");
    expect(result).toBeLessThan(0);
  });

  it("should return positive when a > b", () => {
    const result = compareYearMonths("2024-07", "2024-06");
    expect(result).toBeGreaterThan(0);
  });

  it("should return 0 when months are equal", () => {
    expect(compareYearMonths("2024-06", "2024-06")).toBe(0);
  });

  it("should handle year boundaries (earlier year < later year)", () => {
    const result = compareYearMonths("2023-12", "2024-01");
    expect(result).toBeLessThan(0);
  });

  it("should handle year boundaries (later year > earlier year)", () => {
    const result = compareYearMonths("2024-01", "2023-12");
    expect(result).toBeGreaterThan(0);
  });

  it("should handle same month different years", () => {
    const result = compareYearMonths("2023-06", "2024-06");
    expect(result).toBeLessThan(0);
  });

  it("should work for sorting arrays", () => {
    const months: YearMonth[] = ["2024-03", "2024-01", "2023-12", "2024-02"];
    const sorted = months.sort(compareYearMonths);
    expect(sorted).toEqual(["2023-12", "2024-01", "2024-02", "2024-03"]);
  });
});

describe("isValidYearMonth", () => {
  it("should return true for valid format", () => {
    expect(isValidYearMonth("2024-06")).toBe(true);
  });

  it("should return true for January", () => {
    expect(isValidYearMonth("2024-01")).toBe(true);
  });

  it("should return true for December", () => {
    expect(isValidYearMonth("2024-12")).toBe(true);
  });

  it("should return false for month 00", () => {
    expect(isValidYearMonth("2024-00")).toBe(false);
  });

  it("should return false for month 13", () => {
    expect(isValidYearMonth("2024-13")).toBe(false);
  });

  it("should return false for month 99", () => {
    expect(isValidYearMonth("2024-99")).toBe(false);
  });

  it("should return false for format without dash", () => {
    expect(isValidYearMonth("202406")).toBe(false);
  });

  it("should return false for format with day included", () => {
    expect(isValidYearMonth("2024-06-15")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidYearMonth("")).toBe(false);
  });

  it("should return false for partial format", () => {
    expect(isValidYearMonth("2024-")).toBe(false);
  });

  it("should return false for wrong separator", () => {
    expect(isValidYearMonth("2024/06")).toBe(false);
  });

  it("should return false for non-zero-padded month", () => {
    expect(isValidYearMonth("2024-6")).toBe(false);
  });

  it("should return true for year 0000 (edge case)", () => {
    expect(isValidYearMonth("0000-06")).toBe(true);
  });

  it("should return true for year 9999 (edge case)", () => {
    expect(isValidYearMonth("9999-12")).toBe(true);
  });
});

describe("formatYearMonthLabel", () => {
  it("should format month in Polish locale", () => {
    const result = formatYearMonthLabel("2024-06");
    expect(result).toBe("czerwiec 2024");
  });

  it("should format January in Polish", () => {
    const result = formatYearMonthLabel("2024-01");
    expect(result).toBe("styczeń 2024");
  });

  it("should format December in Polish", () => {
    const result = formatYearMonthLabel("2024-12");
    expect(result).toBe("grudzień 2024");
  });

  it("should format February in Polish", () => {
    const result = formatYearMonthLabel("2024-02");
    expect(result).toBe("luty 2024");
  });

  it("should format March in Polish", () => {
    const result = formatYearMonthLabel("2024-03");
    expect(result).toBe("marzec 2024");
  });

  it("should use lowercase for month name (Polish convention)", () => {
    const result = formatYearMonthLabel("2024-06");
    expect(result.charAt(0)).toBe(result.charAt(0).toLowerCase());
  });
});

describe("getAllowedMonths", () => {
  it("should return 7 months by default (current + 6 back)", () => {
    const now = new Date(Date.UTC(2024, 5, 15)); // June 15, 2024
    const result = getAllowedMonths(6, now);
    expect(result).toHaveLength(7);
  });

  it("should return months in descending order (newest first)", () => {
    const now = new Date(Date.UTC(2024, 5, 15)); // June 15, 2024
    const result = getAllowedMonths(6, now);

    expect(result[0].token).toBe("2024-06");
    expect(result[1].token).toBe("2024-05");
    expect(result[6].token).toBe("2023-12");
  });

  it("should return only current month when monthsBack is 0", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(0, now);

    expect(result).toHaveLength(1);
    expect(result[0].token).toBe("2024-06");
  });

  it("should return correct structure with token, label, and date", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(1, now);

    expect(result[0]).toHaveProperty("token");
    expect(result[0]).toHaveProperty("label");
    expect(result[0]).toHaveProperty("date");

    expect(typeof result[0].token).toBe("string");
    expect(typeof result[0].label).toBe("string");
    expect(result[0].date).toBeInstanceOf(Date);
  });

  it("should cross year boundary correctly", () => {
    const now = new Date(Date.UTC(2024, 1, 15)); // February 2024
    const result = getAllowedMonths(3, now);

    expect(result).toHaveLength(4);
    expect(result[0].token).toBe("2024-02");
    expect(result[1].token).toBe("2024-01");
    expect(result[2].token).toBe("2023-12");
    expect(result[3].token).toBe("2023-11");
  });

  it("should format labels in Polish locale", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(1, now);

    expect(result[0].label).toBe("czerwiec 2024");
    expect(result[1].label).toBe("maj 2024");
  });

  it("should create dates at first day of month in UTC", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(2, now);

    result.forEach((month) => {
      expect(month.date.getUTCDate()).toBe(1);
      expect(month.date.getUTCHours()).toBe(0);
      expect(month.date.getUTCMinutes()).toBe(0);
      expect(month.date.getUTCSeconds()).toBe(0);
    });
  });

  it("should throw error for negative monthsBack", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    expect(() => getAllowedMonths(-1, now)).toThrow("monthsBack must be a non-negative integer");
  });

  it("should throw error for non-integer monthsBack", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    expect(() => getAllowedMonths(3.5, now)).toThrow("monthsBack must be a non-negative integer");
  });

  it("should throw error for invalid date", () => {
    const invalidDate = new Date("invalid");
    expect(() => getAllowedMonths(6, invalidDate)).toThrow("now must be a valid Date instance");
  });

  it("should throw error for NaN date", () => {
    const nanDate = new Date(NaN);
    expect(() => getAllowedMonths(6, nanDate)).toThrow("now must be a valid Date instance");
  });

  it("should handle business rule: 6 months lookback for billing", () => {
    // Business context: System allows reading historical data up to 6 months
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(6, now);

    expect(result).toHaveLength(7); // current + 6 back
    expect(result[0].token).toBe("2024-06"); // Current month
    expect(result[6].token).toBe("2023-12"); // 6 months back
  });

  it("should normalize now to first day of month", () => {
    // Business rule: All billing happens on first day of month
    // Even if called mid-month, should return months starting from current
    const midMonth = new Date(Date.UTC(2024, 5, 15));
    const endMonth = new Date(Date.UTC(2024, 5, 30));

    const resultMid = getAllowedMonths(2, midMonth);
    const resultEnd = getAllowedMonths(2, endMonth);

    expect(resultMid[0].token).toBe(resultEnd[0].token);
    expect(resultMid).toHaveLength(resultEnd.length);
  });

  it("should handle January with lookback crossing year", () => {
    const now = new Date(Date.UTC(2024, 0, 15)); // January 2024
    const result = getAllowedMonths(2, now);

    expect(result[0].token).toBe("2024-01");
    expect(result[1].token).toBe("2023-12");
    expect(result[2].token).toBe("2023-11");
  });
});

describe("Integration tests - round-trip conversions", () => {
  it("should maintain consistency in round-trip Date -> YearMonth -> Date", () => {
    const original = new Date(Date.UTC(2024, 5, 1, 0, 0, 0, 0));
    const yearMonth = toYearMonth(original);
    const converted = yearMonthToDate(yearMonth);

    expect(converted.getTime()).toBe(original.getTime());
  });

  it("should maintain consistency in YearMonth -> ISO -> YearMonth", () => {
    const original: YearMonth = "2024-06";
    const iso = yearMonthToISODate(original);
    const converted = isoDateToYearMonth(iso);

    expect(converted).toBe(original);
  });

  it("should handle addMonths and compareYearMonths together", () => {
    const base = "2024-06";
    const future = addMonths(base, 3);
    const past = addMonths(base, -3);

    expect(compareYearMonths(past, base)).toBeLessThan(0);
    expect(compareYearMonths(base, future)).toBeLessThan(0);
    expect(compareYearMonths(past, future)).toBeLessThan(0);
  });

  it("should validate that getAllowedMonths returns valid YearMonth tokens", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(6, now);

    result.forEach((month) => {
      expect(isValidYearMonth(month.token)).toBe(true);
    });
  });

  it("should ensure formatYearMonthLabel works with getAllowedMonths", () => {
    const now = new Date(Date.UTC(2024, 5, 15));
    const result = getAllowedMonths(1, now);

    result.forEach((month) => {
      // Label should contain the year as a substring
      expect(month.label).toContain("2024");
      // Label should match what formatYearMonthLabel would return
      expect(month.label).toBe(formatYearMonthLabel(month.token));
    });
  });
});

describe("Edge cases and business rules", () => {
  it("should handle leap year February correctly", () => {
    const leapYearFeb = "2024-02";
    const date = yearMonthToDate(leapYearFeb);

    // Should be Feb 1, 2024
    expect(date.getUTCMonth()).toBe(1);
    expect(date.getUTCDate()).toBe(1);

    // Adding 1 month should go to March
    expect(addMonths(leapYearFeb, 1)).toBe("2024-03");
  });

  it("should handle non-leap year February correctly", () => {
    const nonLeapYearFeb = "2023-02";
    const date = yearMonthToDate(nonLeapYearFeb);

    expect(date.getUTCMonth()).toBe(1);
    expect(date.getUTCDate()).toBe(1);
  });

  it("should handle century boundary (year 2000)", () => {
    expect(isValidYearMonth("2000-01")).toBe(true);
    expect(addMonths("1999-12", 1)).toBe("2000-01");
    expect(addMonths("2000-01", -1)).toBe("1999-12");
  });

  it("should handle millennium boundary (year 1999-2001)", () => {
    const millBefore = "1999-12";
    const millAfter = "2000-01";

    expect(addMonths(millBefore, 1)).toBe(millAfter);
    expect(compareYearMonths(millBefore, millAfter)).toBeLessThan(0);
  });

  it("should preserve UTC timezone in all operations", () => {
    // Critical business rule: All dates must be UTC to avoid timezone issues
    const ym = "2024-06";
    const date = yearMonthToDate(ym);

    expect(date.getTimezoneOffset).toBeDefined();
    // UTC date should be normalized to midnight
    expect(date.getUTCHours()).toBe(0);
  });

  it("should support sorting months for billing reports", () => {
    // Business use case: Display billing history in chronological order
    const months = ["2024-03", "2024-01", "2024-06", "2024-02"];
    const sorted = months.sort(compareYearMonths);

    expect(sorted).toEqual(["2024-01", "2024-02", "2024-03", "2024-06"]);
  });

  it("should ensure first day of month for all billing operations", () => {
    // Business rule: Billing cycles always start on first day of month
    const months = getAllowedMonths(3, new Date(Date.UTC(2024, 5, 15)));

    months.forEach((month) => {
      const iso = yearMonthToISODate(month.token);
      expect(iso.endsWith("-01")).toBe(true);
    });
  });
});
