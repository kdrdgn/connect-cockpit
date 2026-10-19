import { useListing, usePatchListing } from '@cockpit/client';
import { parseEdit } from '@cockpit/contract';
import { space } from '@cockpit/tokens';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { formatPrice } from '../format';
import type { ScreenProps } from '../navigation';
import { Button, c, MIN_TOUCH, type } from '../ui';

/** Whole-pound steps, never below £1. Steps from the listing's price while the field is invalid. */
const step = (text: string, fallback: number, by: number) => {
  const parsed = parseEdit('price', text);
  const from = parsed.ok ? parsed.value : fallback;
  return String(Math.max(1, Math.round((from + by) * 100) / 100));
};

export function PriceScreen({ route, navigation }: ScreenProps<'Price'>) {
  const { id, baseVersion } = route.params;
  const listing = useListing(id);
  const patch = usePatchListing();
  const [text, setText] = useState(() => (listing ? String(listing.price) : ''));
  const [message, setMessage] = useState<string | null>(null);
  if (!listing) return null;

  const save = () => {
    const parsed = parseEdit('price', text);
    if (!parsed.ok) return setMessage(parsed.message);
    // Optimistic: the listing screen shows the new price at once, and any failure as a banner there.
    if (parsed.value !== listing.price) patch.mutate({ id, price: parsed.value, baseVersion });
    navigation.goBack();
  };
  const change = (next: string) => {
    setText(next);
    setMessage(null);
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title} accessibilityRole="header">
        Price for {listing.event}
      </Text>
      <Text style={styles.meta}>
        Now <Text style={styles.now}>{formatPrice(listing.price)}</Text> · market {formatPrice(listing.marketPrice)}
      </Text>
      <View style={styles.stepper}>
        <Button label="−£1" accessibilityLabel="Lower by 1 pound" onPress={() => change(step(text, listing.price, -1))} />
        <View style={styles.field}>
          <Text style={styles.pound}>£</Text>
          <TextInput
            value={text}
            onChangeText={change}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            accessibilityLabel="Price in pounds"
            returnKeyType="done"
            onSubmitEditing={save}
            style={styles.input}
          />
        </View>
        <Button label="+£1" accessibilityLabel="Raise by 1 pound" onPress={() => change(step(text, listing.price, 1))} />
      </View>
      {message ? (
        <Text style={styles.message} accessibilityRole="alert">
          {message}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        <Button label="Save" variant="primary" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space[3], padding: space[4], backgroundColor: c.surface },
  title: { ...type.lg, fontWeight: '600', color: c.ink },
  meta: { ...type.md, color: c.inkMuted },
  now: { fontWeight: '600', color: c.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 8,
  },
  pound: { ...type.xl, color: c.inkMuted },
  input: { flex: 1, ...type.xl, fontWeight: '600', color: c.ink, paddingVertical: space[2] },
  message: { ...type.md, color: c.attention },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space[2] },
});
