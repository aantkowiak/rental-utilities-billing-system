import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Example unit test for a service/utility function
 * Demonstrates best practices from vitest-unit-testing.md guidelines
 */

// Mock function example
const mockCallback = vi.fn();

describe("Example Service Tests", () => {
  beforeEach(() => {
    // Setup before each test
    mockCallback.mockClear();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  describe("Basic Function Tests", () => {
    it("should execute callback with correct arguments", () => {
      // Arrange
      const testData = { id: 1, name: "Test" };

      // Act
      mockCallback(testData);

      // Assert
      expect(mockCallback).toHaveBeenCalledWith(testData);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should use inline snapshots for complex output", () => {
      // Arrange
      const complexObject = {
        id: 1,
        name: "Test",
        metadata: { created: "2024-01-01" },
      };

      // Assert with inline snapshot
      expect(complexObject).toMatchInlineSnapshot(`
        {
          "id": 1,
          "metadata": {
            "created": "2024-01-01",
          },
          "name": "Test",
        }
      `);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully", () => {
      // Arrange
      const errorFn = vi.fn(() => {
        throw new Error("Test error");
      });

      // Act & Assert
      expect(() => errorFn()).toThrow("Test error");
    });
  });

  describe("Async Operations", () => {
    it("should handle async operations", async () => {
      // Arrange
      const asyncFn = vi.fn().mockResolvedValue({ success: true });

      // Act
      const result = await asyncFn();

      // Assert
      expect(result).toEqual({ success: true });
      expect(asyncFn).toHaveBeenCalled();
    });
  });
});
