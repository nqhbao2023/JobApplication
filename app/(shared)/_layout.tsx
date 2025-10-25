import { Stack } from "expo-router";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";

export default function SharedLayout() {
  return (
    <SavedJobsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="jobDescription" />
        <Stack.Screen name="submit" />
        <Stack.Screen name="appliedJob" />
        <Stack.Screen name="companyDescription" />
        <Stack.Screen name="companyList" />
        <Stack.Screen name="addJob" />
        <Stack.Screen name="appliedList" />
        <Stack.Screen name="Notifications" />
      </Stack>
    </SavedJobsProvider>
  );
}
