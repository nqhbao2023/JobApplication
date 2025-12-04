import { Stack } from "expo-router";
import { SavedJobsProvider } from "@/contexts/saveJobsContext";

export default function SharedLayout() {
  return (
    <SavedJobsProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 250, // ✅ Faster animation for smoother feel
          gestureEnabled: true, // ✅ Enable swipe back gesture
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen 
          name="search" 
          options={{
            presentation: 'modal',
            animation: 'fade_from_bottom',
            animationDuration: 200,
          }}
        />
        <Stack.Screen 
          name="searchResults"
          options={{
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        />
        <Stack.Screen name="jobList" />
        <Stack.Screen name="jobDescription" />
        <Stack.Screen name="submit" />
        <Stack.Screen name="companyDescription" />
        <Stack.Screen name="companyList" />
        <Stack.Screen name="Notifications" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="chatList" />
      </Stack>
    </SavedJobsProvider>
  );
}
