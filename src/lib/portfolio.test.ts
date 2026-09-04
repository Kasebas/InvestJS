import { describe, expect, it } from "vitest";
import { applyTransaction, recalculatePortfolio } from "./portfolio";

const position = { symbol: "META", quantity: 10, price: 100, invested: 1_000 };

describe("applyTransaction", () => {
    it("creates a position from the first purchase", () => {
        const result = applyTransaction([], {
            type: "Compra",
            symbol: "AAPL",
            quantity: 2,
            amount: 400,
        });

        expect("positions" in result && result.positions[0]).toEqual({
            symbol: "AAPL",
            quantity: 2,
            price: 200,
            invested: 400,
        });
    });

    it("adds a purchase to quantity and invested capital", () => {
        const result = applyTransaction([position], {
            type: "Compra",
            symbol: "META",
            quantity: 5,
            amount: 600,
        });

        expect("positions" in result && result.positions[0]).toMatchObject({
            quantity: 15,
            invested: 1_600,
        });
    });

    it("removes a partial sale at the average cost", () => {
        const result = applyTransaction([position], {
            type: "Venta",
            symbol: "META",
            quantity: 4,
            amount: 520,
        });

        expect("positions" in result && result.positions[0]).toMatchObject({
            quantity: 6,
            invested: 600,
        });
    });

    it("adds commissions to invested capital", () => {
        const result = applyTransaction([position], {
            type: "Comisión",
            symbol: "META",
            quantity: 0,
            amount: 8,
        });

        expect("positions" in result && result.positions[0].invested).toBe(1_008);
    });

    it("rejects a sale larger than the current holding", () => {
        const result = applyTransaction([position], {
            type: "Venta",
            symbol: "META",
            quantity: 11,
            amount: 1_430,
        });

        expect(result).toEqual({
            error: "No puedes vender más de 10 unidades de META.",
        });
    });
});

describe("recalculatePortfolio", () => {
    it("replays transactions in date order", () => {
        const result = recalculatePortfolio([], [
            { id: 2, date: "2026-02-01", type: "Compra", symbol: "META", quantity: 2, amount: 220 },
            { id: 1, date: "2026-01-01", type: "Compra", symbol: "META", quantity: 3, amount: 270 },
            { id: 3, date: "2026-03-01", type: "Venta", symbol: "META", quantity: 1, amount: 120 },
        ]);

        expect("error" in result ? result : result[0]).toMatchObject({ quantity: 4, invested: 392 });
    });

    it("removes a deleted transaction from the result", () => {
        const result = recalculatePortfolio([], [
            { id: 1, date: "2026-01-01", type: "Compra", symbol: "META", quantity: 3, amount: 300 },
        ]);

        expect("error" in result ? result : result[0]).toMatchObject({ quantity: 3, invested: 300 });
    });

    it("does not restore a transaction-based position when its history is empty", () => {
        const result = recalculatePortfolio([
            { ...position, isTransactionBased: true },
        ], []);

        expect(result).toEqual([]);
    });

    it("keeps a manually managed position without transactions", () => {
        const result = recalculatePortfolio([position], []);

        expect(result).toEqual([position]);
    });
});
