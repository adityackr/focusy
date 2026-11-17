import type { ReminderMessage } from "./reminders";

/**
 * Browser notification plumbing. Focusy has no service worker or push
 * subscription, so notifications only appear while a tab is open and the
 * learner has granted permission.
 */

export type NotificationState = NotificationPermission | "unsupported";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationState(): NotificationState {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Ask once; browsers that already answered return their stored decision. */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Show a reminder notification. Returns false when notifications aren't
 * available or allowed, so the caller doesn't mark the day as reminded.
 */
export function showReminderNotification(message: ReminderMessage): boolean {
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return false;
  }
  try {
    const notification = new Notification(message.title, {
      body: message.body,
      tag: message.tag,
      icon: "/icon.svg",
    });
    notification.onclick = () => {
      window.focus();
      if (message.href) window.location.assign(message.href);
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
