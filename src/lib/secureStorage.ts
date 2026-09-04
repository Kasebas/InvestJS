const DATABASE_NAME = "investjs-vault";
const STORE_NAME = "vault";
const RECORD_KEY = "positions";
const ITERATIONS = 250_000;

type VaultRecord = {
    key: string;
    salt: string;
    iv: string;
    ciphertext: string;
};

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const decode = (value: string) =>
    Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const asArrayBuffer = (bytes: Uint8Array) => bytes.buffer as ArrayBuffer;

const openDatabase = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("No se pudo abrir la bóveda"));
    });

const getRecord = async () => {
    const database = await openDatabase();
    return new Promise<VaultRecord | undefined>((resolve, reject) => {
        const request = database
            .transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .get(RECORD_KEY);
        request.onsuccess = () => resolve(request.result as VaultRecord | undefined);
        request.onerror = () => reject(request.error ?? new Error("No se pudo leer la bóveda"));
    });
};

const deriveKey = async (password: string, salt: Uint8Array) => {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: asArrayBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
    );
};

const saveRecord = async (record: VaultRecord) => {
    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo guardar la bóveda"));
    });
};

export const hasVault = async () => Boolean(await getRecord());

export const deleteVault = async () => {
    const database = await openDatabase();
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo borrar la bóveda"));
    });
};

export const createVault = async <T>(value: T, password: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await encryptAndSave(value, password, salt);
};

export const saveVault = async <T>(value: T, password: string) => {
    const record = await getRecord();
    if (!record) return createVault(value, password);
    await encryptAndSave(value, password, decode(record.salt));
};

const encryptAndSave = async <T>(value: T, password: string, salt: Uint8Array) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(JSON.stringify(value)),
    );
    await saveRecord({ key: RECORD_KEY, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) });
};

export const unlockVault = async <T>(password: string) => {
    const record = await getRecord();
    if (!record) throw new Error("La bóveda todavía no existe");
    const key = await deriveKey(password, decode(record.salt));
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: decode(record.iv) },
        key,
        decode(record.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
};
