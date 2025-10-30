import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";

export default function PdfViewer() {
  const { url } = useLocalSearchParams<{ url: string }>();

  if (!url) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const decodedUrl = decodeURIComponent(url);

  return (
    <WebView
      source={{ uri: decodedUrl }}
      style={{ flex: 1 }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
      originWhitelist={['*']}
      allowFileAccess
      allowUniversalAccessFromFileURLs
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
