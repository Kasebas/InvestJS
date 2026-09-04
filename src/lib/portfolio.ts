export type PortfolioPosition = {
    symbol: string;
    quantity: number;
    price: number;
    invested: number;
    isTransactionBased?: boolean;
};

export type PortfolioTransaction = {
    type: "Compra" | "Venta" | "Dividendo" | "Comisión";
    symbol: string;
    quantity: number;
    amount: number;
};

export type PortfolioResult =
    | { positions: PortfolioPosition[] }
    | { error: string };

export const recalculatePortfolio = <T extends PortfolioPosition>(
    metadata: T[],
    transactions: (PortfolioTransaction & { id: number; date: string })[],
): T[] | { error: string } => {
    const transactionSymbols = new Set(transactions.map((transaction) => transaction.symbol));
    const basePositions = metadata.filter(
        (position) => !position.isTransactionBased && !transactionSymbols.has(position.symbol),
    );
    let calculated: PortfolioPosition[] = basePositions.map((position) => ({ ...position }));

    const orderedTransactions = [...transactions].sort(
        (left, right) => left.date.localeCompare(right.date) || left.id - right.id,
    );
    for (const transaction of orderedTransactions) {
        const result = applyTransaction(calculated, transaction);
        if ("error" in result) return result;
        calculated = result.positions;
    }

    return calculated.map((position) => {
        const previous = metadata.find((item) => item.symbol === position.symbol);
        return previous ? { ...previous, ...position } : ({ ...position, isTransactionBased: true } as T);
    }) as T[];
};

export const applyTransaction = (
    positions: PortfolioPosition[],
    transaction: PortfolioTransaction,
): PortfolioResult => {
    const index = positions.findIndex(
        (position) => position.symbol === transaction.symbol,
    );

    if (index < 0) {
        if (transaction.type === "Compra" && transaction.quantity > 0 && transaction.amount > 0) {
            return {
                positions: [
                    ...positions,
                    {
                        symbol: transaction.symbol,
                        quantity: transaction.quantity,
                        price: transaction.amount / transaction.quantity,
                        invested: transaction.amount,
                    },
                ],
            };
        }
        return { error: `No existe una posición para ${transaction.symbol}.` };
    }

    const nextPositions = positions.map((position) => ({ ...position }));
    const position = nextPositions[index];
    const averageCost = position.quantity ? position.invested / position.quantity : 0;

    if (transaction.type === "Compra") {
        position.quantity += transaction.quantity;
        position.invested += transaction.amount;
    }

    if (transaction.type === "Venta") {
        if (transaction.quantity > position.quantity) {
            return { error: `No puedes vender más de ${position.quantity} unidades de ${position.symbol}.` };
        }
        position.quantity -= transaction.quantity;
        position.invested = Math.max(0, position.invested - averageCost * transaction.quantity);
    }

    if (transaction.type === "Comisión") {
        position.invested += transaction.amount;
    }

    return { positions: nextPositions };
};
