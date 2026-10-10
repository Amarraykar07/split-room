import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import RoomClient from '@/components/room/RoomClient';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: 'Expense Room | Split Room',
    description: 'Split expenses with your group. No login needed.',
  };
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', upperCode)
    .single();

  if (error || !room) {
    notFound();
  }

  return <RoomClient room={room} />;
}
