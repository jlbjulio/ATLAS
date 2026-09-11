import { StatusBar } from "expo-status-bar";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { listObservations, saveObservation } from "./src/db";
import {
  extractObservation,
  initializeQVAC,
  shutdownQVAC,
  transcribeObservation,
} from "./src/qvac";
import {
  delegateExtraction,
  delegateTranscription,
  pairWithProvider,
  pairWithInvitation,
  type P2PProvider,
} from "./src/p2p";
import { SplashScreen } from "./src/components/SplashScreen";
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

const FIELD_LABELS: Record<string, string> = {
  ageYears: "antigüedad",
  brand: "marca",
  city: "ciudad",
  client: "cliente",
  model: "modelo",
  modality: "modalidad",
  quantity: "cantidad",
  serial: "número de serie",
};

export default function App() {
  return (
    <SafeAreaProvider>
      <FieldApp />
    </SafeAreaProvider>
  );
}

function FieldApp() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [provider, setProvider] = useState<P2PProvider | null>(null);
  const [providerUrl, setProviderUrl] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingOpen, setPairingOpen] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [lastInference, setLastInference] = useState<"local" | "p2p" | null>(
    null,
  );
  const [qrScanning, setQrScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [micPermission, setMicPermission] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const inferenceAvailable = isReady || Boolean(provider);

  useEffect(() => {
    let mounted = true;
    void listObservations()
      .then((items) => mounted && setObservations(items))
      .catch(() => undefined);
    void (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (mounted) setMicPermission(permission.granted);
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
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
        if (mounted)
          setModelError(
            error instanceof Error ? error.message : "No se pudo preparar QVAC",
          );
      }
    })();
    return () => {
      mounted = false;
      void shutdownQVAC();
    };
  }, []);

  async function toggleRecording() {
    if (!inferenceAvailable || isTranscribing) return;
    if (!micPermission) {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      setMicPermission(permission.granted);
      if (!permission.granted) return;
    }
    if (recorderState.isRecording) {
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (!uri) {
        Alert.alert("No se pudo guardar el audio", "Intenta grabar de nuevo.");
        return;
      }
      const savedAudioUri = persistRecording(uri);
      setAudioUri(savedAudioUri);
      await handleTranscribe(savedAudioUri);
      return;
    }
    setAudioUri(null);
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

  async function handleTranscribe(uri: string) {
    if (!inferenceAvailable) return;
    setIsTranscribing(true);
    try {
      let text: string;
      if (provider) {
        try {
          setModelState("Delegando audio a la laptop");
          text = await delegateTranscription(provider, uri);
          setLastInference("p2p");
          setModelState("Audio procesado por laptop P2P");
        } catch (error) {
          if (!isReady) throw error;
          setModelState("Proveedor no disponible; procesando localmente");
          text = await transcribeObservation(uri);
          setLastInference("local");
        }
      } else {
        setModelState("Transcribiendo en el dispositivo");
        text = await transcribeObservation(uri);
        setLastInference("local");
      }
      text = text.trim();
      if (!text) throw new Error("No se detectó voz en la grabación");
      setNote((current) => (current ? `${current}\n${text}` : text));
      setModelState(provider ? "Proveedor P2P listo" : "Inferencia local lista");
    } catch (error) {
      Alert.alert(
        "No se pudo transcribir",
        error instanceof Error ? error.message : "Error local de voz",
      );
      setModelState(provider ? "Proveedor P2P listo" : "Inferencia local lista");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleExtract() {
    if (!note.trim() || !inferenceAvailable) return;
    setIsExtracting(true);
    try {
      const context = `Cliente: ${client}\nCiudad: ${city}\nObservación: ${note}`;
      if (provider) {
        try {
          setModelState("Delegando extracción a la laptop");
          setExtraction(await delegateExtraction(provider, context));
          setLastInference("p2p");
        } catch (error) {
          if (!isReady) throw error;
          setModelState("Proveedor no disponible; procesando localmente");
          setExtraction(await extractObservation(context));
          setLastInference("local");
        }
      } else {
        setModelState("Estructurando en el dispositivo");
        setExtraction(await extractObservation(context));
        setLastInference("local");
      }
      setModelState(provider ? "Proveedor P2P listo" : "Inferencia local lista");
    } catch (error) {
      Alert.alert(
        "No se pudo estructurar",
        error instanceof Error ? error.message : "Error local de extracción",
      );
      setModelState(provider ? "Proveedor P2P listo" : "Inferencia local lista");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handlePair() {
    setIsPairing(true);
    try {
      const paired = await pairWithProvider(providerUrl, pairingCode);
      setProvider(paired);
      setPairingCode("");
      setPairingOpen(false);
      setModelState("Proveedor P2P listo");
    } catch (error) {
      Alert.alert(
        "No se pudo emparejar",
        error instanceof Error ? error.message : "Error de proveedor P2P",
      );
    } finally {
      setIsPairing(false);
    }
  }

  async function startQrScanning() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert(
          "Permiso de cámara",
          "Se necesita acceso a la cámara para escanear el código QR de la laptop.",
        );
        return;
      }
    }
    setQrScanning(true);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (!qrScanning) return;
    setQrScanning(false);
    setIsPairing(true);
    pairWithInvitation(data)
      .then((paired) => {
        setProvider(paired);
        setPairingCode("");
        setPairingOpen(false);
        setManualMode(false);
        setModelState("Proveedor P2P listo");
      })
      .catch((error) => {
        Alert.alert(
          "No se pudo emparejar",
          error instanceof Error ? error.message : "Error de proveedor P2P",
        );
      })
      .finally(() => setIsPairing(false));
  }

  function updateEquipment(index: number, changes: Partial<EquipmentDraft>) {
    setExtraction((current) =>
      current
        ? {
            ...current,
            equipments: current.equipments.map((item, itemIndex) =>
              itemIndex === index ? { ...item, ...changes } : item,
            ),
          }
        : current,
    );
  }

  async function handleSave() {
    if (!extraction || !client.trim() || !city.trim()) {
      Alert.alert(
        "Falta información",
        "Indica cliente, ciudad y realiza la extracción antes de guardar.",
      );
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
      Alert.alert(
        "Guardado en el dispositivo",
        "La observación quedó almacenada localmente y pendiente de sincronización.",
      );
    } catch (error) {
      Alert.alert(
        "No se pudo guardar",
        error instanceof Error
          ? error.message
          : "Error de almacenamiento local",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (showSplash) {
    return <SplashScreen duration={4500} onFinish={() => setShowSplash(false)} />;
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ATLAS / FIELD INTELLIGENCE</Text>
          <Text style={styles.title}>Visita de campo</Text>
        </View>
        <View
          style={[
            styles.statusDot,
            inferenceAvailable ? styles.statusReady : styles.statusWaiting,
          ]}
        />
      </View>

      {modelError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>QVAC requiere una build nativa</Text>
          <Text style={styles.errorText}>{modelError}</Text>
        </View>
      ) : (
        <View style={styles.modelBanner}>
          <View style={styles.modelCopy}>
            <Text style={styles.modelTitle}>
              {provider
                ? "Proveedor P2P conectado"
                : isReady
                  ? "Procesamiento local activo"
                  : modelState}
            </Text>
            <Text style={styles.modelText}>
              {provider
                ? "Texto y audio viajan directo a la laptop emparejada."
                : "La evidencia no sale del dispositivo."}
            </Text>
          </View>
          {modelProgress !== null && (
            <Text style={styles.progress}>{modelProgress}%</Text>
          )}
        </View>
      )}

      {tab === "capture" ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>CAPTURA SIN CONEXIÓN</Text>
              <Text style={styles.heroTitle}>
                Convierte una observación en una base verificable.
              </Text>
              <Text style={styles.heroText}>
                Dicta, escribe o fotografía solo equipos y placas autorizadas.
                Revisa cada sugerencia antes de confirmarla.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>CAPACIDAD COMPARTIDA</Text>
            <View style={styles.providerCard}>
              <View style={styles.providerCopy}>
                <Text style={styles.providerTitle}>
                  {provider ? "Laptop P2P lista" : "Inferencia local disponible"}
                </Text>
                <Text style={styles.providerText}>
                  {provider
                    ? "Audio y extracción se delegan primero. Si no responde, ATLAS usa QVAC local."
                    : "Empareja una laptop en la misma Wi-Fi para delegar audio y texto cuando convenga."}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (provider) {
                    setProvider(null);
                    setModelState(isReady ? "Inferencia local lista" : "Proveedor desconectado");
                  } else {
                    setPairingOpen(true);
                  }
                }}
                style={styles.providerButton}
              >
                <Text style={styles.providerButtonText}>
                  {provider ? "Desconectar" : "Conectar"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>01 / CONTEXTO DE VISITA</Text>
            <View style={styles.card}>
              <TextInput
                value={client}
                onChangeText={setClient}
                placeholder="Cliente / hospital"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
              />
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Ciudad"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
              />
            </View>

            <Text style={styles.sectionLabel}>02 / EVIDENCIA</Text>
            <View style={styles.card}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Ej. Vi un tomógrafo Philips de aproximadamente 8 años en imagenología..."
                placeholderTextColor={COLORS.muted}
                multiline
                style={[styles.input, styles.noteInput]}
              />
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel={
                    recorderState.isRecording
                      ? "Detener dictado"
                      : "Iniciar dictado"
                  }
                  disabled={!inferenceAvailable || isTranscribing}
                  onPress={toggleRecording}
                  style={[
                    styles.actionButton,
                    recorderState.isRecording && styles.actionButtonActive,
                    (!inferenceAvailable || isTranscribing) && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.actionIcon}>
                    {recorderState.isRecording ? "■" : "●"}
                  </Text>
                  <Text style={styles.actionLabel}>
                    {recorderState.isRecording
                      ? "Detener"
                      : isTranscribing
                        ? "Transcribiendo"
                        : "Dictar"}
                  </Text>
                </Pressable>
                <Pressable onPress={openCamera} style={styles.actionButton}>
                  <Text style={styles.actionIcon}>▣</Text>
                  <Text style={styles.actionLabel}>
                    {photoUri ? "Placa lista" : "Foto"}
                  </Text>
                </Pressable>
              </View>
              {recorderState.isRecording && (
                <Text style={styles.recordingNote}>
                  Grabando localmente. Toca Detener para transcribir
                  automáticamente.
                </Text>
              )}
              {audioUri && !recorderState.isRecording && !isTranscribing && (
                <Text style={styles.audioNote}>
                  Dictado transcrito {lastInference === "p2p" ? "por laptop P2P" : "localmente"} y añadido a la observación.
                </Text>
              )}
              {photoUri && (
                <Text style={styles.evidenceNote}>
                  Foto guardada como evidencia. Retira cualquier contenido
                  sensible antes de confirmar.
                </Text>
              )}
            </View>

            <Text style={styles.sectionLabel}>
              03 / {provider ? "EXTRACCIÓN P2P" : "EXTRACCIÓN LOCAL"}
            </Text>
            <Pressable
              disabled={
                !inferenceAvailable || isExtracting || isTranscribing || !note.trim()
              }
              onPress={handleExtract}
              style={[
                styles.primaryButton,
                (!inferenceAvailable || isExtracting || isTranscribing || !note.trim()) &&
                  styles.disabledButton,
              ]}
            >
              {isExtracting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                    {provider ? "Estructurar con laptop P2P" : "Estructurar con QVAC local"}
                </Text>
              )}
            </Pressable>

            {extraction && (
              <ReviewCard
                extraction={extraction}
                onChange={updateEquipment}
                onSave={handleSave}
                isSaving={isSaving}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.content}
          data={observations}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionLabel}>BASE INSTALADA LOCAL</Text>
              <Text style={styles.baseTitle}>
                {observations.length} observaciones en este dispositivo
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Tu base empieza aquí</Text>
              <Text style={styles.emptyText}>
                Las observaciones confirmadas se guardan en SQLite y pueden
                sincronizarse después.
              </Text>
            </View>
          }
          renderItem={({ item }) => <ObservationRow item={item} />}
        />
      )}

      <View
        style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <TabButton
          active={tab === "capture"}
          label="Capturar"
          onPress={() => setTab("capture")}
        />
        <TabButton
          active={tab === "base"}
          label="Base local"
          onPress={() => setTab("base")}
        />
      </View>

      <Modal
        visible={cameraOpen}
        animationType="slide"
        onRequestClose={() => setCameraOpen(false)}
      >
        <View style={styles.cameraScreen}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View
            style={[
              styles.cameraControls,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Pressable onPress={() => setCameraOpen(false)}>
              <Text style={styles.cameraCancel}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={capturePhoto} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </Pressable>
            <Text style={styles.cameraHint}>Solo equipos / placas</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pairingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPairingOpen(false);
          setQrScanning(false);
          setManualMode(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.pairingSheet,
              { paddingBottom: Math.max(insets.bottom, 12) + 22 },
            ]}
          >
            {qrScanning ? (
              <>
                <Text style={styles.pairingTitle}>Enlazar con laptop</Text>
                <Text style={styles.pairingText}>
                  Apunta la cámara al código QR de la laptop.
                </Text>
                <View style={styles.qrScannerContainer}>
                  <CameraView
                    style={styles.qrScanner}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={handleBarcodeScanned}
                  />
                </View>
                <Pressable
                  onPress={() => setQrScanning(false)}
                  style={styles.modalCancel}
                >
                  <Text style={styles.modalCancelText}>Cancelar escaneo</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.pairingTitle}>Enlazar con laptop</Text>
                <Text style={styles.pairingText}>
                  Conecta ambos dispositivos a la misma Wi-Fi y escanea el código que muestra la laptop.
                </Text>
                <Pressable
                  disabled={isPairing}
                  onPress={startQrScanning}
                  style={[
                    styles.modalConnect,
                    styles.qrButton,
                    isPairing && styles.disabledButton,
                  ]}
                >
                  {isPairing ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalConnectText}>
                      Escanear código QR
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setManualMode((current) => !current)}
                  style={styles.modalToggle}
                >
                  <Text style={styles.modalToggleText}>
                    {manualMode ? "Ocultar entrada manual" : "Ingresar manualmente"}
                  </Text>
                </Pressable>
                {manualMode && (
                  <>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      placeholder="http://192.168.1.20:8000"
                      placeholderTextColor={COLORS.muted}
                      value={providerUrl}
                      onChangeText={setProviderUrl}
                      style={styles.modalInput}
                    />
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Código de emparejamiento"
                      placeholderTextColor={COLORS.muted}
                      secureTextEntry
                      value={pairingCode}
                      onChangeText={setPairingCode}
                      style={styles.modalInput}
                    />
                    <View style={styles.modalActions}>
                      <Pressable
                        onPress={() => setPairingOpen(false)}
                        style={styles.modalCancel}
                      >
                        <Text style={styles.modalCancelText}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        disabled={
                          isPairing || !providerUrl.trim() || !pairingCode.trim()
                        }
                        onPress={handlePair}
                        style={[
                          styles.modalConnect,
                          (isPairing ||
                            !providerUrl.trim() ||
                            !pairingCode.trim()) &&
                            styles.disabledButton,
                        ]}
                      >
                        {isPairing ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <Text style={styles.modalConnectText}>Emparejar</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
                {!manualMode && (
                  <Pressable
                    onPress={() => setPairingOpen(false)}
                    style={styles.modalCancel}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function persistRecording(uri: string): string {
  const source = new File(uri);
  if (!source.exists)
    throw new Error("No se pudo acceder a la grabación local");

  const audioDirectory = new Directory(Paths.document, "audio");
  audioDirectory.create({ idempotent: true, intermediates: true });
  const destination = new File(audioDirectory, `recording-${Date.now()}.m4a`);
  source.copy(destination);
  return destination.uri;
}

function ReviewCard({
  extraction,
  onChange,
  onSave,
  isSaving,
}: {
  extraction: Extraction;
  onChange: (index: number, changes: Partial<EquipmentDraft>) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewHeaderCopy}>
          <Text style={styles.sectionLabel}>04 / REVISIÓN HUMANA</Text>
          <Text style={styles.reviewTitle}>
            {extraction.equipments.length} equipos candidatos
          </Text>
          <Text style={styles.reviewHint}>
            Revisa cada valor antes de guardarlo como registro local.
          </Text>
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceLabel}>CONFIANZA</Text>
          <Text style={styles.confidence}>
            {Math.round(extraction.confidence * 100)}%
          </Text>
        </View>
      </View>
      <View style={styles.statusLegend}>
        <Text style={styles.statusLegendTitle}>CÓMO LEER LOS ESTADOS</Text>
        <Text style={styles.statusLegendText}>
          Reportado = explícito · Estimado = aproximado · Desconocido = sin
          evidencia
        </Text>
      </View>
      {extraction.equipments.map((equipment, index) => (
        <View
          key={`${equipment.modality}-${index}`}
          style={styles.equipmentRow}
        >
          <View style={styles.equipmentTop}>
            <Text style={styles.equipmentModality}>{equipment.modality}</Text>
            <Text style={styles.status}>{equipment.status}</Text>
          </View>
          <TextInput
            value={equipment.brand ?? ""}
            onChangeText={(brand) => onChange(index, { brand })}
            placeholder="Marca"
            placeholderTextColor={COLORS.muted}
            style={styles.smallInput}
          />
          <TextInput
            value={equipment.model ?? ""}
            onChangeText={(model) => onChange(index, { model })}
            placeholder="Modelo / serie desconocido"
            placeholderTextColor={COLORS.muted}
            style={styles.smallInput}
          />
          <View style={styles.inlineFields}>
            <TextInput
              value={equipment.ageYears?.toString() ?? ""}
              onChangeText={(value) =>
                onChange(index, { ageYears: value ? Number(value) : null })
              }
              placeholder="Años"
              keyboardType="number-pad"
              placeholderTextColor={COLORS.muted}
              style={[styles.smallInput, styles.shortInput]}
            />
            <Text style={styles.quantity}>Cantidad ×{equipment.quantity}</Text>
          </View>
        </View>
      ))}
      {(extraction.nextQuestion || extraction.missingFields.length > 0) && (
        <View style={styles.followUp}>
          <Text style={styles.followUpLabel}>
            DATO PRIORITARIO POR CONFIRMAR
          </Text>
          {extraction.nextQuestion && (
            <Text style={styles.followUpText}>{extraction.nextQuestion}</Text>
          )}
          {extraction.missingFields.length > 0 && (
            <Text style={styles.missingFields}>
              También falta: {formatMissingFields(extraction.missingFields)}
            </Text>
          )}
        </View>
      )}
      <Pressable
        onPress={onSave}
        disabled={isSaving}
        style={styles.confirmButton}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            Revisar y guardar como registro local
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function formatMissingFields(fields: string[]): string {
  return fields.map((field) => FIELD_LABELS[field] ?? field).join(", ");
}

function ObservationRow({ item }: { item: LocalObservation }) {
  return (
    <View style={styles.observationRow}>
      <View style={styles.rowTop}>
        <Text style={styles.rowClient}>{item.client}</Text>
        <Text style={styles.localPill}>{item.syncState}</Text>
      </View>
      <Text style={styles.rowMeta}>
        {item.city} · {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      <Text style={styles.rowNote} numberOfLines={2}>
        {item.rawText}
      </Text>
      <Text style={styles.rowEquipment}>
        {item.extraction.equipments
          .map((equipment) => `${equipment.modality} ×${equipment.quantity}`)
          .join("  ·  ") || "Sin equipos estructurados"}
      </Text>
    </View>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tab}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
      <View
        style={[styles.tabIndicator, active && styles.tabIndicatorActive]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.paper },
  flex: { flex: 1 },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: "#83D8D2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: { color: COLORS.white, fontSize: 24, fontWeight: "700", marginTop: 5 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusReady: { backgroundColor: "#5CD69A" },
  statusWaiting: { backgroundColor: "#F2B75A" },
  modelBanner: {
    backgroundColor: COLORS.tealSoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modelCopy: { flex: 1 },
  modelTitle: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  modelText: { color: COLORS.teal, fontSize: 11, marginTop: 2 },
  progress: { color: COLORS.teal, fontSize: 13, fontWeight: "700" },
  errorBanner: { backgroundColor: "#FCE9E7", padding: 14 },
  errorTitle: { color: "#A33C35", fontWeight: "700" },
  errorText: { color: "#A33C35", fontSize: 11, marginTop: 4 },
  content: { padding: 20, paddingBottom: 32, gap: 12 },
  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 20,
    marginBottom: 10,
  },
  heroKicker: {
    color: "#83D8D2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "700",
    marginTop: 10,
  },
  heroText: { color: "#C5D3D8", fontSize: 13, lineHeight: 20, marginTop: 10 },
  sectionLabel: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 10,
  },
  providerCard: {
    backgroundColor: "#EAF2F5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#B7D1D9",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  providerCopy: { flex: 1 },
  providerTitle: { color: COLORS.navy, fontSize: 14, fontWeight: "700" },
  providerText: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  providerButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  providerButtonText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  input: {
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingVertical: 11,
    fontSize: 15,
  },
  noteInput: {
    minHeight: 112,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: "center",
    minWidth: 76,
  },
  actionButtonActive: {
    backgroundColor: COLORS.amberSoft,
    borderColor: COLORS.amber,
  },
  actionIcon: { color: COLORS.teal, fontSize: 16, fontWeight: "700" },
  actionLabel: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  recordingNote: { color: COLORS.amber, fontSize: 11, lineHeight: 16 },
  audioNote: { color: COLORS.green, fontSize: 11, lineHeight: 16 },
  evidenceNote: { color: COLORS.amber, fontSize: 11, lineHeight: 16 },
  primaryButton: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  disabledButton: { opacity: 0.45 },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.teal,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  reviewHeaderCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  reviewTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: "700",
    marginTop: 4,
  },
  reviewHint: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  confidenceBadge: {
    alignItems: "flex-end",
    backgroundColor: COLORS.tealSoft,
    borderRadius: 9,
    flexShrink: 0,
    minWidth: 58,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  confidenceLabel: {
    color: COLORS.teal,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  confidence: {
    color: COLORS.teal,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 1,
  },
  statusLegend: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    marginTop: 12,
    padding: 10,
  },
  statusLegendTitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusLegendText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  equipmentRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 12,
    marginTop: 12,
    gap: 8,
  },
  equipmentTop: { flexDirection: "row", justifyContent: "space-between" },
  equipmentModality: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  status: { color: COLORS.amber, fontSize: 11, fontWeight: "700" },
  smallInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 9,
    color: COLORS.ink,
    fontSize: 13,
  },
  inlineFields: { flexDirection: "row", alignItems: "center", gap: 10 },
  shortInput: { flex: 1 },
  quantity: { color: COLORS.muted, fontSize: 12 },
  followUp: {
    backgroundColor: COLORS.amberSoft,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  followUpLabel: {
    color: COLORS.amber,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  followUpText: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  missingFields: {
    color: COLORS.amber,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 7,
  },
  confirmButton: {
    backgroundColor: COLORS.navy,
    minHeight: 50,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 12,
  },
  baseTitle: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  empty: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 16,
    padding: 22,
    marginTop: 14,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "700" },
  emptyText: { color: COLORS.muted, lineHeight: 20, marginTop: 8 },
  observationRow: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowClient: { color: COLORS.ink, fontSize: 16, fontWeight: "700", flex: 1 },
  localPill: {
    color: COLORS.green,
    backgroundColor: "#E2F5EA",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  rowMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  rowNote: { color: COLORS.ink, fontSize: 13, lineHeight: 19, marginTop: 10 },
  rowEquipment: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: "row",
    minHeight: 64,
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 10 },
  tabLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  tabLabelActive: { color: COLORS.teal, fontWeight: "800" },
  tabIndicator: {
    width: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginTop: 7,
  },
  tabIndicatorActive: { backgroundColor: COLORS.teal },
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraControls: {
    backgroundColor: "#000",
    minHeight: 118,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  cameraCancel: { color: COLORS.white, fontSize: 14 },
  cameraHint: { color: "#AAB7BA", fontSize: 11, width: 90 },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(12, 40, 53, 0.56)",
    justifyContent: "flex-end",
  },
  pairingSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    gap: 12,
  },
  pairingTitle: { color: COLORS.ink, fontSize: 21, fontWeight: "700" },
  pairingText: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    padding: 12,
    color: COLORS.ink,
    fontSize: 14,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  modalCancel: { justifyContent: "center", paddingHorizontal: 14 },
  modalCancelText: { color: COLORS.muted, fontSize: 14, fontWeight: "700" },
  modalConnect: {
    backgroundColor: COLORS.teal,
    minWidth: 116,
    minHeight: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConnectText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },
  qrButton: { minWidth: 200, minHeight: 52 },
  modalToggle: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalToggleText: {
    color: COLORS.teal,
    fontSize: 13,
    fontWeight: "600",
  },
  qrScannerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.line,
    height: 280,
  },
  qrScanner: { flex: 1 },
});
