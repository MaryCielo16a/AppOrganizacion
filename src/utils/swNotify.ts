async function postToSW(msg: Record<string, unknown>): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage(msg);
}

export function scheduleNotification(
  id: string,
  title: string,
  body: string,
  triggerAt: number,
): void {
  void postToSW({ type: 'SCHEDULE', id, title, body, triggerAt });
}

export function cancelNotification(id: string): void {
  void postToSW({ type: 'CANCEL', id });
}

export function cancelAllNotifications(): void {
  void postToSW({ type: 'CANCEL_ALL' });
}

export interface ScheduledNotif {
  id: string;
  title: string;
  body: string;
  triggerAt: number;
}

export function scheduleBatch(notifications: ScheduledNotif[]): void {
  void postToSW({ type: 'SCHEDULE_BATCH', notifications });
}
