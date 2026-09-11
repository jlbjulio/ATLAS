import { useEffect, useRef } from "react";
import {
  Animated,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";

import splashImage from "../../assets/splash.png";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 2500 }: SplashScreenProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    animation.start(() => onFinish());
    return () => animation.stop();
  }, [duration, onFinish, progress, fadeOut]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <ImageBackground
        source={splashImage}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: widthInterpolated },
              ]}
            />
          </View>
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
    justifyContent: "flex-end",
  },
  progressContainer: {
    paddingHorizontal: 48,
    paddingBottom: 96,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
});
