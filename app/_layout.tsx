import { Stack } from "expo-router";
import { SavedJobsProvider } from '@/app/saveJobsContext';

const Layout = () => {
  return (
    <SavedJobsProvider>
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          headerShown: false, // Ẩn header của màn hình chat
        }}
      />
      <Stack.Screen
        name="+not-found"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(events)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </SavedJobsProvider>
  );
};

export default Layout;
