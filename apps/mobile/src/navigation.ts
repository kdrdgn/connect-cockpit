import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStack = {
  Feed: undefined;
  Listing: { id: string };
  /** `baseVersion`: the listing version when the sheet opened, so a mid-edit change becomes a conflict. */
  Price: { id: string; baseVersion: number };
};

export type ScreenProps<T extends keyof RootStack> = NativeStackScreenProps<RootStack, T>;
