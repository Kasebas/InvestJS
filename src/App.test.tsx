import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const storage = vi.hoisted(() => ({
  createVault: vi.fn().mockResolvedValue(undefined),
  deleteVault: vi.fn().mockResolvedValue(undefined),
  hasVault: vi.fn(),
  saveVault: vi.fn().mockResolvedValue(undefined),
  unlockVault: vi.fn(),
}));

vi.mock("./lib/secureStorage", () => storage);
vi.mock("recharts", () => {
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    ResponsiveContainer: Container,
    AreaChart: passthrough,
    CartesianGrid: passthrough,
    Cell: () => null,
    Pie: passthrough,
    PieChart: passthrough,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Area: () => null,
  };
});

const unlockDashboard = async () => {
  render(<App />);
  const password = await screen.findByLabelText("Crea una contraseña local");
  fireEvent.change(password, { target: { value: "password-segura" } });
  fireEvent.click(screen.getByRole("button", { name: "Crear bóveda" }));
  await screen.findByRole("heading", { name: "Buenos días, Kaseb" });
};

describe("InvestJS dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.hasVault.mockResolvedValue(false);
  });

  it("creates a local vault before showing the dashboard", async () => {
    await unlockDashboard();
    expect(storage.createVault).toHaveBeenCalledOnce();
    expect(screen.getByText("Añadir inversión")).toBeInTheDocument();
  });

  it("registers the first purchase and renders the new position", async () => {
    await unlockDashboard();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Registrar operación" })[0],
    );
    fireEvent.change(screen.getByLabelText("Símbolo"), {
      target: { value: "AAPL" },
    });
    fireEvent.change(screen.getByLabelText("Cantidad"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Importe"), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar operación" }));
    await waitFor(() =>
      expect(screen.getAllByText("AAPL").length).toBeGreaterThan(0),
    );
    expect(storage.saveVault).toHaveBeenCalled();
  });
});
