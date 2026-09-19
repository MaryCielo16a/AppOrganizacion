import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

export const enviarNotificaciones = onSchedule(
  { schedule: "every 1 minutes", timeoutSeconds: 30 },
  async () => {
    const ahora = Timestamp.now();
    const usuariosSnap = await db.collection("usuarios").get();

    for (const usuarioDoc of usuariosSnap.docs) {
      const uid = usuarioDoc.id;

      const pendientes = await db
        .collection("usuarios")
        .doc(uid)
        .collection("notificaciones_push")
        .where("triggerAt", "<=", ahora)
        .where("sent", "==", false)
        .get();

      if (pendientes.empty) continue;

      const configSnap = await db
        .collection("usuarios")
        .doc(uid)
        .collection("config")
        .doc("fcm")
        .get();

      const token = configSnap.data()?.token as string | undefined;
      if (!token) {
        const batch = db.batch();
        pendientes.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        continue;
      }

      const batch = db.batch();

      for (const notifDoc of pendientes.docs) {
        const data = notifDoc.data();
        try {
          await messaging.send({
            token,
            data: {
              title: data.title ?? "Recordatorio",
              body: data.body ?? "",
            },
            android: {
              priority: "high",
            },
            webpush: {
              headers: { Urgency: "high" },
            },
          });
        } catch (err: unknown) {
          const code = (err as { code?: string }).code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            await configSnap.ref.delete();
            break;
          }
          console.error(`Error enviando a ${uid}:`, err);
        }
        batch.update(notifDoc.ref, { sent: true });
      }

      await batch.commit();
    }
  }
);
