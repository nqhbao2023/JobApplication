import { Stack } from "expo-router";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";

export default function SharedLayout() {
  return (
    <SavedJobsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="jobDescription" />
        <Stack.Screen name="submit" />
        <Stack.Screen name="companyDescription" />
        <Stack.Screen name="companyList" />
        <Stack.Screen name="Notifications" />
        <Stack.Screen name="PdfViewer" />
        <Stack.Screen name="UserDetails" />

      </Stack>
    </SavedJobsProvider>
  );
}
