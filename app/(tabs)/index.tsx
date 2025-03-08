import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  PanResponder,
  PanResponderGestureState,
} from "react-native";

// Define card data type
interface Card {
  id: number;
  question: string;
  answer: string;
}

const SAMPLE_CARDS: Card[] = [
  {
    id: 1,
    question: "What is React Native?",
    answer: "A framework for building native apps using React",
  },
  {
    id: 2,
    question: "What language is React Native written in?",
    answer: "JavaScript and JSX",
  },
  {
    id: 3,
    question: "What is a component in React Native?",
    answer:
      "A reusable piece of UI that can be composed to build complex interfaces",
  },
  {
    id: 4,
    question: "What is JSX?",
    answer:
      "A syntax extension for JavaScript that allows writing HTML-like elements in JavaScript code",
  },
  {
    id: 5,
    question: "What is the difference between View and Text?",
    answer:
      "View is a container component, while Text is specifically for displaying text",
  },
];

const { width } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Reset position when current index changes
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    setIsFlipped(false);
    flipAnimation.setValue(0);
  }, [currentIndex]);

  // Initialize PanResponder for the card swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        _,
        gestureState: PanResponderGestureState
      ) => {
        // Only handle horizontal swipes, not taps
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        // Fix: Don't use ._value property directly
        position.extractOffset();
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        // Update card position with gesture movement
        position.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        position.flattenOffset();

        // Handle swipe right (previous)
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeCard("right");
        }
        // Handle swipe left (next)
        else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeCard("left");
        }
        // Return to center if not enough to trigger swipe
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const swipeCard = (direction: "left" | "right"): void => {
    const x = direction === "right" ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Update card index based on swipe direction
      if (direction === "left" && currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (direction === "right" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        // Spring back if can't go further
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const flipCard = (): void => {
    // Get current position value
    const currentX = position.x as unknown as { _value?: number };
    const xValue = currentX._value || 0;

    // Only allow flipping if not currently swiping
    if (Math.abs(xValue) < 5) {
      setIsFlipped(!isFlipped);
      Animated.spring(flipAnimation, {
        toValue: isFlipped ? 0 : 1,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  const frontAnimatedStyle = {
    transform: [
      { translateX: position.x },
      { rotate: rotation },
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
  };

  const backAnimatedStyle = {
    transform: [
      { translateX: position.x },
      { rotate: rotation },
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ["180deg", "360deg"],
        }),
      },
    ],
  };

  const markCard = (remembered: boolean): void => {
    if (remembered) {
      setCompleted([...completed, cards[currentIndex].id]);
    }

    if (currentIndex < cards.length - 1) {
      swipeCard("left");
    } else {
      const score = remembered ? completed.length + 1 : completed.length;
      Alert.alert(
        "Session Complete!",
        `You remembered ${score} out of ${cards.length} cards.`,
        [{ text: "Restart", onPress: resetSession }]
      );
    }
  };

  const resetSession = (): void => {
    setCurrentIndex(0);
    setCompleted([]);
    setIsFlipped(false);
    flipAnimation.setValue(0);
    position.setValue({ x: 0, y: 0 });
  };

  const renderCardContent = (): React.ReactNode => {
    if (currentIndex >= cards.length) {
      return (
        <View style={[styles.card, styles.endCard]}>
          <Text style={styles.endCardText}>All Cards Completed!</Text>
          <TouchableOpacity style={styles.restartButton} onPress={resetSession}>
            <Text style={styles.restartButtonText}>Restart</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={flipCard}
        style={styles.cardWrapper}
        {...panResponder.panHandlers}
      >
        {/* Front of card */}
        <Animated.View
          style={[
            styles.card,
            styles.frontCard,
            frontAnimatedStyle,
            {
              opacity: flipAnimation.interpolate({
                inputRange: [0.5, 1],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <Text style={styles.cardQuestion}>
            {cards[currentIndex].question}
          </Text>
          <Text style={styles.tapHint}>Tap to flip</Text>
          <View style={styles.swipeIndicators}>
            <View style={styles.swipeLeftIndicator}>
              <Text style={styles.swipeIndicatorText}>←</Text>
            </View>
            <View style={styles.swipeRightIndicator}>
              <Text style={styles.swipeIndicatorText}>→</Text>
            </View>
          </View>
        </Animated.View>

        {/* Back of card */}
        <Animated.View
          style={[
            styles.card,
            styles.backCard,
            backAnimatedStyle,
            {
              opacity: flipAnimation.interpolate({
                inputRange: [0, 0.5],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <Text style={styles.cardAnswer}>{cards[currentIndex].answer}</Text>
          <Text style={styles.tapHint}>Tap to flip back</Text>
          <View style={styles.swipeIndicators}>
            <View style={styles.swipeLeftIndicator}>
              <Text style={styles.swipeIndicatorText}>←</Text>
            </View>
            <View style={styles.swipeRightIndicator}>
              <Text style={styles.swipeIndicatorText}>→</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerText}>Flashcards</Text>
        <Text style={styles.progress}>
          {currentIndex + 1} / {cards.length}
        </Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Swipe left for next card, right for previous
        </Text>
      </View>

      <View style={styles.cardContainer}>{renderCardContent()}</View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.forgotButton]}
          onPress={() => markCard(false)}
        >
          <Text style={styles.buttonText}>Didn't know</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.knewButton]}
          onPress={() => markCard(true)}
        >
          <Text style={styles.buttonText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  progress: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  instructions: {
    alignItems: "center",
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
  },
  cardWrapper: {
    width: width - 60,
    height: 300,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backfaceVisibility: "hidden",
  },
  frontCard: {
    backgroundColor: "#fff",
    borderColor: "#2196F3",
    borderWidth: 2,
  },
  backCard: {
    backgroundColor: "#2196F3",
    position: "absolute",
    top: 0,
  },
  cardQuestion: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  cardAnswer: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
  },
  tapHint: {
    position: "absolute",
    bottom: 20,
    fontSize: 14,
    color: "#999",
  },
  swipeIndicators: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
  },
  swipeLeftIndicator: {
    opacity: 0.3,
  },
  swipeRightIndicator: {
    opacity: 0.3,
  },
  swipeIndicatorText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  endCard: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ccc",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  endCardText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  restartButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  restartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  forgotButton: {
    backgroundColor: "#ff6b6b",
  },
  knewButton: {
    backgroundColor: "#4caf50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default App;
