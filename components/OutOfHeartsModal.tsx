import React from 'react';
import { Modal, Text, View } from 'react-native';
import { PRICES } from '@/lib/constants';
import { useHearts } from '@/hooks/useHearts';
import { formatCountdown } from '@/lib/date';
import { useApp } from '@/store/app';
import { toast } from '@/store/ui';
import { Button } from './ui/Button';

interface Props {
  visible: boolean;
  onPractice: () => void;
  onUpgrade: () => void;
  onQuit: () => void;
  onRefilled: () => void;
}

/** shown when hearts hit zero. The four ways out: practice, gems, wait, or upgrade. */
export function OutOfHeartsModal({ visible, onPractice, onUpgrade, onQuit, onRefilled }: Props) {
  const h = useHearts();
  const gems = useApp((s) => s.gems);
  const buyItem = useApp((s) => s.buyItem);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onQuit}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 56, textAlign: 'center' }}>💔</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', textAlign: 'center', color: '#4B4B4B' }}>You ran out of hearts</Text>
          <Text style={{ textAlign: 'center', color: '#777', marginBottom: 6 }}>Next heart in {formatCountdown(h.nextMs)}. Pick a way to keep going.</Text>
          <Button title="Practice to earn hearts" variant="green" onPress={onPractice} />
          <Button
            title={`Refill with ${PRICES.heartRefill} gems`}
            variant="blue"
            disabled={gems < PRICES.heartRefill}
            onPress={() => {
              const r = buyItem('heartRefill');
              if (r.ok) onRefilled();
              else toast(r.reason ?? 'Could not refill', 'warn');
            }}
          />
          <Button title="Go Super: unlimited hearts" variant="purple" onPress={onUpgrade} />
          <Button title="Wait and come back" variant="white" onPress={onQuit} />
        </View>
      </View>
    </Modal>
  );
}
