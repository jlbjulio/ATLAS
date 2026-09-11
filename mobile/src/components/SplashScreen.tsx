import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import iconImage from "../../assets/icon.png";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 3000 }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => onFinish());
    return () => animation.stop();
  }, [duration, onFinish, progress, fadeOut, contentFade]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <View style={styles.background}>
        <Animated.View
          style={[
            styles.content,
            { opacity: contentFade, marginTop: -insets.top },
          ]}
        >
          <Image source={iconImage} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brand}>ATLAS</Text>
          <Text style={styles.subBrand}>Field</Text>
          <Text style={styles.tagline}>
            LOCAL AI · REAL-WORLD ASSETS · TOMORROW'S DECISIONS
          </Text>
        </Animated.View>

        <View
          style={[
            styles.progressWrapper,
            { paddingBottom: Math.max(insets.bottom, 16) + 48 },
          ]}
        >
          <Text style={styles.loadingText}>Cargando inteligencia local…</Text>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: widthInterpolated }]}
            />
          </View>
        </View>
      </View>
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
    backgroundColor: "#0D1B24",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "300",
    letterSpacing: 8,
  },
  subBrand: {
    color: "#B8C5CC",
    fontSize: 22,
    fontWeight: "400",
    marginTop: 4,
    letterSpacing: 2,
  },
  tagline: {
    color: "#7A8B94",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1.5,
    marginTop: 24,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  progressWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  loadingText: {
    color: "#B8C5CC",
    fontSize: 13,
    marginBottom: 12,
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
});
