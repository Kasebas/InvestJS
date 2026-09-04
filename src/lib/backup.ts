export type BackupPosition = {
  id: number;
  symbol: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  invested: number;
  currency: "EUR" | "USD";
  color: string;
};

export type BackupTransaction = {
  id: number;
  date: string;
  symbol: string;
  type: "Compra" | "Venta" | "Dividendo" | "Comisión";
  quantity: number;
  amount: number;
  currency: "EUR" | "USD";
};

export type BackupData = {
  positions: BackupPosition[];
  transactions: BackupTransaction[];
};

const transactionTypes = new Set(["Compra", "Venta", "Dividendo", "Comisión"]);
const currencies = new Set(["EUR", "USD"]);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPosition = (value: unknown): value is BackupPosition => {
  if (!value || typeof value !== "object") return false;
  const position = value as Record<string, unknown>;
  return (
    isFiniteNumber(position.id) &&
    typeof position.symbol === "string" &&
    typeof position.name === "string" &&
    typeof position.category === "string" &&
    isFiniteNumber(position.quantity) &&
    isFiniteNumber(position.price) &&
    isFiniteNumber(position.invested) &&
    currencies.has(String(position.currency)) &&
    typeof position.color === "string"
  );
};

const isTransaction = (value: unknown): value is BackupTransaction => {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Record<string, unknown>;
  return (
    isFiniteNumber(transaction.id) &&
    typeof transaction.date === "string" &&
    typeof transaction.symbol === "string" &&
    transactionTypes.has(String(transaction.type)) &&
    isFiniteNumber(transaction.quantity) &&
    isFiniteNumber(transaction.amount) &&
    currencies.has(String(transaction.currency))
  );
};

export const parseBackup = (raw: string): BackupData => {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("La copia no tiene un formato válido.");
  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data.positions) || !data.positions.every(isPosition)) {
    throw new Error("La copia no contiene posiciones válidas.");
  }
  if (!Array.isArray(data.transactions) || !data.transactions.every(isTransaction)) {
    throw new Error("La copia no contiene operaciones válidas.");
  }
  return { positions: data.positions, transactions: data.transactions };
};

const download = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadJsonBackup = (data: BackupData) => {
  download(JSON.stringify(data, null, 2), "investjs-backup.json", "application/json");
};

const escapeCsv = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const downloadTransactionsCsv = (transactions: BackupTransaction[]) => {
  const header = ["fecha", "simbolo", "tipo", "cantidad", "importe", "divisa"];
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.symbol,
    transaction.type,
    transaction.quantity,
    transaction.amount,
    transaction.currency,
  ]);
  download([header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n"), "investjs-transactions.csv", "text/csv;charset=utf-8");
};
