import { PlatformMember } from './types';

type AuthMemoryRecord = {
  role: PlatformMember['role'];
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
};

const STORAGE_KEY = 'renziy_auth_memory_v1';
const ITERATIONS = 120000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const keyFor = (role: PlatformMember['role'], email: string) => `${role}:${normalizeEmail(email)}`;

const bytesToBase64 = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  view.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const loadVault = (): Record<string, AuthMemoryRecord> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, AuthMemoryRecord>;
  } catch {
    return {};
  }
};

const saveVault = (vault: Record<string, AuthMemoryRecord>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
};

const hashPassword = async (password: string, salt: Uint8Array) => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: ITERATIONS
    },
    passwordKey,
    256
  );
  return bytesToBase64(bits);
};

export const rememberLocalLogin = async (
  role: PlatformMember['role'],
  email: string,
  name: string,
  password: string
) => {
  if (!password || password.length < 6) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const vault = loadVault();
  vault[keyFor(role, email)] = {
    role,
    email: normalizeEmail(email),
    name,
    salt: bytesToBase64(salt),
    passwordHash: await hashPassword(password, salt),
    updatedAt: new Date().toISOString()
  };
  saveVault(vault);
};

export const verifyLocalLogin = async (
  role: PlatformMember['role'],
  email: string,
  password: string
) => {
  const record = loadVault()[keyFor(role, email)];
  if (!record || !password) return null;
  const attemptedHash = await hashPassword(password, base64ToBytes(record.salt));
  return attemptedHash === record.passwordHash ? record : null;
};
