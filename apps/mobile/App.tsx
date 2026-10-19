import { ClientProvider } from '@cockpit/client';
import { color } from '@cockpit/tokens';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStack } from './src/navigation';
import { FeedScreen } from './src/screens/Feed';
import { ListingScreen } from './src/screens/Listing';
import { PriceScreen } from './src/screens/Price';
import { client, queryClient } from './src/services';

const Stack = createNativeStackNavigator<RootStack>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: color.light.bg, card: color.light.surface, text: color.light.ink, primary: color.light.accent },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClientProvider client={client}>
          <NavigationContainer theme={theme}>
            <Stack.Navigator>
              <Stack.Screen name="Feed" component={FeedScreen} options={{ title: 'Problems' }} />
              <Stack.Screen name="Listing" component={ListingScreen} options={{ title: 'Listing' }} />
              <Stack.Screen
                name="Price"
                component={PriceScreen}
                options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </ClientProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
