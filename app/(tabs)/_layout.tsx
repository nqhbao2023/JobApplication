import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SavedJobsProvider } from '@/app/saveJobsContext';

const Layout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          headerShown: false,
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="job"
        options={{
          headerShown: false,
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "file-tray-full" : "file-tray-full-outline"} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="person"
        options={{
          title: "",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
};

export default Layout;
