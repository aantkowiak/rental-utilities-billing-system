import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../button";

/**
 * Example React component test
 * Demonstrates Testing Library best practices
 * Environment: jsdom (automatically set by vitest.config.ts)
 */

describe("Button Component", () => {
  it("should render button with text", () => {
    // Arrange & Act
    render(<Button>Click me</Button>);

    // Assert
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("should handle click events using fireEvent.click", () => {
    // Arrange
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    // Act
    const button = screen.getByRole("button", { name: /click me/i });
    fireEvent.click(button);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should render disabled button", () => {
    // Arrange & Act
    render(<Button disabled>Disabled</Button>);

    // Assert
    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it("should apply custom className", () => {
    // Arrange
    const customClass = "custom-button-class";

    // Act
    render(<Button className={customClass}>Custom Button</Button>);

    // Assert
    const button = screen.getByRole("button", { name: /custom button/i });
    expect(button).toHaveClass(customClass);
  });

  it("should render different variants", () => {
    // Arrange & Act
    const { rerender } = render(<Button variant="default">Default</Button>);

    // Assert default
    let button = screen.getByRole("button", { name: /default/i });
    expect(button).toBeInTheDocument();

    // Act - rerender with different variant
    rerender(<Button variant="destructive">Destructive</Button>);

    // Assert destructive
    button = screen.getByRole("button", { name: /destructive/i });
    expect(button).toBeInTheDocument();
  });
});

