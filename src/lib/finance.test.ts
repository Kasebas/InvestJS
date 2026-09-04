import { describe, expect, it } from "vitest";
import { calculateMetrics, convertToBase, parseMetaTraderCsv } from "./finance";

describe("finance", () => {
    it("converts USD to EUR using the configured rate", () => {
        expect(convertToBase(100, "USD", "EUR", 0.9)).toBe(90);
    });

    it("calculates realized and unrealized profit separately", () => {
        const metrics = calculateMetrics(
            [{ symbol: "META", quantity: 6, price: 120, invested: 600, currency: "USD" }],
            [
                { id: 1, date: "2026-01-01", symbol: "META", type: "Compra", quantity: 10, amount: 1_000, currency: "USD" },
                { id: 2, date: "2026-02-01", symbol: "META", type: "Venta", quantity: 4, amount: 520, currency: "USD" },
                { id: 3, date: "2026-03-01", symbol: "META", type: "Dividendo", quantity: 0, amount: 20, currency: "USD" },
            ],
            "USD",
            0.9,
        );
        expect(metrics.realized).toBe(120);
        expect(metrics.unrealized).toBe(120);
        expect(metrics.dividends).toBe(20);
    });

    it("parses MetaTrader-style CSV rows", () => {
        const transactions = parseMetaTraderCsv("Date,Symbol,Type,Volume,Profit\n2026-01-01,META,buy,2,400\n2026-02-01,META,sell,1,250");
        expect(transactions).toMatchObject([
            { symbol: "META", type: "Compra", quantity: 2, amount: 400 },
            { symbol: "META", type: "Venta", quantity: 1, amount: 250 },
        ]);
    });
});
