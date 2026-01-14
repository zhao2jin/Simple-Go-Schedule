import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
  onDonated: () => void;
}

const DONATION_URL = "https://ko-fi.com/gotracker";

export function DonationModal({ visible, onClose, onDonated }: DonationModalProps) {
  const { theme, isDark } = useTheme();
  const useGlass = isLiquidGlassAvailable() && Platform.OS === "ios";

  const handleDonate = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await Linking.openURL(DONATION_URL);
      onDonated();
    } catch {
      onClose();
    }
  };

  const handleMaybeLater = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const modalContent = (
    <View style={styles.contentContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
        <Feather name="heart" size={32} color={theme.primary} />
      </View>
      
      <ThemedText type="h3" style={styles.title}>
        Support GO Tracker
      </ThemedText>
      
      <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
        This app is free and always will be. If you find it useful, consider supporting development with a small donation.
      </ThemedText>
      
      <Pressable
        onPress={handleDonate}
        style={[styles.donateButton, { backgroundColor: theme.primary }]}
      >
        <Feather name="coffee" size={20} color="#FFFFFF" style={styles.buttonIcon} />
        <ThemedText type="title" style={styles.buttonText}>
          Buy Me a Coffee
        </ThemedText>
      </Pressable>
      
      <Pressable
        onPress={handleMaybeLater}
        style={[styles.laterButton, { borderColor: theme.border }]}
      >
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          Maybe Later
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        {useGlass ? (
          <GlassView
            glassEffectStyle="regular"
            tintColor={Colors.light.primary + "10"}
            style={styles.glassModal}
          >
            {modalContent}
          </GlassView>
        ) : (
          <View style={[styles.modal, { backgroundColor: theme.backgroundDefault }]}>
            {modalContent}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modal: {
    width: "85%",
    maxWidth: 340,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["3xl"],
  },
  glassModal: {
    width: "85%",
    maxWidth: 340,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["3xl"],
  },
  contentContainer: {
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 22,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
  },
  laterButton: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
