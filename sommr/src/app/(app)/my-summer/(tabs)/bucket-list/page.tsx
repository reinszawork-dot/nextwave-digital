import type { Metadata } from 'next';
import { BucketList } from '@/components/summer/BucketList';
import { requireUser } from '@/server/auth';
import { listBucket } from '@/server/services/bucket';

export const metadata: Metadata = { title: 'Bucket list' };

export default async function BucketListPage() {
  const user = await requireUser({ next: '/my-summer/bucket-list' });
  const items = await listBucket(user.id);
  return (
    <BucketList
      interests={user.interests}
      items={items.map((i) => ({
        id: i.id,
        title: i.title,
        notes: i.notes,
        suggestionSlug: i.suggestion_slug,
        placeId: i.place_id,
        placeName: i.place_name,
        eventId: i.event_id,
        eventTitle: i.event_title,
        completedAt: i.completed_at ? new Date(i.completed_at).toISOString() : null,
        memoryId: i.memory_id,
        photoId: i.photo_id,
      }))}
    />
  );
}
