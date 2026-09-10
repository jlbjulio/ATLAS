import { StatusBar } from "expo-status-bar";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { listObservations, saveObservation } from "./src/db";
import { extractObservation, initializeQVAC, shutdownQVAC, transcribeObservation } from "./src/qvac";
import type { EquipmentDraft, Extraction, LocalObservation } from "./src/types";

type Tab = "capture" | "base";

const COLORS = {
  ink: "#11212B",
  muted: "#64747D",
  line: "#D9E4E8",
  paper: "#F5F8F8",
  white: "#FFFFFF",
  teal: "#007D80",
  tealSoft: "#DFF3F1",
  navy: "#0C2835",
  amber: "#A26113",
  amberSoft: "#FFF0D9",
  green: "#2C8059",
};

const EMPTY_EXTRACTION: Extraction = {
  equipments: [],
  missingFields: [],
  nextQuestion: null,
  confidence: 0,
};

export default function App() {
  const [tab, setTab] = useState<Tab>("capture");
  const [modelState, setModelState] = useState("Preparando inteligencia local");
  const [modelProgress, setModelProgress] = useState<number | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [observations, setObservations] = useState<LocalObservation[]>([]);
  const [client, setClient] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [micPermission, setMicPermission] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    let mounted = true;
    void listObservations().then((items) => mounted && setObservations(items)).catch(() => undefined);
    void (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (mounted) setMicPermission(permission.granted);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      try {
        await initializeQVAC((label, percentage) => {
          if (!mounted) return;
          setModelState(label);
          setModelProgress(percentage);
        });
        if (mounted) {
          setIsReady(true);
          setModelState("Inferencia local lista");
          setModelProgress(null);
        }
      } catch (error) {
        if (mounted) setModelError(error instanceof Error ? error.message : "No se pudo preparar QVAC");
      }
    })();
    return () => {
      mounted = false;
      void shutdownQVAC();
    };
  }, []);

  async function toggleRecording() {
    if (!micPermission) {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      setMicPermission(permission.granted);
      if (!permission.granted) return;
    }
    if (recorderState.isRecording) {
      await recorder.stop();
      setAudioUri(recorder.uri ?? null);
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function openCamera() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return;
    }
    setCameraOpen(true);
  }

  async function capturePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setCameraOpen(false);
    }
  }

  async function handleTranscribe() {
    if (!audioUri || !isReady) return;
    try {
      setModelState("Transcribiendo en el dispositivo");
      const text = await transcribeObservation(audioUri);
      setNote((current) => (current ? `${current} ${text}` : text));
      setModelState("Inferencia local lista");
    } catch (error) {
      Alert.alert("No se pudo transcribir", error instanceof Error ? error.message : "Error local de voz");
    }
  }

  async function handleExtract() {
    if (!note.trim() || !isReady) return;
    setIsExtracting(true);
    try {
      setExtraction(await extractObservation(`Cliente: ${client}\nCiudad: ${city}\nObservación: ${note}`));
    } catch (error) {
      Alert.alert("No se pudo estructurar", error instanceof Error ? error.message : "Error local de extracción");
    } finally {
      setIsExtracting(false);
    }
  }

  function updateEquipment(index: number, changes: Partial<EquipmentDraft>) {
    setExtraction((current) => current ? {
      ...current,
      equipments: current.equipments.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
    } : current);
  }

  async function handleSave() {
    if (!extraction || !client.trim() || !city.trim()) {
      Alert.alert("Falta información", "Indica cliente, ciudad y realiza la extracción antes de guardar.");
      return;
    }
    setIsSaving(true);
    const observation: LocalObservation = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      client: client.trim(),
      city: city.trim(),
      country: "",
      rawText: note.trim(),
      audioUri,
      photoUri,
      extraction,
      syncState: "Local",
      createdAt: new Date().toISOString(),
    };
    try {
      await saveObservation(observation);
      setObservations((current) => [observation, ...current]);
      setClient("");
      setCity("");
      setNote("");
      setAudioUri(null);
      setPhotoUri(null);
      setExtraction(null);
      Alert.alert("Guardado en el dispositivo", "La observación quedó almacenada localmente y pendiente de sincronización.");
    } catch (error) {
      Alert.alert("No se pudo guardar", error instanceof Error ? error.message : "Error de almacenamiento local");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ATLAS / FIELD INTELLIGENCE</Text>
          <Text style={styles.title}>Visita de campo</Text>
        </View>
        <View style={[styles.statusDot, isReady ? styles.statusReady : styles.statusWaiting]} />
      </View>

      {modelError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>QVAC requiere una build nativa</Text>
          <Text style={styles.errorText}>{modelError}</Text>
        </View>
      ) : (
        <View style={styles.modelBanner}>
          <View style={styles.modelCopy}>
            <Text style={styles.modelTitle}>{isReady ? "Procesamiento local activo" : modelState}</Text>
            <Text style={styles.modelText}>La evidencia no sale del dispositivo.</Text>
          </View>
          {modelProgress !== null && <Text style={styles.progress}>{modelProgress}%</Text>}
        </View>
      )}

      {tab === "capture" ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>CAPTURA SIN CONEXIÓN</Text>
              <Text style={styles.heroTitle}>Convierte una observación en una base verificable.</Text>
              <Text style={styles.heroText}>Dicta, escribe o fotografía solo equipos y placas autorizadas. Revisa cada sugerencia antes de confirmarla.</Text>
            </View>

            <Text style={styles.sectionLabel}>01 / CONTEXTO DE VISITA</Text>
            <View style={styles.card}>
              <TextInput value={client} onChangeText={setClient} placeholder="Cliente / hospital" placeholderTextColor={COLORS.muted} style={styles.input} />
              <TextInput value={city} onChangeText={setCity} placeholder="Ciudad" placeholderTextColor={COLORS.muted} style={styles.input} />
            </View>

            <Text style={styles.sectionLabel}>02 / EVIDENCIA</Text>
            <View style={styles.card}>
              <TextInput value={note} onChangeText={setNote} placeholder="Ej. Vi un tomógrafo Philips de aproximadamente 8 años en imagenología..." placeholderTextColor={COLORS.muted} multiline style={[styles.input, styles.noteInput]} />
              <View style={styles.actionRow}>
                <Pressable onPress={toggleRecording} style={[styles.actionButton, recorderState.isRecording && styles.actionButtonActive]}>
                  <Text style={styles.actionIcon}>{recorderState.isRecording ? "■" : "●"}</Text>
                  <Text style={styles.actionLabel}>{recorderState.isRecording ? "Detener" : "Dictar"}</Text>
                </Pressable>
                <Pressable onPress={openCamera} style={styles.actionButton}>
                  <Text style={styles.actionIcon}>▣</Text>
                  <Text style={styles.actionLabel}>{photoUri ? "Placa lista" : "Foto"}</Text>
                </Pressable>
                {audioUri && !recorderState.isRecording && <Pressable onPress={handleTranscribe} style={styles.transcribeButton}><Text style={styles.transcribeText}>Transcribir localmente</Text></Pressable>}
              </View>
              {photoUri && <Text style={styles.evidenceNote}>Foto guardada como evidencia. Retira cualquier contenido sensible antes de confirmar.</Text>}
            </View>

            <Text style={styles.sectionLabel}>03 / EXTRACCIÓN LOCAL</Text>
            <Pressable disabled={!isReady || isExtracting || !note.trim()} onPress={handleExtract} style={[styles.primaryButton, (!isReady || isExtracting || !note.trim()) && styles.disabledButton]}>
              {isExtracting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Estructurar con QVAC local</Text>}
            </Pressable>

            {extraction && <ReviewCard extraction={extraction} onChange={updateEquipment} onSave={handleSave} isSaving={isSaving} />}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.content}
          data={observations}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<><Text style={styles.sectionLabel}>BASE INSTALADA LOCAL</Text><Text style={styles.baseTitle}>{observations.length} observaciones en este dispositivo</Text></>}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Tu base empieza aquí</Text><Text style={styles.emptyText}>Las observaciones confirmadas se guardan en SQLite y pueden sincronizarse después.</Text></View>}
          renderItem={({ item }) => <ObservationRow item={item} />}
        />
      )}

      <View style={styles.tabBar}>
        <TabButton active={tab === "capture"} label="Capturar" onPress={() => setTab("capture")} />
        <TabButton active={tab === "base"} label="Base local" onPress={() => setTab("base")} />
      </View>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.cameraControls}>
            <Pressable onPress={() => setCameraOpen(false)}><Text style={styles.cameraCancel}>Cancelar</Text></Pressable>
            <Pressable onPress={capturePhoto} style={styles.shutter}><View style={styles.shutterInner} /></Pressable>
            <Text style={styles.cameraHint}>Solo equipos / placas</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ReviewCard({ extraction, onChange, onSave, isSaving }: { extraction: Extraction; onChange: (index: number, changes: Partial<EquipmentDraft>) => void; onSave: () => void; isSaving: boolean }) {
  return <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}><View><Text style={styles.sectionLabel}>04 / REVISIÓN HUMANA</Text><Text style={styles.reviewTitle}>{extraction.equipments.length} equipos candidatos</Text></View><Text style={styles.confidence}>{Math.round(extraction.confidence * 100)}%</Text></View>
    {extraction.equipments.map((equipment, index) => <View key={`${equipment.modality}-${index}`} style={styles.equipmentRow}>
      <View style={styles.equipmentTop}><Text style={styles.equipmentModality}>{equipment.modality}</Text><Text style={styles.status}>{equipment.status}</Text></View>
      <TextInput value={equipment.brand ?? ""} onChangeText={(brand) => onChange(index, { brand })} placeholder="Marca" placeholderTextColor={COLORS.muted} style={styles.smallInput} />
      <TextInput value={equipment.model ?? ""} onChangeText={(model) => onChange(index, { model })} placeholder="Modelo / serie desconocido" placeholderTextColor={COLORS.muted} style={styles.smallInput} />
      <View style={styles.inlineFields}><TextInput value={equipment.ageYears?.toString() ?? ""} onChangeText={(value) => onChange(index, { ageYears: value ? Number(value) : null })} placeholder="Años" keyboardType="number-pad" placeholderTextColor={COLORS.muted} style={[styles.smallInput, styles.shortInput]} /><Text style={styles.quantity}>Cantidad ×{equipment.quantity}</Text></View>
    </View>)}
    {extraction.nextQuestion && <View style={styles.followUp}><Text style={styles.followUpLabel}>SIGUIENTE PREGUNTA</Text><Text style={styles.followUpText}>{extraction.nextQuestion}</Text></View>}
    <Pressable onPress={onSave} disabled={isSaving} style={styles.confirmButton}>{isSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>Confirmar y guardar en el dispositivo</Text>}</Pressable>
  </View>;
}

function ObservationRow({ item }: { item: LocalObservation }) {
  return <View style={styles.observationRow}><View style={styles.rowTop}><Text style={styles.rowClient}>{item.client}</Text><Text style={styles.localPill}>{item.syncState}</Text></View><Text style={styles.rowMeta}>{item.city} · {new Date(item.createdAt).toLocaleDateString()}</Text><Text style={styles.rowNote} numberOfLines={2}>{item.rawText}</Text><Text style={styles.rowEquipment}>{item.extraction.equipments.map((equipment) => `${equipment.modality} ×${equipment.quantity}`).join("  ·  ") || "Sin equipos estructurados"}</Text></View>;
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.tab}><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text><View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} /></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.paper },
  flex: { flex: 1 },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#83D8D2", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: COLORS.white, fontSize: 24, fontWeight: "700", marginTop: 5 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusReady: { backgroundColor: "#5CD69A" },
  statusWaiting: { backgroundColor: "#F2B75A" },
  modelBanner: { backgroundColor: COLORS.tealSoft, paddingHorizontal: 20, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modelCopy: { flex: 1 },
  modelTitle: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  modelText: { color: COLORS.teal, fontSize: 11, marginTop: 2 },
  progress: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  errorBanner: { backgroundColor: "#FCE9E7", padding: 14 },
  errorTitle: { color: "#A33C35", fontWeight: "700" },
  errorText: { color: "#A33C35", fontSize: 11, marginTop: 4 },
  content: { padding: 20, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: COLORS.navy, borderRadius: 18, padding: 20, marginBottom: 10 },
  heroKicker: { color: "#83D8D2", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  heroTitle: { color: COLORS.white, fontSize: 25, lineHeight: 31, fontWeight: "700", marginTop: 10 },
  heroText: { color: "#C5D3D8", fontSize: 13, lineHeight: 20, marginTop: 10 },
  sectionLabel: { color: COLORS.teal, fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginTop: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 10 },
  input: { color: COLORS.ink, borderBottomWidth: 1, borderBottomColor: COLORS.line, paddingVertical: 11, fontSize: 15 },
  noteInput: { minHeight: 112, textAlignVertical: "top", borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  actionButton: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center", minWidth: 76 },
  actionButtonActive: { backgroundColor: COLORS.amberSoft, borderColor: COLORS.amber },
  actionIcon: { color: COLORS.teal, fontSize: 16, fontWeight: "700" },
  actionLabel: { color: COLORS.ink, fontSize: 11, fontWeight: "600", marginTop: 3 },
  transcribeButton: { backgroundColor: COLORS.tealSoft, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, flex: 1 },
  transcribeText: { color: COLORS.teal, fontSize: 11, fontWeight: "700", textAlign: "center" },
  evidenceNote: { color: COLORS.amber, fontSize: 11, lineHeight: 16 },
  primaryButton: { backgroundColor: COLORS.teal, borderRadius: 12, minHeight: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "700", textAlign: "center" },
  disabledButton: { opacity: 0.45 },
  reviewCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.teal, marginTop: 8 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  reviewTitle: { color: COLORS.ink, fontSize: 19, fontWeight: "700", marginTop: 4 },
  confidence: { color: COLORS.teal, fontSize: 22, fontWeight: "800" },
  equipmentRow: { borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 12, marginTop: 12, gap: 8 },
  equipmentTop: { flexDirection: "row", justifyContent: "space-between" },
  equipmentModality: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  status: { color: COLORS.amber, fontSize: 11, fontWeight: "700" },
  smallInput: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 9, color: COLORS.ink, fontSize: 13 },
  inlineFields: { flexDirection: "row", alignItems: "center", gap: 10 },
  shortInput: { flex: 1 },
  quantity: { color: COLORS.muted, fontSize: 12 },
  followUp: { backgroundColor: COLORS.amberSoft, borderRadius: 10, padding: 12, marginTop: 14 },
  followUpLabel: { color: COLORS.amber, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  followUpText: { color: COLORS.ink, fontSize: 13, lineHeight: 18, marginTop: 5 },
  confirmButton: { backgroundColor: COLORS.navy, minHeight: 50, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 16, paddingHorizontal: 12 },
  baseTitle: { color: COLORS.ink, fontSize: 24, fontWeight: "700", marginBottom: 8 },
  empty: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 22, marginTop: 14 },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "700" },
  emptyText: { color: COLORS.muted, lineHeight: 20, marginTop: 8 },
  observationRow: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, padding: 14, marginTop: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowClient: { color: COLORS.ink, fontSize: 16, fontWeight: "700", flex: 1 },
  localPill: { color: COLORS.green, backgroundColor: "#E2F5EA", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "700" },
  rowMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  rowNote: { color: COLORS.ink, fontSize: 13, lineHeight: 19, marginTop: 10 },
  rowEquipment: { color: COLORS.teal, fontSize: 11, fontWeight: "700", marginTop: 10 },
  tabBar: { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: "row", paddingBottom: Platform.OS === "android" ? 10 : 4 },
  tab: { flex: 1, alignItems: "center", paddingTop: 10 },
  tabLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  tabLabelActive: { color: COLORS.teal, fontWeight: "800" },
  tabIndicator: { width: 30, height: 3, borderRadius: 2, backgroundColor: "transparent", marginTop: 7 },
  tabIndicatorActive: { backgroundColor: COLORS.teal },
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraControls: { backgroundColor: "#000", minHeight: 118, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 20 },
  cameraCancel: { color: COLORS.white, fontSize: 14 },
  cameraHint: { color: "#AAB7BA", fontSize: 11, width: 90 },
  shutter: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, borderColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.white },
});
