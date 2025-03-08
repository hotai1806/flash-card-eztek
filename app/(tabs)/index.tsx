import React, { useState, useRef } from "react";
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
} from "react-native";

const SAMPLE_CARDS = [
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
const SWIPE_THRESHOLD = 120; // Minimum distance required to trigger a swipe action

const App = () => {
  const [cards, setCards] = useState(SAMPLE_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);

  const flipAnimation = useRef(new Animated.Value(0)).current;
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;

  // Initialize PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal movements
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        // Update position based on gesture
        swipeAnimation.setValue(gestureState.dx);

        // Calculate opacity based on swipe distance
        const opacityValue =
          1 - Math.min(Math.abs(gestureState.dx) / (width * 1.5), 0.5);
        swipeOpacity.setValue(opacityValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Check if swipe was significant enough
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right (previous card)
          handleSwipeComplete("previous");
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left (next card)
          handleSwipeComplete("next");
        } else {
          // Return to center if not enough to trigger action
          Animated.spring(swipeAnimation, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();

          Animated.spring(swipeOpacity, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSwipeComplete = (direction: string) => {
    const moveToValue = direction === "next" ? -width : width;

    // Animate card moving out
    Animated.timing(swipeAnimation, {
      toValue: moveToValue,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Update index based on swipe direction
      if (direction === "next" && currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (direction === "previous" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }

      // Reset animations and flip state
      swipeAnimation.setValue(0);
      swipeOpacity.setValue(1);
      setIsFlipped(false);
      flipAnimation.setValue(0);
    });
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
      { translateX: swipeAnimation },
    ],
    opacity: swipeOpacity,
  };

  const backAnimatedStyle = {
    transform: [
      {
        rotateY: flipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ["180deg", "360deg"],
        }),
      },
      { translateX: swipeAnimation },
    ],
    opacity: swipeOpacity,
  };

  const markCard = (remembered: boolean) => {
    // Mark current card as completed if remembered
    if (remembered) {
      setCompleted([...completed, cards[currentIndex].id]);
    }

    // Move to next card or show completion if done
    if (currentIndex < cards.length - 1) {
      handleSwipeComplete("next");
    } else {
      const score = remembered ? completed.length + 1 : completed.length;
      Alert.alert(
        "Session Complete!",
        `You remembered ${score} out of ${cards.length} cards.`,
        [{ text: "Restart", onPress: resetSession }]
      );
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setCompleted([]);
    setIsFlipped(false);
    flipAnimation.setValue(0);
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

      <View style={styles.cardContainer}>
        <View style={styles.swipeInstructions}>
          <Text style={styles.swipeText}>Swipe left for next card</Text>
          <Text style={styles.swipeText}>Swipe right for previous card</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={flipCard}
          {...panResponder.panHandlers}
        >
          {/* Front of card */}
          <Animated.View
            style={[
              styles.card,
              styles.frontCard,
              frontAnimatedStyle,
              {
                opacity: Animated.multiply(
                  swipeOpacity,
                  flipAnimation.interpolate({
                    inputRange: [0.5, 1],
                    outputRange: [1, 0],
                    extrapolate: "clamp",
                  })
                ),
              },
            ]}
          >
            <Text style={styles.cardQuestion}>
              {cards[currentIndex].question}
            </Text>
            <Text style={styles.tapHint}>Tap to flip</Text>
          </Animated.View>

          {/* Back of card */}
          <Animated.View
            style={[
              styles.card,
              styles.backCard,
              backAnimatedStyle,
              {
                opacity: Animated.multiply(
                  swipeOpacity,
                  flipAnimation.interpolate({
                    inputRange: [0, 0.5],
                    outputRange: [0, 1],
                    extrapolate: "clamp",
                  })
                ),
              },
            ]}
          >
            <Text style={styles.cardAnswer}>{cards[currentIndex].answer}</Text>
            <Text style={styles.tapHint}>Tap to flip back</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

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
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
  },
  swipeInstructions: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 10,
  },
  swipeText: {
    color: "#666",
    fontSize: 14,
    marginBottom: 5,
  },
  card: {
    width: width - 60,
    height: 300,
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
