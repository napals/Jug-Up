import React, { useState, useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../context/ThemeContext';
import { lookupProductByBarcode } from '../utils/barcodeLookup';
import { logEntry, normalisePositiveMl } from '../utils/storage';
import { refreshReminderSchedule } from '../utils/notifications';
import { formatVolume, mlToUnitInput, unitInputToMl, unitLabel } from '../utils/units';
import { DRINK_TYPES } from '../constants/drinkTypes';

export default function ScanScreen({ navigation }) {
  const { colors: COLORS, prefs, premium } = useTheme();
  const unit = prefs.unit || 'ml';
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState('scanning');
  const [result, setResult] = useState(null);
  const [manualInput, setManualInput] = useState(mlToUnitInput(500, unit));
  const [manualError, setManualError] = useState('');
  const [scannedOnce, setScannedOnce] = useState(false);
  const [drinkType, setDrinkType] = useState('water');
  const [autoDetected, setAutoDetected] = useState(false);

  const handleBarcodeScanned = async ({ data }) => {
    if (scannedOnce) return;
    setScannedOnce(true);
    setStatus('looking_up');
    const lookup = await lookupProductByBarcode(data);
    setResult(lookup);
    if (lookup.found && lookup.suggestedDrinkType) {
      setDrinkType(lookup.suggestedDrinkType);
      setAutoDetected(true);
    } else {
      setDrinkType('water');
      setAutoDetected(false);
    }
    setStatus(lookup.found ? 'found' : 'not_found');
  };

  const handleConfirmAdd = async (amountMl) => {
    const validAmount = normalisePositiveMl(amountMl, null, 1, 5000);
    if (!validAmount) {
      setManualError(`Enter a size between ${formatVolume(1, unit)} and ${formatVolume(5000, unit)}.`);
      return;
    }
    try {
      await logEntry(validAmount, {
        vesselName: result?.found ? result.name : 'Bottle',
        vesselType: 'bottle',
        emoji: '🍶',
        color: '#0B5ED7',
        source: result?.found ? 'barcode' : 'manual',
        barcode: result?.barcode || '',
        drinkType: premium ? drinkType : 'water',
      });
      await refreshReminderSchedule().catch(() => null);
      navigation.goBack();
    } catch (_error) {
      setManualError('That amount could not be saved. Please try again.');
    }
  };

  const handleScanAgain = () => {
    setScannedOnce(false);
    setResult(null);
    setManualError('');
    setDrinkType('water');
    setAutoDetected(false);
    setStatus('scanning');
  };

  if (!permission) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator color={COLORS.primary} /></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.permissionText}>We need camera access to scan bottle barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant camera access</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const lookupFailureText = result?.reason === 'timeout'
    ? 'The product lookup timed out. Enter the bottle size manually:'
    : result?.reason === 'network_error'
      ? "Couldn't reach the product database. Enter the bottle size manually:"
      : "Couldn't find that product's size. Enter it manually:";

  return (
    <SafeAreaView style={styles.container}>
      {status === 'scanning' && (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.overlayText}>Point at the bottle's barcode</Text>
          </View>
        </>
      )}

      {status === 'looking_up' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.lookupText}>Looking up product…</Text>
        </View>
      )}

      {status === 'found' && result && (
        <View style={styles.centered}>
          <Text style={styles.foundEmoji}>🥤</Text>
          <Text style={styles.foundName}>{result.name}</Text>
          <Text style={styles.foundVolume}>{formatVolume(result.volumeMl, unit)}</Text>
          {premium ? (
            <View style={styles.drinkTypeSection}>
              {autoDetected ? (
                <Text style={styles.autoDetectedHint}>
                  Detected as {DRINK_TYPES.find((d) => d.id === drinkType)?.label || drinkType} — tap to change
                </Text>
              ) : (
                <Text style={styles.label}>Drink type</Text>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drinkTypeStrip}>
                {DRINK_TYPES.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.drinkTypeChip, drinkType === d.id && styles.drinkTypeChipSelected]}
                    onPress={() => { setDrinkType(d.id); setAutoDetected(false); }}
                  >
                    <Text style={styles.drinkTypeEmoji}>{d.emoji}</Text>
                    <Text style={[styles.drinkTypeLabel, drinkType === d.id && styles.drinkTypeLabelSelected]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
          {manualError ? <Text style={styles.error}>{manualError}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={() => handleConfirmAdd(result.volumeMl)}>
            <Text style={styles.buttonText}>Add {formatVolume(result.volumeMl, unit)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleScanAgain}><Text style={styles.linkText}>Scan a different bottle</Text></TouchableOpacity>
        </View>
      )}

      {status === 'not_found' && (
        <View style={styles.centered}>
          <Text style={styles.foundEmoji}>🔍</Text>
          <Text style={styles.notFoundText}>{lookupFailureText}</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={manualInput} onChangeText={setManualInput} />
          {premium ? (
            <View style={styles.drinkTypeSection}>
              <Text style={styles.label}>Drink type</Text>
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
            </View>
          ) : null}
          {manualError ? <Text style={styles.error}>{manualError}</Text> : null}
          <TouchableOpacity style={styles.button} onPress={() => handleConfirmAdd(unitInputToMl(manualInput, unit))}>
            <Text style={styles.buttonText}>Add {manualInput || '0'}{unitLabel(unit)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleScanAgain}><Text style={styles.linkText}>Try scanning again</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 240, height: 150, borderWidth: 3, borderColor: '#fff', borderRadius: 12, backgroundColor: 'transparent' },
  overlayText: { color: '#fff', marginTop: 16, fontSize: 15, fontWeight: '600' },
  lookupText: { marginTop: 12, fontSize: 15, color: COLORS.textMuted },
  foundEmoji: { fontSize: 48, marginBottom: 8 },
  foundName: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  foundVolume: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 8, marginBottom: 20 },
  notFoundText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, width: 140, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkText: { color: COLORS.primaryDark, marginTop: 16, fontSize: 14, fontWeight: '600' },
  permissionText: { fontSize: 15, color: COLORS.text, textAlign: 'center', marginBottom: 20 },
  error: { color: '#B91C1C', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  drinkTypeSection: { width: '100%', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, textAlign: 'center' },
  autoDetectedHint: { fontSize: 13, fontWeight: '600', color: COLORS.primaryDark, marginBottom: 6, textAlign: 'center' },
  drinkTypeStrip: { gap: 8, paddingHorizontal: 4 },
  drinkTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12 },
  drinkTypeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  drinkTypeEmoji: { fontSize: 15 },
  drinkTypeLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  drinkTypeLabelSelected: { color: COLORS.onPrimary },
});
