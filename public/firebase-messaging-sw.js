self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  if (data.type === 'unlock-gate') {
    const { triggerType, gateId, childId } = data;
    const titles = {
      wake: "Today's door is open",
      homework: 'Ready your desk',
      checkin: 'Come find your feelings',
      winddown: 'Time to slow down',
    };
    event.waitUntil(
      self.registration.showNotification(titles[triggerType] ?? 'Viada', {
        body: 'Tap to begin.',
        icon: '/icons/icon-192.png',
        tag: `unlock-${gateId}`,
        data: { url: `/unlock/${childId}/${gateId}` },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
