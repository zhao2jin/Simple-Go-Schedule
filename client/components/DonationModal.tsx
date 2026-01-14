import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
  onDonated: () => void;
}

interface DonationPrice {
  id: string;
  amount: number;
  currency: string;
  tier: string;
}

const TIER_LABELS: Record<string, string> = {
  small: "$2",
  medium: "$5",
  large: "$10",
  custom: "Custom",
};

export function DonationModal({ visible, onClose, onDonated }: DonationModalProps) {
  const { theme } = useTheme();
  const useGlass = isLiquidGlassAvailable() && Platform.OS === "ios";
  const [prices, setPrices] = useState<DonationPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (visible) {
      fetchPrices();
      setIsCustom(false);
      setCustomAmount("");
    }
  }, [visible]);

  const fetchPrices = async () => {
    try {
      const response = await fetch(new URL("/api/donation/prices", getApiUrl()).toString());
      const data = await response.json();
      if (data.prices && data.prices.length > 0) {
        setPrices(data.prices);
        setSelectedPrice(data.prices[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch donation prices:", error);
    }
  };

  const handleSelectPrice = (priceId: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedPrice(priceId);
    setIsCustom(false);
  };

  const handleSelectCustom = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setIsCustom(true);
    setSelectedPrice(null);
  };

  const handleDonate = async () => {
    if (!selectedPrice && !isCustom) return;
    if (isCustom && (!customAmount || parseFloat(customAmount) < 1)) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setLoading(true);
    
    try {
      const body = isCustom 
        ? { customAmount: Math.round(parseFloat(customAmount) * 100) }
        : { priceId: selectedPrice };

      const response = await fetch(new URL("/api/donation/checkout", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.url) {
        if (Platform.OS === "web") {
          window.location.href = data.url;
        } else {
          const result = await WebBrowser.openBrowserAsync(data.url);
          if (result.type === "dismiss") {
            onDonated();
          }
        }
        onClose();
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaybeLater = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const formatPrice = (amount: number) => {
    return `$${Math.round(amount / 100)}`;
  };

  const isValidCustomAmount = isCustom && customAmount && parseFloat(customAmount) >= 1;
  const canDonate = selectedPrice || isValidCustomAmount;

  const modalContent = (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.contentContainer}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="heart" size={32} color={theme.primary} />
        </View>
        
        <ThemedText type="h3" style={styles.title}>
          Support Simply Go
        </ThemedText>
        
        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          This app is free and always will be. If you find it useful, consider supporting development.
        </ThemedText>
        
        <View style={styles.priceContainer}>
          {prices.map((price) => (
            <Pressable
              key={price.id}
              onPress={() => handleSelectPrice(price.id)}
              style={[
                styles.priceButton,
                { 
                  borderColor: selectedPrice === price.id ? theme.primary : theme.border,
                  backgroundColor: selectedPrice === price.id ? theme.primary + "15" : "transparent",
                },
              ]}
            >
              <ThemedText 
                type="title" 
                style={[
                  styles.priceAmount,
                  { color: selectedPrice === price.id ? theme.primary : theme.text }
                ]}
              >
                {formatPrice(price.amount)}
              </ThemedText>
            </Pressable>
          ))}
          
          <Pressable
            onPress={handleSelectCustom}
            style={[
              styles.priceButton,
              { 
                borderColor: isCustom ? theme.primary : theme.border,
                backgroundColor: isCustom ? theme.primary + "15" : "transparent",
              },
            ]}
          >
            <ThemedText 
              type="title" 
              style={[
                styles.priceAmount,
                { color: isCustom ? theme.primary : theme.text }
              ]}
            >
              Custom
            </ThemedText>
          </Pressable>
        </View>

        {isCustom ? (
          <View style={[styles.customInputContainer, { borderColor: theme.border }]}>
            <ThemedText type="title" style={{ color: theme.text }}>$</ThemedText>
            <TextInput
              style={[styles.customInput, { color: theme.text }]}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="Enter amount"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <ThemedText type="body" style={{ color: theme.textSecondary }}>CAD</ThemedText>
          </View>
        ) : null}
        
        <Pressable
          onPress={handleDonate}
          disabled={loading || !canDonate}
          style={[
            styles.donateButton, 
            { 
              backgroundColor: theme.primary,
              opacity: loading || !canDonate ? 0.6 : 1,
            }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="credit-card" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <ThemedText type="title" style={styles.buttonText}>
                Donate Now
              </ThemedText>
            </>
          )}
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
    </KeyboardAvoidingView>
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
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    width: "100%",
  },
  priceButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  priceAmount: {
    fontSize: 16,
  },
  customInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: Spacing.xs,
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
