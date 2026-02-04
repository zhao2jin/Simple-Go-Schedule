import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ServiceAlert } from "@shared/types";

interface ServiceAlertBannerProps {
  alerts: ServiceAlert[];
  affectedRouteCodes?: string[];
}

export function ServiceAlertBanner({ alerts, affectedRouteCodes }: ServiceAlertBannerProps) {
  const { theme } = useTheme();
  const [expandedAlertIds, setExpandedAlertIds] = React.useState<Set<string>>(new Set());

  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Filter alerts to show only those affecting user's routes if route codes provided
  const filteredAlerts = affectedRouteCodes && affectedRouteCodes.length > 0
    ? alerts.filter(alert => {
        if (!alert.affectedRoutes || alert.affectedRoutes.length === 0) {
          return true; // Show alerts with no specific routes (system-wide)
        }
        return alert.affectedRoutes.some(route => affectedRouteCodes.includes(route));
      })
    : alerts;

  if (filteredAlerts.length === 0) {
    return null;
  }

  const toggleAlert = (alertId: string) => {
    setExpandedAlertIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: ServiceAlert["severity"]) => {
    switch (severity) {
      case "severe":
        return "#DC2626"; // Red
      case "warning":
        return "#F59E0B"; // Amber
      case "info":
      default:
        return "#3B82F6"; // Blue
    }
  };

  const getSeverityIcon = (severity: ServiceAlert["severity"]) => {
    switch (severity) {
      case "severe":
        return "alert-circle";
      case "warning":
        return "alert-triangle";
      case "info":
      default:
        return "info";
    }
  };

  return (
    <View style={styles.container}>
      {filteredAlerts.map((alert) => {
        const isExpanded = expandedAlertIds.has(alert.id);
        const severityColor = getSeverityColor(alert.severity);
        const icon = getSeverityIcon(alert.severity);

        return (
          <Pressable
            key={alert.id}
            onPress={() => toggleAlert(alert.id)}
            style={({ pressed }) => [
              styles.alertCard,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: severityColor,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.alertHeader}>
              <View style={styles.iconTitleRow}>
                <View style={[styles.iconContainer, { backgroundColor: severityColor }]}>
                  <Feather name={icon as any} size={16} color="#FFFFFF" />
                </View>
                <ThemedText type="bodySm" style={styles.alertTitle} numberOfLines={isExpanded ? undefined : 1}>
                  {alert.title}
                </ThemedText>
              </View>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </View>

            {isExpanded && (
              <View style={styles.alertBody}>
                <ThemedText type="bodySm" style={styles.alertDescription}>
                  {alert.description}
                </ThemedText>
                {alert.affectedRoutes && alert.affectedRoutes.length > 0 && (
                  <View style={styles.affectedRoutesContainer}>
                    <ThemedText type="caption" style={styles.affectedRoutesLabel}>
                      Affected Lines:
                    </ThemedText>
                    <View style={styles.routeBadges}>
                      {alert.affectedRoutes.map((route, idx) => (
                        <View
                          key={idx}
                          style={[styles.routeBadge, { backgroundColor: theme.backgroundSubtle }]}
                        >
                          <ThemedText type="caption" style={styles.routeBadgeText}>
                            {route}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  alertCard: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    flex: 1,
    fontWeight: "600",
  },
  alertBody: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  alertDescription: {
    lineHeight: 20,
  },
  affectedRoutesContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  affectedRoutesLabel: {
    fontWeight: "600",
    opacity: 0.7,
  },
  routeBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  routeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  routeBadgeText: {
    fontWeight: "600",
  },
});
