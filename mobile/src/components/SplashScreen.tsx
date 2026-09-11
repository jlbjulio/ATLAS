import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import splashBackground from "../../assets/splash-bg.png";
import wordmarkImage from "../../assets/wordmark.png";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 5500 }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  const [progressPercent, setProgressPercent] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    Animated.timing(contentFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const progressAnimation = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    const progressListener = progress.addListener(({ value }) => {
      setProgressPercent(Math.round(value * 100));
    });

    progressAnimation.start();

    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, duration);

    const finishTimer = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish();
      }
    }, duration + 500);

    return () => {
      progress.removeListener(progressListener);
      progressAnimation.stop();
      pulse.stop();
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish, progress, fadeOut, contentFade, dotPulse]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <ImageBackground
        source={splashBackground}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <Animated.View
          style={[
            styles.content,
            { opacity: contentFade, marginTop: -insets.top },
          ]}
        >
          <Image
            source={wordmarkImage}
            style={styles.logo}
            resizeMode="contain"
            tintColor="#FFFFFF"
          />
          <Text style={styles.subBrand}>Field</Text>
          <Text style={styles.tagline}>
            IA LOCAL · ACTIVOS DEL MUNDO REAL · DECISIONES DEL MAÑANA
          </Text>
        </Animated.View>

        <View
          style={[
            styles.progressWrapper,
            { paddingBottom: Math.max(insets.bottom, 16) + 48 },
          ]}
        >
          <View style={styles.loadingRow}>
            <Animated.View
              style={[styles.pulseDot, { opacity: dotPulse }]}
            />
            <Text style={styles.loadingText}>
              Cargando inteligencia local
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: widthInterpolated }]}
            />
          </View>
          <Text style={styles.percentText}>{progressPercent}%</Text>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 27, 36, 0.55)",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 220,
    height: 69,
    marginBottom: 12,
  },
  subBrand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "400",
    marginTop: 4,
    letterSpacing: 2,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    color: "#DCE5E9",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1.5,
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 32,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00BFA5",
    marginRight: 10,
  },
  loadingText: {
    color: "#B8C5CC",
    fontSize: 14,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  percentText: {
    color: "#7A8B94",
    fontSize: 11,
    marginTop: 8,
  },
});
