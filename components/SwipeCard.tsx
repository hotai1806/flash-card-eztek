import React, { useRef } from "react";
import { Animated, PanResponder, Dimensions, StyleSheet } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;
const TAP_SLOP = 10;

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onTap?: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  onTap,
}) => {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      position.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (
        Math.abs(gestureState.dx) < TAP_SLOP &&
        Math.abs(gestureState.dy) < TAP_SLOP
      ) {
        onTap?.();
        resetPosition();
      } else if (gestureState.dx > SWIPE_THRESHOLD) {
        swipeOffScreen("right");
      } else if (gestureState.dx < -SWIPE_THRESHOLD) {
        swipeOffScreen("left");
      } else {
        resetPosition();
      }
    },
  });

  const swipeOffScreen = (direction: "left" | "right") => {
    const x = direction === "right" ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (direction === "right" && onSwipeRight) onSwipeRight();
      if (direction === "left" && onSwipeLeft) onSwipeLeft();
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 40,
    height: 360,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});

export default SwipeCard;
