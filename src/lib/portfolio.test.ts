import { describe, expect, it } from "vitest";
import { applyTransaction } from "./portfolio";

const position = { symbol: "META", quantity: 10, price: 100, invested: 1_000 };

describe("applyTransaction", () => {
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
