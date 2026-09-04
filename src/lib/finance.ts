export type Currency = "EUR" | "USD";

export type FinancePosition = {
    symbol: string;
    quantity: number;
    price: number;
    invested: number;
    currency: Currency;
};

export type FinanceTransaction = {
    id: number;
    date: string;
    symbol: string;
    type: "Compra" | "Venta" | "Dividendo" | "Comisión";
    quantity: number;
    amount: number;
    currency: Currency;
};

export type PortfolioMetrics = {
    invested: number;
    value: number;
    unrealized: number;
    realized: number;
    dividends: number;
    fees: number;
};

export const convertToBase = (
    amount: number,
    currency: Currency,
    baseCurrency: Currency,
    usdToEur: number,
) => {
    if (currency === baseCurrency) return amount;
    if (currency === "USD") return amount * usdToEur;
    return amount / usdToEur;
};

export const calculateMetrics = (
    positions: FinancePosition[],
    transactions: FinanceTransaction[],
    baseCurrency: Currency,
    usdToEur: number,
): PortfolioMetrics => {
    const invested = positions.reduce(
        (total, position) => total + convertToBase(position.invested, position.currency, baseCurrency, usdToEur),
        0,
    );
    const value = positions.reduce(
        (total, position) => total + convertToBase(position.quantity * position.price, position.currency, baseCurrency, usdToEur),
        0,
    );
    const state = new Map<string, { quantity: number; invested: number }>();
    let realized = 0;
    let dividends = 0;
    let fees = 0;
    for (const transaction of [...transactions].sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id)) {
        const current = state.get(transaction.symbol) ?? { quantity: 0, invested: 0 };
        if (transaction.type === "Compra") {
            current.quantity += transaction.quantity;
            current.invested += transaction.amount;
        } else if (transaction.type === "Venta") {
            const averageCost = current.quantity ? current.invested / current.quantity : 0;
            realized += convertToBase(transaction.amount - averageCost * transaction.quantity, transaction.currency, baseCurrency, usdToEur);
            current.quantity -= transaction.quantity;
            current.invested = Math.max(0, current.invested - averageCost * transaction.quantity);
        } else if (transaction.type === "Dividendo") {
            dividends += convertToBase(transaction.amount, transaction.currency, baseCurrency, usdToEur);
        } else {
            fees += convertToBase(transaction.amount, transaction.currency, baseCurrency, usdToEur);
        }
        state.set(transaction.symbol, current);
    }
    return { invested, value, unrealized: value - invested, realized, dividends, fees };
};

const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/[ _-]/g, "");
const splitCsvLine = (line: string) => line.split(/[,;\t]/).map((value) => value.trim().replace(/^"|"$/g, ""));

export const parseMetaTraderCsv = (raw: string, nextId = Date.now()): FinanceTransaction[] => {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error("El CSV no contiene operaciones.");
    const headers = splitCsvLine(lines[0]).map(normalizeHeader);
    const find = (names: string[]) => headers.findIndex((header) => names.includes(header));
    const dateIndex = find(["date", "fecha", "time", "datetime"]);
    const symbolIndex = find(["symbol", "simbolo", "ticker", "activo"]);
    const typeIndex = find(["type", "tipo", "operation", "operacion"]);
    const quantityIndex = find(["quantity", "cantidad", "volume", "volumen"]);
    const amountIndex = find(["amount", "importe", "price", "precio", "profit", "beneficio"]);
    if ([dateIndex, symbolIndex, typeIndex, quantityIndex, amountIndex].some((index) => index < 0)) {
        throw new Error("El CSV necesita columnas de fecha, símbolo, tipo, cantidad e importe.");
    }
    return lines.slice(1).map((line, index) => {
        const values = splitCsvLine(line);
        const rawType = values[typeIndex].toLowerCase();
        const type = rawType.includes("sell") || rawType.includes("venta") ? "Venta" : "Compra";
        const amount = Number(values[amountIndex].replace(",", "."));
        const quantity = Number(values[quantityIndex].replace(",", "."));
        if (!values[dateIndex] || !values[symbolIndex] || !Number.isFinite(amount) || !Number.isFinite(quantity)) {
            throw new Error(`Fila ${index + 2} inválida.`);
        }
        return { id: nextId + index, date: values[dateIndex].slice(0, 10), symbol: values[symbolIndex].toUpperCase(), type, quantity, amount, currency: "USD" as const };
    });
};
