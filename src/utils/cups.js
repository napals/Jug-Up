import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalisePositiveMl } from './storage';
import { isValidDrinkType } from '../constants/drinkTypes';

const CUPS_KEY = 'hydrate:customCups';
export const CUP_MIN_ML = 1;
export const CUP_MAX_ML = 5000;

export const DEFAULT_CUPS = [
  { id: 'default-small', name: 'Small glass', amountMl: 150, color: '#60A5FA', emoji: '🥃', drinkType: 'water', iconKey: 'small-glass' },
  { id: 'default-glass', name: 'Glass', amountMl: 250, color: '#1E90FF', emoji: '🥤', drinkType: 'water', iconKey: 'small-glass' },
  { id: 'default-mug', name: 'Mug', amountMl: 350, color: '#0B5ED7', emoji: '☕', drinkType: 'water', iconKey: 'travel-mug' },
  { id: 'default-bottle', name: 'Bottle', amountMl: 500, color: '#0B2545', emoji: '🍶', drinkType: 'water', iconKey: 'water-bottle' },
];

export const CUP_COLOR_PALETTE = [
  '#60A5FA', '#1E90FF', '#0B5ED7', '#4FD1E9', '#22C55E',
  '#F59E0B', '#EF4444', '#A855F7', '#EC4899',
  '#0B2545', '#64748B',
];

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function sanitiseCup(cup) {
  if (!cup || typeof cup !== 'object') return null;
  const name = typeof cup.name === 'string' ? cup.name.trim().slice(0, 40) : '';
  const amountMl = normalisePositiveMl(cup.amountMl, null, CUP_MIN_ML, CUP_MAX_ML);
  const color = typeof cup.color === 'string' && HEX_COLOR_PATTERN.test(cup.color) ? cup.color : CUP_COLOR_PALETTE[0];
  if (!name || !amountMl) return null;
  return {
    id: typeof cup.id === 'string' && cup.id ? cup.id : `${Date.now()}-${Math.random()}`,
    name,
    amountMl,
    color,
    emoji: typeof cup.emoji === 'string' && cup.emoji ? cup.emoji : '🥤',
    drinkType: isValidDrinkType(cup.drinkType) ? cup.drinkType : 'water',
    iconKey: typeof cup.iconKey === 'string' && cup.iconKey ? cup.iconKey : null,
  };
}

async function getSavedCups() {
  try {
    const raw = await AsyncStorage.getItem(CUPS_KEY);
    if (!raw) return null;
    const parsed = safeParse(raw, null);
    if (!Array.isArray(parsed)) return null;
    const cups = parsed.map(sanitiseCup).filter(Boolean);
    return cups;
  } catch (_error) {
    return null;
  }
}

export async function getCups() {
  return (await getSavedCups()) ?? DEFAULT_CUPS;
}

async function saveCups(cups) {
  await AsyncStorage.setItem(CUPS_KEY, JSON.stringify(cups));
}

function validateCupInput({ name, amountMl, color, emoji = '🥤', drinkType = 'water', iconKey = null }) {
  const cup = sanitiseCup({ id: 'pending', name, amountMl, color, emoji, drinkType, iconKey });
  if (!cup) throw new Error(`Enter a cup name and a size between ${CUP_MIN_ML}ml and ${CUP_MAX_ML}ml.`);
  return cup;
}

export async function addCup(input) {
  const valid = validateCupInput(input);
  const base = await getCups();
  const newCup = { ...valid, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  const updated = [...base, newCup];
  await saveCups(updated);
  return updated;
}

export async function updateCup(id, changes) {
  const cups = await getCups();
  const existing = cups.find((cup) => cup.id === id);
  if (!existing) throw new Error('That cup no longer exists.');
  const valid = validateCupInput({ ...existing, ...changes });
  const updated = cups.map((cup) => (cup.id === id ? { ...valid, id } : cup));
  await saveCups(updated);
  return updated;
}

export async function deleteCup(id) {
  const cups = await getCups();
  const updated = cups.filter((cup) => cup.id !== id);
  await saveCups(updated);
  return updated;
}