export type PortfolioPosition = {
    symbol: string;
    quantity: number;
    price: number;
    invested: number;
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

export const applyTransaction = (
    positions: PortfolioPosition[],
    transaction: PortfolioTransaction,
): PortfolioResult => {
    const index = positions.findIndex(
        (position) => position.symbol === transaction.symbol,
    );

    if (index < 0) {
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
