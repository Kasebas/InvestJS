import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";
import {
  createVault,
  deleteVault,
  hasVault,
  saveVault,
  unlockVault,
} from "./lib/secureStorage";
import { recalculatePortfolio } from "./lib/portfolio";
import {
  downloadJsonBackup,
  downloadTransactionsCsv,
  parseBackup,
} from "./lib/backup";

type Position = {
  id: number;
  symbol: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  invested: number;
  currency: "EUR" | "USD";
  color: string;
  isTransactionBased?: boolean;
};

type TransactionType = "Compra" | "Venta" | "Dividendo" | "Comisión";

type Transaction = {
  id: number;
  date: string;
  symbol: string;
  type: TransactionType;
  quantity: number;
  amount: number;
  currency: "EUR" | "USD";
};

type VaultData = {
  positions: Position[];
  transactions: Transaction[];
};

const initialPositions: Position[] = [];

const history: { month: string; value: number }[] = [];

const initialTransactions: Transaction[] = [];

function App() {
  const [positions, setPositions] = useState(initialPositions);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultStatus, setVaultStatus] = useState<
    "checking" | "setup" | "locked" | "unlocked"
  >("checking");
  const [vaultError, setVaultError] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [positionSearch, setPositionSearch] = useState("");
  const [positionCategory, setPositionCategory] = useState("Todas");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("Todas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    category: "Acciones",
    quantity: "",
    invested: "",
    price: "",
  });
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symbol: "",
    type: "Compra" as TransactionType,
    quantity: "",
    amount: "",
  });
  useEffect(() => {
    hasVault()
      .then((exists) => setVaultStatus(exists ? "locked" : "setup"))
      .catch(() => setVaultError("No se pudo abrir el almacenamiento local."));
  }, []);

  const setupVault = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordInput.length < 8) {
      setVaultError("Usa una contraseña de al menos 8 caracteres.");
      return;
    }
    try {
      await createVault(
        { positions: initialPositions, transactions: initialTransactions },
        passwordInput,
      );
      setVaultPassword(passwordInput);
      setPasswordInput("");
      setVaultError("");
      setVaultStatus("unlocked");
    } catch {
      setVaultError("No se pudo crear la bóveda local.");
    }
  };

  const unlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const storedData = await unlockVault<Position[] | VaultData>(
        passwordInput,
      );
      const data = Array.isArray(storedData)
        ? { positions: storedData, transactions: [] }
        : storedData;
      setPositions(data.positions);
      setTransactions(data.transactions ?? []);
      setVaultPassword(passwordInput);
      setPasswordInput("");
      setVaultError("");
      setVaultStatus("unlocked");
    } catch {
      setVaultError("Contraseña incorrecta o bóveda dañada.");
    }
  };

  const persistData = async (
    nextPositions: Position[],
    nextTransactions = transactions,
  ) => {
    setPositions(nextPositions);
    setTransactions(nextTransactions);
    try {
      await saveVault(
        { positions: nextPositions, transactions: nextTransactions },
        vaultPassword,
      );
    } catch {
      setVaultError("El cambio se aplicó, pero no se pudo guardar localmente.");
    }
  };
  const resetVault = async () => {
    if (
      !window.confirm(
        "Se borrarán todas las inversiones y operaciones locales. Esta acción no se puede deshacer.",
      )
    )
      return;
    await deleteVault();
    setPositions([]);
    setTransactions([]);
    setVaultPassword("");
    setVaultStatus("setup");
  };
  const exportBackup = () => downloadJsonBackup({ positions, transactions });
  const exportTransactions = () => downloadTransactionsCsv(transactions);
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      await persistData(backup.positions, backup.transactions);
      setVaultError("");
    } catch (error) {
      setVaultError(
        error instanceof Error
          ? error.message
          : "No se pudo importar la copia.",
      );
    }
  };
  const totalInvested = positions.reduce(
    (total, position) => total + position.invested,
    0,
  );
  const totalValue = positions.reduce(
    (total, position) => total + position.quantity * position.price,
    0,
  );
  const gain = totalValue - totalInvested;
  const gainPercent = totalInvested ? (gain / totalInvested) * 100 : 0;
  const allocation = useMemo(
    () =>
      positions.map((position) => ({
        name: position.symbol,
        value: position.quantity * position.price,
        color: position.color,
      })),
    [positions],
  );
  const filteredPositions = useMemo(() => {
    const search = positionSearch.trim().toLowerCase();
    return positions.filter((position) => {
      const matchesSearch =
        !search ||
        position.symbol.toLowerCase().includes(search) ||
        position.name.toLowerCase().includes(search);
      const matchesCategory =
        positionCategory === "Todas" || position.category === positionCategory;
      return matchesSearch && matchesCategory;
    });
  }, [positionCategory, positionSearch, positions]);
  const filteredTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transactionTypeFilter === "Todas" ||
          transaction.type === transactionTypeFilter,
      ),
    [transactionTypeFilter, transactions],
  );

  const openNew = () => {
    setEditingId(null);
    setForm({
      symbol: "",
      name: "",
      category: "Acciones",
      quantity: "",
      invested: "",
      price: "",
    });
    setIsModalOpen(true);
  };
  const openEdit = (position: Position) => {
    setEditingId(position.id);
    setForm({
      symbol: position.symbol,
      name: position.name,
      category: position.category,
      quantity: String(position.quantity),
      invested: String(position.invested),
      price: String(position.price),
    });
    setIsModalOpen(true);
  };
  const saveTransaction = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTransaction: Transaction = {
      id: editingTransactionId ?? Date.now(),
      date: transactionForm.date,
      symbol: transactionForm.symbol.toUpperCase(),
      type: transactionForm.type,
      quantity: Number(transactionForm.quantity) || 0,
      amount: Number(transactionForm.amount),
      currency: "USD",
    };
    if (!nextTransaction.symbol || !nextTransaction.amount) return;
    const nextTransactions = editingTransactionId
      ? transactions.map((transaction) =>
          transaction.id === editingTransactionId
            ? nextTransaction
            : transaction,
        )
      : [nextTransaction, ...transactions];
    const result = recalculatePortfolio(positions, nextTransactions);
    if ("error" in result) {
      setVaultError(result.error);
      return;
    }
    const updatedPositions = result.map((calculatedPosition) => {
      const existingPosition = positions.find(
        (position) => position.symbol === calculatedPosition.symbol,
      );
      return existingPosition
        ? { ...existingPosition, ...calculatedPosition }
        : {
            ...calculatedPosition,
            id: Date.now(),
            name: calculatedPosition.symbol,
            category: "Acciones",
            currency: "USD" as const,
            color: "#876cbb",
            isTransactionBased: true,
          };
    });
    void persistData(updatedPositions, nextTransactions);
    setVaultError("");
    setIsTransactionModalOpen(false);
    setEditingTransactionId(null);
  };
  const openNewTransaction = () => {
    setEditingTransactionId(null);
    setTransactionForm({
      date: new Date().toISOString().slice(0, 10),
      symbol: "",
      type: "Compra",
      quantity: "",
      amount: "",
    });
    setIsTransactionModalOpen(true);
  };
  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setTransactionForm({
      date: transaction.date,
      symbol: transaction.symbol,
      type: transaction.type,
      quantity: String(transaction.quantity),
      amount: String(transaction.amount),
    });
    setIsTransactionModalOpen(true);
  };
  const deleteTransaction = (transactionId: number) => {
    if (!window.confirm("¿Eliminar esta operación y recalcular la cartera?"))
      return;
    const nextTransactions = transactions.filter(
      (transaction) => transaction.id !== transactionId,
    );
    const result = recalculatePortfolio(positions, nextTransactions);
    if ("error" in result) {
      setVaultError(result.error);
      return;
    }
    const activeSymbols = new Set(
      nextTransactions.map((transaction) => transaction.symbol),
    );
    const nextPositions = result
      .filter(
        (calculatedPosition) =>
          activeSymbols.has(calculatedPosition.symbol) ||
          !positions.find(
            (position) => position.symbol === calculatedPosition.symbol,
          )?.isTransactionBased,
      )
      .map((calculatedPosition) => {
        const existingPosition = positions.find(
          (position) => position.symbol === calculatedPosition.symbol,
        );
        return existingPosition
          ? { ...existingPosition, ...calculatedPosition }
          : {
              ...calculatedPosition,
              id: Date.now(),
              name: calculatedPosition.symbol,
              category: "Acciones",
              currency: "USD" as const,
              color: "#876cbb",
            };
      });
    void persistData(nextPositions, nextTransactions);
  };
  const savePosition = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      symbol: form.symbol.toUpperCase(),
      name: form.name,
      category: form.category,
      quantity: Number(form.quantity),
      invested: Number(form.invested),
      price: Number(form.price),
    };
    if (!next.symbol || !next.name || !next.quantity || !next.price) return;
    const nextPositions = editingId
      ? positions.map((position) =>
          position.id === editingId ? { ...position, ...next } : position,
        )
      : [
          ...positions,
          {
            ...next,
            id: Date.now(),
            currency: "USD" as const,
            color: "#876cbb",
          },
        ];
    void persistData(nextPositions);
    setIsModalOpen(false);
  };

  if (vaultStatus !== "unlocked")
    return (
      <main className="vault-screen">
        <div className="vault-card">
          <span className="brand-mark">
            <ChartNoAxesCombined size={22} />
          </span>
          <p className="eyebrow">INVESTJS · DATOS LOCALES</p>
          <h1>
            {vaultStatus === "checking"
              ? "Comprobando bóveda"
              : vaultStatus === "setup"
                ? "Protege tu cartera"
                : "Desbloquea tu cartera"}
          </h1>
          {vaultStatus === "checking" ? (
            <p className="vault-copy">
              Preparando el almacenamiento seguro de este navegador...
            </p>
          ) : (
            <form onSubmit={vaultStatus === "setup" ? setupVault : unlock}>
              <label>
                {vaultStatus === "setup"
                  ? "Crea una contraseña local"
                  : "Contraseña local"}
                <input
                  autoFocus
                  required
                  minLength={8}
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </label>
              <button className="primary-button modal-submit" type="submit">
                {vaultStatus === "setup" ? "Crear bóveda" : "Desbloquear"}
              </button>
            </form>
          )}
          {vaultError && (
            <p className="vault-error" role="alert">
              {vaultError}
            </p>
          )}
          <p className="vault-warning">
            La contraseña no se guarda ni se puede recuperar. Sin ella no podrás
            descifrar tus datos.
          </p>
        </div>
      </main>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <ChartNoAxesCombined size={19} />
          </span>
          <span>
            Invest<span className="brand-accent">JS</span>
          </span>
        </div>
        <nav aria-label="Navegación principal">
          <a className="nav-item active" href="#dashboard">
            <ChartNoAxesCombined size={18} /> Resumen
          </a>
          <a className="nav-item" href="#positions">
            <BriefcaseBusiness size={18} /> Mis inversiones
          </a>
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Datos locales seguros
          <button
            className="lock-button"
            type="button"
            onClick={() => {
              setVaultPassword("");
              setVaultStatus("locked");
            }}
          >
            Bloquear
          </button>
          <button
            className="lock-button"
            type="button"
            onClick={() => void resetVault()}
          >
            Borrar datos
          </button>
        </div>
      </aside>
      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">PATRIMONIO PERSONAL</p>
            <h1>Buenos días, Kaseb</h1>
          </div>
          <div className="topbar-actions">
            <input
              ref={importInputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={importBackup}
            />
            <button
              className="secondary-button"
              onClick={() => importInputRef.current?.click()}
            >
              Importar copia
            </button>
            <button className="secondary-button" onClick={exportBackup}>
              Exportar JSON
            </button>
            <button className="secondary-button" onClick={exportTransactions}>
              Exportar CSV
            </button>
            <button
              className="secondary-button"
              onClick={() => setIsTransactionModalOpen(true)}
            >
              Registrar operación
            </button>
            <button className="primary-button" onClick={openNew}>
              <Plus size={17} /> Añadir inversión
            </button>
          </div>
        </header>
        <section className="summary-grid" aria-label="Resumen de cartera">
          <article className="metric-card featured">
            <span className="metric-label">Valor total</span>
            <strong>
              {totalValue.toLocaleString("es-ES", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
            </strong>
            <span className="metric-change positive">
              <ArrowUpRight size={15} /> +12,8% este año
            </span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Capital invertido</span>
            <strong>
              {totalInvested.toLocaleString("es-ES", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              })}
            </strong>
            <span className="metric-note">
              {positions.length} posiciones activas
            </span>
          </article>
          <article className="metric-card">
            <span className="metric-label">Rentabilidad</span>
            <strong className="positive-text">
              +{gain.toLocaleString("es-ES", { maximumFractionDigits: 0 })} $
            </strong>
            <span className="metric-change positive">
              <ArrowUpRight size={15} /> +{gainPercent.toFixed(1)}% total
            </span>
          </article>
        </section>
        <section className="charts-grid">
          <article className="panel performance-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">EVOLUCIÓN</p>
                <h2>Valor de cartera</h2>
              </div>
              <select aria-label="Periodo del gráfico">
                <option>Últimos 9 meses</option>
              </select>
            </div>
            <div className="chart-wrap">
              {history.length === 0 ? (
                <div className="chart-empty">
                  Añade una inversión para comenzar a ver la evolución de tu
                  cartera.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient
                        id="valueFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#d8704f"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#d8704f"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9e3da" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8b847d", fontSize: 11 }}
                    />
                    <YAxis hide domain={["dataMin - 1000", "dataMax + 500"]} />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString("es-ES")} $`,
                        "Valor",
                      ]}
                      contentStyle={{
                        border: "1px solid #e9e3da",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#d8704f"
                      strokeWidth={3}
                      fill="url(#valueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="panel allocation-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">COMPOSICIÓN</p>
                <h2>Distribución</h2>
              </div>
            </div>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="63%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {allocation.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toLocaleString("es-ES")} $`,
                      "Valor",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-total">
                <strong>
                  {totalValue.toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  $
                </strong>
                <span>Total</span>
              </div>
            </div>
            <div className="legend">
              {allocation.map((item) => (
                <span key={item.name}>
                  <i style={{ background: item.color }} />
                  {item.name}
                  <b>{((item.value / totalValue) * 100).toFixed(0)}%</b>
                </span>
              ))}
            </div>
          </article>
        </section>
        <section className="panel positions-panel" id="positions">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SEGUIMIENTO</p>
              <h2>Mis inversiones</h2>
            </div>
            <button className="text-button" onClick={openNew}>
              Ver todas <span>→</span>
            </button>
          </div>
          <div className="filter-bar" aria-label="Filtros de posiciones">
            <label className="filter-search">
              <span className="sr-only">Buscar inversión</span>
              <input
                type="search"
                value={positionSearch}
                onChange={(event) => setPositionSearch(event.target.value)}
                placeholder="Buscar símbolo o nombre"
              />
            </label>
            <label className="filter-select">
              <span className="sr-only">Filtrar por categoría</span>
              <select
                value={positionCategory}
                onChange={(event) => setPositionCategory(event.target.value)}
              >
                <option>Todas</option>
                <option>Acciones</option>
                <option>Oro</option>
                <option>ETF</option>
                <option>Otro</option>
              </select>
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Precio actual</th>
                  <th>Valor</th>
                  <th>Rentabilidad</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((position) => {
                  const value = position.quantity * position.price;
                  const result = value - position.invested;
                  return (
                    <tr key={position.id}>
                      <td>
                        <div className="asset-cell">
                          <span
                            className="asset-icon"
                            style={{ background: position.color }}
                          >
                            {position.symbol.slice(0, 1)}
                          </span>
                          <div>
                            <strong>{position.symbol}</strong>
                            <small>{position.name}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="type-label">{position.category}</span>
                      </td>
                      <td>{position.quantity}</td>
                      <td>
                        {position.price.toLocaleString("es-ES", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        $
                      </td>
                      <td>
                        <strong>
                          {value.toLocaleString("es-ES", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          $
                        </strong>
                      </td>
                      <td>
                        <span
                          className={
                            result >= 0
                              ? "return positive-text"
                              : "return negative-text"
                          }
                        >
                          {result >= 0 ? "+" : ""}
                          {((result / position.invested) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            onClick={() => openEdit(position)}
                            aria-label={`Editar ${position.symbol}`}
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger"
                            onClick={() =>
                              void persistData(
                                positions.filter(
                                  (item) => item.id !== position.id,
                                ),
                              )
                            }
                            aria-label={`Eliminar ${position.symbol}`}
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredPositions.length === 0 && (
            <p className="filter-empty">
              No hay inversiones que coincidan con estos filtros.
            </p>
          )}
        </section>
        <section className="panel transactions-panel" id="transactions">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MOVIMIENTOS</p>
              <h2>Operaciones recientes</h2>
            </div>
            <button className="text-button" onClick={openNewTransaction}>
              Añadir operación <span>+</span>
            </button>
          </div>
          <div className="filter-bar" aria-label="Filtros de operaciones">
            <label className="filter-select">
              <span className="sr-only">Filtrar por tipo de operación</span>
              <select
                value={transactionTypeFilter}
                onChange={(event) =>
                  setTransactionTypeFilter(event.target.value)
                }
              >
                <option>Todas</option>
                <option>Compra</option>
                <option>Venta</option>
                <option>Dividendo</option>
                <option>Comisión</option>
              </select>
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Activo</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Importe</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 5).map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      {new Date(
                        `${transaction.date}T12:00:00`,
                      ).toLocaleDateString("es-ES")}
                    </td>
                    <td>
                      <strong>{transaction.symbol}</strong>
                    </td>
                    <td>
                      <span
                        className={`transaction-type ${transaction.type.toLowerCase()}`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td>{transaction.quantity || "-"}</td>
                    <td>
                      <strong>
                        {transaction.amount.toLocaleString("es-ES", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        $
                      </strong>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          onClick={() => openEditTransaction(transaction)}
                          aria-label={`Editar operación de ${transaction.symbol}`}
                          title="Editar operación"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => deleteTransaction(transaction.id)}
                          aria-label={`Eliminar operación de ${transaction.symbol}`}
                          title="Eliminar operación"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && (
            <p className="filter-empty">
              No hay operaciones que coincidan con este filtro.
            </p>
          )}
        </section>
        <p className="privacy-note">
          Tus datos se guardan localmente en este navegador · Última
          actualización: hoy, 09:42
        </p>
      </main>
      {isModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsModalOpen(false);
          }}
        >
          <form className="modal" onSubmit={savePosition}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingId ? "EDITAR POSICIÓN" : "NUEVA POSICIÓN"}
                </p>
                <h2>
                  {editingId ? "Actualizar inversión" : "Añadir inversión"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <label>
              Símbolo
              <input
                required
                value={form.symbol}
                onChange={(event) =>
                  setForm({ ...form, symbol: event.target.value })
                }
                placeholder="Ej. AAPL"
              />
            </label>
            <label>
              Nombre
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Nombre del activo"
              />
            </label>
            <div className="form-row">
              <label>
                Tipo
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  <option>Acciones</option>
                  <option>Oro</option>
                  <option>ETF</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Cantidad
                <input
                  required
                  min="0.0001"
                  step="any"
                  type="number"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({ ...form, quantity: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Precio actual
                <input
                  required
                  min="0"
                  step="any"
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                />
              </label>
              <label>
                Capital invertido
                <input
                  required
                  min="0"
                  step="any"
                  type="number"
                  value={form.invested}
                  onChange={(event) =>
                    setForm({ ...form, invested: event.target.value })
                  }
                />
              </label>
            </div>
            <button className="primary-button modal-submit" type="submit">
              {editingId ? "Guardar cambios" : "Añadir inversión"}
            </button>
          </form>
        </div>
      )}
      {isTransactionModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setIsTransactionModalOpen(false);
          }}
        >
          <form className="modal" onSubmit={saveTransaction}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">
                  {editingTransactionId
                    ? "EDITAR MOVIMIENTO"
                    : "NUEVO MOVIMIENTO"}
                </p>
                <h2>
                  {editingTransactionId
                    ? "Editar operación"
                    : "Registrar operación"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setIsTransactionModalOpen(false);
                  setEditingTransactionId(null);
                }}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="form-row">
              <label>
                Fecha
                <input
                  required
                  type="date"
                  value={transactionForm.date}
                  onChange={(event) =>
                    setTransactionForm({
                      ...transactionForm,
                      date: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  value={transactionForm.type}
                  onChange={(event) =>
                    setTransactionForm({
                      ...transactionForm,
                      type: event.target.value as TransactionType,
                    })
                  }
                >
                  <option>Compra</option>
                  <option>Venta</option>
                  <option>Dividendo</option>
                  <option>Comisión</option>
                </select>
              </label>
            </div>
            <label>
              Símbolo
              <input
                required
                value={transactionForm.symbol}
                onChange={(event) =>
                  setTransactionForm({
                    ...transactionForm,
                    symbol: event.target.value,
                  })
                }
                placeholder="Ej. META"
              />
            </label>
            <div className="form-row">
              <label>
                Cantidad
                <input
                  min="0"
                  step="any"
                  type="number"
                  value={transactionForm.quantity}
                  onChange={(event) =>
                    setTransactionForm({
                      ...transactionForm,
                      quantity: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Importe
                <input
                  required
                  min="0.01"
                  step="any"
                  type="number"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm({
                      ...transactionForm,
                      amount: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <button className="primary-button modal-submit" type="submit">
              {editingTransactionId ? "Guardar cambios" : "Guardar operación"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
