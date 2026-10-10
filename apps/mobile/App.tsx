import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type { HealthResponse } from "@pharmacy/contracts";

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function App() {
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("API request failed");
        return response.json() as Promise<HealthResponse>;
      })
      .then(() => setApiStatus("online"))
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("offline");
      });
    return () => controller.abort();
  }, []);

  const statusLabel =
    apiStatus === "online"
      ? "Connected"
      : apiStatus === "checking"
        ? "Connecting"
        : "Unavailable";

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandGlyph}>+</Text>
          </View>
          <Text style={styles.brand}>PHARMACY DESK</Text>
        </View>
        <Text style={styles.eyebrow}>MOBILE WORKSPACE</Text>
        <Text style={styles.title}>Stock, close at hand.</Text>
        <Text style={styles.description}>
          Your mobile tools for receiving, scanning, and counting pharmacy
          inventory will live here.
        </Text>
        <View style={styles.connectionPanel}>
          <View
            style={[
              styles.dot,
              apiStatus === "online"
                ? styles.online
                : apiStatus === "offline"
                  ? styles.offline
                  : null,
            ]}
          />
          <View style={styles.connectionCopy}>
            <Text style={styles.connectionTitle}>Backend connection</Text>
            <Text style={styles.endpoint} numberOfLines={2}>
              {apiBaseUrl}
            </Text>
          </View>
          {apiStatus === "checking" ? (
            <ActivityIndicator color="#537b45" />
          ) : (
            <Text
              style={[
                styles.status,
                apiStatus === "online"
                  ? styles.onlineText
                  : apiStatus === "offline"
                    ? styles.offlineText
                    : null,
              ]}
            >
              {statusLabel}
            </Text>
          )}
        </View>
        <View style={styles.note}>
          <Text style={styles.noteTitle}>Development setup</Text>
          <Text style={styles.noteBody}>
            For a physical phone, set EXPO_PUBLIC_API_URL to your computer's
            Wi-Fi address, then restart Expo.
          </Text>
        </View>
      </View>
      <Text style={styles.footer}>PHARMACY OPERATIONS</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f5f1" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 25 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 70,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e3931",
  },
  brandGlyph: {
    color: "#c8e46a",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  brand: {
    color: "#294238",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  eyebrow: {
    marginBottom: 10,
    color: "#71877a",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    maxWidth: 310,
    color: "#1c2a25",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 41,
  },
  description: {
    maxWidth: 340,
    marginTop: 12,
    color: "#718078",
    fontSize: 14,
    lineHeight: 22,
  },
  connectionPanel: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 32,
    padding: 15,
    borderWidth: 1,
    borderColor: "#dce4d7",
    borderLeftWidth: 3,
    borderLeftColor: "#7fa952",
    backgroundColor: "#fbfcf8",
  },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#e8bd5b" },
  online: { backgroundColor: "#74a853" },
  offline: { backgroundColor: "#d77a67" },
  connectionCopy: { flex: 1 },
  connectionTitle: { color: "#263c31", fontSize: 13, fontWeight: "700" },
  endpoint: { marginTop: 5, color: "#77847b", fontSize: 10 },
  status: { color: "#8b7133", fontSize: 10, fontWeight: "700" },
  onlineText: { color: "#47733d" },
  offlineText: { color: "#a34e40" },
  note: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e0e4dc",
  },
  noteTitle: { color: "#344a3e", fontSize: 12, fontWeight: "700" },
  noteBody: { marginTop: 7, color: "#77847b", fontSize: 12, lineHeight: 19 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    color: "#8b968e",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
