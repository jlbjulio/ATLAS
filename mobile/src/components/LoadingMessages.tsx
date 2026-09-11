import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface LoadingMessagesProps {
  messages: string[];
  interval?: number;
  style?: object;
}

export function LoadingMessages({
  messages,
  interval = 900,
  style,
}: LoadingMessagesProps) {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (messages.length <= 1) return;

    const cycle = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setIndex((current) => (current + 1) % messages.length);
    };

    const timer = setInterval(cycle, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval, fadeAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Text style={[styles.text, { opacity: fadeAnim }]}>
        {messages[index]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  text: {
    color: "#7A8B94",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
  },
});
