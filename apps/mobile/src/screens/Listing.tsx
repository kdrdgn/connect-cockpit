import {
  type ApiError,
  newIdempotencyKey,
  PATCH_MUTATION_KEY,
  type PatchVariables,
  useBulk,
  useListing,
  usePatchListing,
  useRetrySync,
} from '@cockpit/client';
import { type Listing, MARKETPLACES, type Marketplace, priceHealth } from '@cockpit/contract';
import { space } from '@cockpit/tokens';
import { useMutationState } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { canRetryEntry, entryText, MARKETPLACE_NAME } from '../feed';
import { formatDateLong, formatPrice } from '../format';
import type { ScreenProps } from '../navigation';
import { Button, c, type } from '../ui';
import { useNow } from '../useNow';

export function ListingScreen({ route, navigation }: ScreenProps<'Listing'>) {
  const { id } = route.params;
  const listing = useListing(id);
  const now = useNow(5_000);
  if (!listing) return <Text style={styles.gone}>This listing is no longer loaded.</Text>;

  const health = priceHealth(listing.price, listing.marketPrice);
  const sign = health.gapPercent > 0 ? '+' : '';
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.block}>
        <Text style={styles.title} accessibilityRole="header">
          {listing.event}
        </Text>
        <Text style={styles.meta}>
          {formatDateLong(listing.date)} · {listing.venue}
        </Text>
        <Text style={styles.meta}>
          Section {listing.section}, row {listing.row} · {listing.quantity} tickets
        </Text>
        <Text style={styles.price}>
          {formatPrice(listing.price)}{' '}
          <Text style={[styles.meta, health.band === 'overpriced' && styles.attention]}>
            ({sign}
            {health.gapPercent}% vs market {formatPrice(listing.marketPrice)})
          </Text>
        </Text>
        <PriceFailure listing={listing} />
        <Button
          label="Edit price"
          variant="primary"
          onPress={() => navigation.navigate('Price', { id, baseVersion: listing.version })}
        />
      </View>
      {MARKETPLACES.map((m) => (
        <MarketplaceSection key={m} listing={listing} marketplace={m} now={now} />
      ))}
    </ScrollView>
  );
}

/**
 * The latest price write for this listing, read from the mutation cache: the sheet has closed by the time
 * the server answers, so the failure shows here, where the broker is looking.
 */
function PriceFailure({ listing }: { listing: Listing }) {
  const patch = usePatchListing();
  const [dismissedAt, setDismissedAt] = useState(0);
  const latest = useMutationState({
    filters: { mutationKey: PATCH_MUTATION_KEY, predicate: (m) => (m.state.variables as PatchVariables | undefined)?.id === listing.id },
    select: (m) => ({ error: m.state.error as ApiError | null, variables: m.state.variables as PatchVariables, at: m.state.submittedAt }),
  }).at(-1);
  if (!latest?.error || latest.at <= dismissedAt || latest.variables.price === undefined) return null;

  const wanted = latest.variables.price;
  const conflict = latest.error.code === 'CONFLICT' && latest.error.current;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>
        {conflict
          ? `Changed elsewhere to ${formatPrice(latest.error.current!.price)}. Your ${formatPrice(wanted)} was not saved.`
          : `${formatPrice(wanted)} was not saved: ${latest.error.message}`}
      </Text>
      <View style={styles.actions}>
        {!conflict && (
          <Button
            label={`Retry ${formatPrice(wanted)}`}
            onPress={() => {
              setDismissedAt(latest.at);
              patch.mutate({ id: listing.id, price: wanted });
            }}
          />
        )}
        <Button label="Dismiss" variant="ghost" onPress={() => setDismissedAt(latest.at)} />
      </View>
    </View>
  );
}

function MarketplaceSection({ listing, marketplace, now }: { listing: Listing; marketplace: Marketplace; now: number }) {
  const retry = useRetrySync();
  const bulk = useBulk();
  const [failure, setFailure] = useState<string | null>(null);
  const entry = listing.sync[marketplace];
  const name = MARKETPLACE_NAME[marketplace];
  const canRetry = canRetryEntry(entry, listing.quantity, now);
  const listed = entry.state !== 'not_listed';

  const delist = () =>
    Alert.alert(`Delist from ${name}?`, `${listing.event}, section ${listing.section} row ${listing.row} will stop selling on ${name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delist',
        style: 'destructive',
        onPress: () =>
          void bulk
            .mutateAsync({ ops: [{ op: 'delist', id: listing.id, version: listing.version, marketplace }], idempotencyKey: newIdempotencyKey() })
            .then(({ results }) => {
              const r = results[0];
              if (r && !r.ok) setFailure(`Not delisted: ${r.error.message}`);
            })
            .catch((e: Error) => setFailure(`Not delisted: ${e.message}`)),
      },
    ]);

  return (
    <View style={styles.block} accessibilityLabel={`${name}: ${entryText(entry, listing.quantity, now)}`}>
      <Text style={styles.mpName}>{name}</Text>
      <Text style={[styles.state, (entry.state === 'error' || canRetry) && styles.attention]}>
        {entryText(entry, listing.quantity, now)}
      </Text>
      {entry.state === 'error' && entry.lastError ? (
        // Untrusted text from the marketplace: shown as plain text, never interpreted.
        <Text style={styles.error} selectable>
          {entry.lastError}
        </Text>
      ) : null}
      {failure ? (
        <Text style={styles.failure} accessibilityRole="alert">
          {failure}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {canRetry && (
          <Button
            label={retry.isPending ? 'Retrying…' : 'Retry sync'}
            accessibilityLabel={`Retry sync on ${name}`}
            disabled={retry.isPending}
            onPress={() => {
              setFailure(null);
              retry.mutate({ id: listing.id, marketplace }, { onError: (e) => setFailure(`Retry failed: ${e.message}`) });
            }}
          />
        )}
        {listed && <Button label="Delist…" variant="ghost" accessibilityLabel={`Delist from ${name}`} onPress={delist} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[8] },
  gone: { ...type.md, color: c.inkMuted, padding: space[6], textAlign: 'center' },
  block: {
    gap: space[1],
    padding: space[4],
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { ...type.xl, fontWeight: '600', color: c.ink },
  meta: { ...type.md, color: c.inkMuted },
  price: { ...type.lg, fontWeight: '600', color: c.ink, marginVertical: space[1] },
  mpName: { ...type.lg, fontWeight: '600', color: c.ink },
  state: { ...type.md, color: c.inkMuted },
  attention: { color: c.attention },
  error: {
    ...type.md,
    color: c.ink,
    backgroundColor: c.attentionBg,
    borderLeftWidth: 3,
    borderLeftColor: c.attention,
    padding: space[2],
    marginTop: space[1],
  },
  failure: { ...type.md, color: c.attention },
  banner: { gap: space[2], padding: space[3], backgroundColor: c.dangerBg, borderRadius: 8, marginVertical: space[1] },
  // Red only for a write that was rolled back, as on web.
  bannerText: { ...type.md, color: c.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
});
