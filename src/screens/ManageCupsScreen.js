import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, ScrollView, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { addCup, CUP_COLOR_PALETTE, CUP_MAX_ML, CUP_MIN_ML, deleteCup, getCups, updateCup } from '../utils/cups';
import { formatVolume, mlToUnitInput, unitInputToMl, unitLabel } from '../utils/units';
import { DRINK_TYPES } from '../constants/drinkTypes';

// 24 common vessel presets, roughly smallest to largest, so picking a
// starting point for a new cup doesn't require knowing its size in ml/oz
// off the top of your head. Selecting one only fills in the name/size/emoji
// — colour and the final numbers stay fully editable afterward.
const CUP_PRESETS = [
  { name: 'A Sip', amountMl: 30, emoji: '💧' },
  { name: 'Shot Glass', amountMl: 45, emoji: '🥃' },
  { name: 'Espresso Cup', amountMl: 60, emoji: '☕' },
  { name: 'Kids Cup', amountMl: 120, emoji: '🧒' },
  { name: 'Sippy Cup', amountMl: 150, emoji: '🍼' },
  { name: 'Wine Glass', amountMl: 150, emoji: '🍷' },
  { name: 'Tea Cup', amountMl: 180, emoji: '🍵' },
  { name: 'Small Glass', amountMl: 200, emoji: '🥛' },
  { name: 'Coffee Mug', amountMl: 250, emoji: '☕' },
  { name: 'Tall Glass', amountMl: 300, emoji: '🥛' },
  { name: 'Travel Mug', amountMl: 350, emoji: '☕' },
  { name: 'Tumbler', amountMl: 400, emoji: '🥤' },
  { name: 'Milkshake Cup', amountMl: 450, emoji: '🥤' },
  { name: 'Mason Jar', amountMl: 470, emoji: '🫙' },
  { name: 'Pint', amountMl: 473, emoji: '🍺' },
  { name: 'Smoothie Cup', amountMl: 500, emoji: '🥤' },
  { name: 'Small Water Bottle', amountMl: 500, emoji: '💧' },
  { name: 'Standard Water Bottle', amountMl: 600, emoji: '🍶' },
  { name: 'Sports Bottle', amountMl: 750, emoji: '🚰' },
  { name: 'Large Water Bottle', amountMl: 1000, emoji: '🍾' },
  { name: 'Large Hydro Flask', amountMl: 1180, emoji: '🧊' },
  { name: 'Growler', amountMl: 1890, emoji: '🍺' },
  { name: 'Half-Gallon Jug', amountMl: 1893, emoji: '🏺' },
  { name: 'Gallon Jug', amountMl: 3785, emoji: '🪣' },
];

export default function ManageCupsScreen() {
  const { colors: COLORS, prefs, premium } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [cups, setCups] = useState([]);
  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState(mlToUnitInput(250, unit));
  const [selectedEmoji, setSelectedEmoji] = useState('🥤');
  const [selectedColor, setSelectedColor] = useState(CUP_COLOR_PALETTE[0]);
  const [drinkType, setDrinkType] = useState('water');
  const [editingId, setEditingId] = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    getCups().then(setCups).catch(() => setError('Cups could not be loaded.'));
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const resetForm = () => {
    setName('');
    setAmountInput(mlToUnitInput(250, unit));
    setSelectedEmoji('🥤');
    setSelectedColor(CUP_COLOR_PALETTE[0]);
    setDrinkType('water');
    setEditingId(null);
    setPresetOpen(false);
    setError('');
  };

  const choosePreset = (preset) => {
    setName(preset.name);
    setAmountInput(mlToUnitInput(preset.amountMl, unit));
    setSelectedEmoji(preset.emoji);
    setPresetOpen(false);
  };

  const handleSubmit = async () => {
    setError('');
    const amountMl = unitInputToMl(amountInput, unit);
    if (!amountMl) {
      setError(`Enter a cup size in ${unitLabel(unit)}.`);
      return;
    }
    if (amountMl < CUP_MIN_ML || amountMl > CUP_MAX_ML) {
      setError(`Enter a cup size between ${formatVolume(CUP_MIN_ML, unit)} and ${formatVolume(CUP_MAX_ML, unit)}.`);
      return;
    }
    try {
      const input = { name: name.trim(), amountMl, color: selectedColor, emoji: selectedEmoji, drinkType: premium ? drinkType : 'water' };
      const updated = editingId
        ? await updateCup(editingId, input)
        : await addCup(input);
      setCups(updated);
      resetForm();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleEdit = (cup) => {
    setEditingId(cup.id);
    setName(cup.name);
    setAmountInput(mlToUnitInput(cup.amountMl, unit));
    setSelectedEmoji(cup.emoji || '🥤');
    setSelectedColor(cup.color);
    setDrinkType(cup.drinkType || 'water');
    setPresetOpen(false);
    setError('');
  };

  const handleDelete = async (id) => {
    try {
      const updated = await deleteCup(id);
      setCups(updated);
      if (editingId === id) resetForm();
    } catch (_error) {
      setError('That cup could not be removed.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your cups</Text>}
        renderItem={({ item }) => (
          <View style={[styles.cupRow, editingId === item.id && styles.cupRowEditing]}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <View style={styles.cupInfo}>
              <Text style={styles.cupName}>{item.emoji} {item.name}</Text>
              <Text style={styles.cupAmount}>{formatVolume(item.amountMl, unit)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleEdit(item)} style={styles.rowAction}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.rowAction}>
              <Text style={styles.deleteText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>{editingId ? 'Edit cup' : 'Add a new cup'}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Quick start</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setPresetOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Choose a preset cup size"
            >
              <Text style={styles.dropdownButtonText}>
                {selectedEmoji} Choose from 24 presets
              </Text>
              <Text style={styles.dropdownChevron}>{presetOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {presetOpen ? (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {CUP_PRESETS.map((preset, index) => (
                    <TouchableOpacity
                      key={preset.name}
                      style={[styles.dropdownRow, index === CUP_PRESETS.length - 1 && styles.dropdownRowLast]}
                      onPress={() => choosePreset(preset)}
                    >
                      <Text style={styles.dropdownRowEmoji}>{preset.emoji}</Text>
                      <Text style={styles.dropdownRowName}>{preset.name}</Text>
                      <Text style={styles.dropdownRowAmount}>{formatVolume(preset.amountMl, unit)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} placeholder="e.g. My Big Mug" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} maxLength={40} />

            <Text style={styles.label}>Size ({unitLabel(unit)})</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={amountInput} onChangeText={setAmountInput} />

            <Text style={styles.label}>Colour</Text>
            <View style={styles.palette}>
              {CUP_COLOR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose colour ${color}`}
                  onPress={() => setSelectedColor(color)}
                  style={[styles.swatch, { backgroundColor: color }, selectedColor === color && styles.swatchSelected]}
                />
              ))}
            </View>

            {premium ? (
              <>
                <Text style={styles.label}>Drink type (sets the default for this cup)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drinkTypeStrip}>
                  {DRINK_TYPES.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.drinkTypeChip, drinkType === d.id && styles.drinkTypeChipSelected]}
                      onPress={() => setDrinkType(d.id)}
                    >
                      <Text style={styles.drinkTypeEmoji}>{d.emoji}</Text>
                      <Text style={[styles.drinkTypeLabel, drinkType === d.id && styles.drinkTypeLabelSelected]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
              <Text style={styles.addButtonText}>{editingId ? 'Save changes' : 'Add cup'}</Text>
            </TouchableOpacity>
            {editingId ? (
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel editing</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cupRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  cupRowEditing: { borderWidth: 2, borderColor: COLORS.primary },
  colorDot: { width: 18, height: 18, borderRadius: 9, marginRight: 12 },
  cupInfo: { flex: 1 },
  cupName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cupAmount: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  rowAction: { paddingVertical: 6, paddingLeft: 12 },
  editText: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 13 },
  deleteText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  form: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  error: { color: '#B91C1C', fontSize: 13, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  dropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dropdownButtonText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  dropdownChevron: { color: COLORS.textMuted, fontSize: 12 },
  dropdownList: {
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    marginTop: 6, maxHeight: 260, overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 260 },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dropdownRowLast: { borderBottomWidth: 0 },
  dropdownRowEmoji: { fontSize: 16, marginRight: 10 },
  dropdownRowName: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600' },
  dropdownRowAmount: { color: COLORS.textMuted, fontSize: 13 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  drinkTypeStrip: { gap: 8, paddingBottom: 4, marginTop: 4 },
  drinkTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12 },
  drinkTypeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  drinkTypeEmoji: { fontSize: 15 },
  drinkTypeLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  drinkTypeLabelSelected: { color: COLORS.onPrimary },
  swatchSelected: { borderWidth: 3, borderColor: COLORS.text },
  addButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  addButtonText: { color: COLORS.onPrimary, fontWeight: '700', fontSize: 16 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { color: COLORS.textMuted, fontWeight: '600' },
});
