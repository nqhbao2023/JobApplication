import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
const Layout = () => {
 return (<Stack>
   
  <Stack.Screen name = "login" options={{
    headerShown: false
  }}/>  
    <Stack.Screen name = "register" options={{
    headerShown: false
  }}/>  
   
   </Stack>);
 }

export default Layout;