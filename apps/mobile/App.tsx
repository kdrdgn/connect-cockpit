import { ClientProvider, createClient, useListing, useListings } from '@cockpit/client';
import { createEngine, createInProcessFetch } from '@cockpit/mock';
import { color, space, text } from '@cockpit/tokens';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { FlatList, SafeAreaView, StyleSheet, Text } from 'react-native';

// The phone runs its own copy of the mock; there is no server to reach. State resets on restart.
const engine = createEngine({ config: { seed: Math.floor(Math.random() * 2 ** 31) } });
engine.start();
const client = createClient({ fetch: createInProcessFetch(engine) });
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// Checkpoint 1 only: proves contract -> mock -> client -> UI on the phone. Replaced by the problems feed.
function Row({ id }: { id: string }) {
  const listing = useListing(id);
  if (!listing) return null;
  return (
    <Text style={styles.row}>
      {listing.event} · {listing.section} · £{listing.price}
    </Text>
  );
}

function CheckpointList() {
  const { data, status, error } = useListings({ limit: 50 });
  if (status === 'pending') return <Text style={styles.row}>Loading…</Text>;
  if (status === 'error') return <Text style={styles.row}>{error.message}</Text>;
  const first = data.pages[0];
  return (
    <FlatList
      data={first?.ids ?? []}
      keyExtractor={(id) => id}
      ListHeaderComponent={<Text style={styles.header}>{first?.total ?? 0} listings</Text>}
      renderItem={({ item }) => <Row id={item} />}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientProvider client={client}>
        <SafeAreaView style={styles.container}>
          <CheckpointList />
          <StatusBar style="auto" />
        </SafeAreaView>
      </ClientProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.light.bg },
  header: { padding: space[4], fontSize: text.lg[0], lineHeight: text.lg[1], fontWeight: '600', color: color.light.ink },
  row: { paddingHorizontal: space[4], paddingVertical: space[2], fontSize: text.md[0], lineHeight: text.md[1], color: color.light.ink },
});
