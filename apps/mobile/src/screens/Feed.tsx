import { isStalled, type LiveStatus, useListing, useLiveChanges, useRetrySync } from '@cockpit/client';
import { space } from '@cockpit/tokens';
import { useFocusEffect } from '@react-navigation/native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { buildFeed, ISSUE_GLYPH, issueText, isRetryable, MARKETPLACE_NAME, topIssue } from '../feed';
import { formatDate } from '../format';
import type { ScreenProps } from '../navigation';
import { Button, c, MIN_TOUCH, type } from '../ui';
import { useAllListings } from '../useAllListings';
import { useNow } from '../useNow';
import { appStateVisibility } from '../visibility';

type Feed = { ids: string[]; problemCount: number };

export function FeedScreen({ navigation }: ScreenProps<'Feed'>) {
  const all = useAllListings();
  const live = useLiveChanges(all.changesCursor, { visibility: appStateVisibility });
  const now = useNow(5_000);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The order is frozen while the broker looks at it (design M2): built once everything has loaded,
  // then rebuilt only on pull to refresh and on coming back from a listing.
  const rebuild = useCallback(() => setFeed(buildFeed(all.snapshot(), Date.now())), [all.snapshot]);
  useEffect(() => {
    if (all.isComplete && feed === null) rebuild();
  }, [all.isComplete, feed, rebuild]);
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) rebuild();
      focusedBefore.current = true;
    }, [rebuild]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await all.refetch();
    rebuild();
    setRefreshing(false);
  };

  if (all.isError && !all.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Couldn’t load listings. {all.error.message}</Text>
        <Button label="Retry" variant="primary" onPress={() => void all.refetch()} />
      </View>
    );
  }
  if (feed === null) {
    return (
      <View style={styles.center} accessibilityLabel="Loading listings">
        <ActivityIndicator color={c.inkMuted} />
        <Text style={styles.message}>Loading listings…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={feed.ids}
      keyExtractor={(id) => id}
      renderItem={({ item }) => <FeedRow id={item} now={now} onOpen={() => navigation.navigate('Listing', { id: item })} />}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={<Header problemCount={feed.problemCount} status={live.status} now={now} />}
      ListEmptyComponent={<Text style={styles.empty}>Nothing needs you right now</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
}

function liveText(s: LiveStatus, now: number): string {
  if (isStalled(s)) return 'Updates stalled. Retrying';
  if (s.pausedUntil !== null) return `Live · paused ${Math.max(0, Math.ceil((s.pausedUntil - now) / 1000))}s`;
  if (s.lastOkAt === null) return 'Live';
  return `Live · ${Math.max(0, Math.round((now - s.lastOkAt) / 1000))}s ago`;
}

function Header({ problemCount, status, now }: { problemCount: number; status: LiveStatus; now: number }) {
  return (
    <View style={styles.header}>
      <Text style={styles.count} accessibilityRole="header">
        {problemCount === 1 ? '1 problem' : `${problemCount} problems`}
      </Text>
      <Text style={[styles.live, isStalled(status) && styles.attention]}>{liveText(status, now)}</Text>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const FeedRow = memo(function FeedRow({ id, now, onOpen }: { id: string; now: number; onOpen: () => void }) {
  const listing = useListing(id);
  const retry = useRetrySync();
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    if (!failure) return;
    const t = setTimeout(() => setFailure(null), 5_000);
    return () => clearTimeout(t);
  }, [failure]);
  if (!listing) return null;

  const issue = topIssue(listing, now);
  const words = issueText(issue, listing, now);
  const quiet = !issue || issue.kind === 'pending';
  const seats = `section ${listing.section} row ${listing.row}`;

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${listing.event}, ${seats}, ${words}`}
        accessibilityHint="Opens the listing"
      >
        <Text style={[styles.glyph, quiet ? styles.muted : styles.attention]} accessible={false}>
          {ISSUE_GLYPH[issue?.kind ?? 'none']}
        </Text>
        <View style={styles.texts}>
          <Text style={[styles.event, quiet && styles.muted]} numberOfLines={1}>
            {listing.event}
          </Text>
          <Text style={styles.meta}>
            {formatDate(listing.date)} · Sec {listing.section} row {listing.row}
          </Text>
          <Text style={[styles.issue, quiet ? styles.muted : styles.attention]}>{failure ?? words}</Text>
        </View>
      </Pressable>
      {isRetryable(issue, listing, now) && (
        <Button
          label={retry.isPending ? 'Retrying…' : 'Retry'}
          accessibilityLabel={`Retry ${MARKETPLACE_NAME[issue.marketplace]}`}
          disabled={retry.isPending}
          onPress={() =>
            retry.mutate(
              { id, marketplace: issue.marketplace },
              { onError: (e) => setFailure(`Retry failed: ${e.message}`) },
            )
          }
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  message: { ...type.md, color: c.inkMuted, textAlign: 'center' },
  empty: { ...type.lg, color: c.inkMuted, textAlign: 'center', padding: space[8] },
  header: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2], gap: space[0.5] },
  count: { ...type.xl, fontWeight: '600', color: c.ink },
  live: { ...type.sm, color: c.inkSubtle },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: space[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingRight: space[3],
    backgroundColor: c.surface,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: space[3],
    minHeight: MIN_TOUCH,
    paddingVertical: space[3],
    paddingLeft: space[4],
  },
  pressed: { backgroundColor: c.bg },
  glyph: { ...type.lg, width: 18, textAlign: 'center' },
  texts: { flex: 1, gap: space[0.5] },
  event: { ...type.lg, fontWeight: '600', color: c.ink },
  meta: { ...type.sm, color: c.inkMuted },
  issue: { ...type.md, fontWeight: '500' },
  attention: { color: c.attention },
  muted: { color: c.inkSubtle },
});
