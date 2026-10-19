"use client";

import { useListing, useListings } from "@cockpit/client";

// Checkpoint 1 only: proves contract -> mock -> client -> UI end to end. Replaced by the console in web-console.
function Row({ id }: { id: string }) {
  const listing = useListing(id);
  if (!listing) return null;
  return (
    <li>
      {listing.event} · {listing.section} · £{listing.price}
    </li>
  );
}

export function CheckpointList() {
  const { data, status, error } = useListings({ limit: 50 });
  if (status === "pending") return <p>Loading…</p>;
  if (status === "error") return <p role="alert">{error.message}</p>;
  const first = data.pages[0];
  return (
    <section>
      <p>{first?.total ?? 0} listings</p>
      <ul>
        {first?.ids.map((id) => (
          <Row key={id} id={id} />
        ))}
      </ul>
    </section>
  );
}
