import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";

const validBackup = {
    positions: [{ id: 1, symbol: "META", name: "Meta", category: "Acciones", quantity: 2, price: 500, invested: 900, currency: "USD", color: "#d8704f" }],
    transactions: [{ id: 2, date: "2026-09-05", symbol: "META", type: "Compra", quantity: 2, amount: 900, currency: "USD" }],
};

describe("parseBackup", () => {
    it("accepts a valid exported portfolio", () => {
        expect(parseBackup(JSON.stringify(validBackup))).toEqual(validBackup);
    });

    it("rejects malformed position data", () => {
        expect(() => parseBackup(JSON.stringify({ ...validBackup, positions: [{ symbol: "META" }] }))).toThrow("posiciones válidas");
    });

    it("rejects unknown transaction types", () => {
        const invalid = { ...validBackup, transactions: [{ ...validBackup.transactions[0], type: "Ajuste" }] };
        expect(() => parseBackup(JSON.stringify(invalid))).toThrow("operaciones válidas");
    });
});
