import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrewLab } from "@/components/BrewLab";

describe("BrewLab", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("beregner vannmengden når metode og kaffemengde endres", () => {
    render(<BrewLab />);

    expect(screen.getByText("288")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /espresso/i }));
    expect(screen.getByText("36")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: /hvor mye kaffe/i }), {
      target: { value: "20" },
    });
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("justerer vannmengden med ønsket bryggestyrke", () => {
    render(<BrewLab />);

    fireEvent.change(screen.getByRole("slider", { name: /bryggestyrke/i }), {
      target: { value: "80" },
    });

    expect(screen.getByText("230")).toBeInTheDocument();
  });

  it("teller ned og kan pause bryggetimeren", () => {
    vi.useFakeTimers();
    render(<BrewLab />);

    fireEvent.click(screen.getByRole("button", { name: /start timer/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("timer")).toHaveTextContent("02:58");

    fireEvent.click(screen.getByRole("button", { name: /pause timer/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("02:58");
  });

  it("lagrer og kan hente fram favorittoppskriften", () => {
    const { unmount } = render(<BrewLab />);

    fireEvent.click(screen.getByRole("button", { name: /lagre favorittoppskrift/i }));
    unmount();
    render(<BrewLab />);

    fireEvent.click(screen.getByRole("button", { name: /aeropress/i }));
    fireEvent.change(screen.getByRole("slider", { name: /hvor mye kaffe/i }), {
      target: { value: "20" },
    });

    fireEvent.click(screen.getByRole("button", { name: /bruk favorittoppskrift/i }));

    expect(screen.getByRole("button", { name: /aeropress/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("slider", { name: /hvor mye kaffe/i })).toHaveValue("18");
    expect(screen.getByText("288")).toBeInTheDocument();
  });
});
