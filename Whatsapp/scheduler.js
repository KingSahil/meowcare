import './env.js';
import cron from 'node-cron';
import { listReminders, triggerSos } from './api.js';

const DEFAULT_SNOOZE_MINUTES = Number(process.env.REMINDER_SNOOZE_MINUTES ?? 15);
const DEFAULT_SAFETY_WINDOW_HOURS = Number(process.env.SAFETY_WINDOW_HOURS ?? 6);
const DEFAULT_CHECK_INTERVAL_MINUTES = Number(process.env.SAFETY_CHECK_INTERVAL_MINUTES ?? 10);

function normalizePhoneNumber(phone) {
  return phone?.replace(/\D/g, '') ?? '';
}

function phoneToJid(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  return normalizedPhone ? `${normalizedPhone}@s.whatsapp.net` : '';
}

const demoPatientPhone = process.env.DEMO_PATIENT_PHONE ?? '+919988341071';

const demoPatients = [
  {
    jid: phoneToJid(demoPatientPhone),
    userId: process.env.DEMO_USER_ID ?? '11111111-1111-1111-1111-111111111111',
    phone: demoPatientPhone,
    medicine: process.env.DEMO_MEDICINE ?? 'BP medicine',
    timeLabel: process.env.DEMO_MEDICINE_TIME ?? 'Every 30 minutes',
    cron: process.env.REMINDER_CRON ?? '*/30 * * * *',
    dosage: process.env.DEMO_DOSAGE ?? '1 tablet'
  }
];

function reminderCopy(patient) {
  return `\ud83d\udc8a Time to take ${patient.medicine}\n\ud83d\udee1\ufe0f Dose: ${patient.dosage}\n\u23f1\ufe0f When: ${patient.timeLabel}\n\ud83d\udcac Reply: taken / later / skip / sos`;
}

function parseTimeToMinutes(timeValue) {
  if (!timeValue) {
    return null;
  }

  const directMatch = String(timeValue).trim().match(/^(\d{1,2}):(\d{2})$/);

  if (directMatch) {
    const hours = Number(directMatch[1]);
    const minutes = Number(directMatch[2]);

    if (Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  const dateLike = new Date(String(timeValue));
  if (Number.isNaN(dateLike.getTime())) {
    return null;
  }

  return dateLike.getHours() * 60 + dateLike.getMinutes();
}

function pickLatestReminder(reminders) {
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return null;
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const normalized = reminders
    .map((item) => {
      const parsedMinutes = parseTimeToMinutes(item?.time);
      return {
        item,
        parsedMinutes
      };
    })
    .filter((entry) => entry.item && typeof entry.item.medicine === 'string');

  if (normalized.length === 0) {
    return null;
  }

  const upcoming = normalized
    .filter((entry) => entry.parsedMinutes !== null && entry.parsedMinutes >= nowMinutes)
    .sort((left, right) => left.parsedMinutes - right.parsedMinutes);

  if (upcoming.length > 0) {
    return upcoming[0].item;
  }

  const sorted = normalized
    .filter((entry) => entry.parsedMinutes !== null)
    .sort((left, right) => left.parsedMinutes - right.parsedMinutes);

  if (sorted.length > 0) {
    return sorted[0].item;
  }

  return normalized[normalized.length - 1].item;
}

function safetyCopy(patient) {
  return `Passive safety alert: no reply received from ${patient.phone} for the last ${DEFAULT_SAFETY_WINDOW_HOURS} hours.`;
}

export function createPatientState() {
  return new Map(
    demoPatients.map((patient) => [
      patient.jid,
      {
        ...patient,
        awaitingReply: false,
        lastReplyAt: Date.now(),
        lastReminderAt: null,
        waitingSinceAt: null,
        lastAlertAt: null,
        snoozeTimer: null
      }
    ])
  );
}

export function createScheduler({ sock, patientState }) {
  const tasks = [];

  async function hydrateLatestReminder(state) {
    try {
      const response = await listReminders(state.userId);
      const latest = pickLatestReminder(response?.data ?? []);

      if (!latest) {
        return;
      }

      state.medicine = latest.medicine ?? state.medicine;
      state.dosage = latest.dosage ?? state.dosage;
      state.timeLabel = latest.time ?? state.timeLabel;
      state.quantity = latest.quantity ?? state.quantity;
    } catch (error) {
      console.error('[scheduler] Failed to sync reminders from backend:', error);
    }
  }

  async function sendReminder(state, reason = 'scheduled') {
    await hydrateLatestReminder(state);
    state.awaitingReply = true;
    state.lastReminderAt = Date.now();
    state.waitingSinceAt = state.lastReminderAt;

    await sock.sendMessage(state.jid, {
      text:
        reason === 'snooze'
          ? `\u23f0 Gentle follow-up\n${reminderCopy(state)}`
          : reminderCopy(state)
    });
  }

  function markUserReplied(jid) {
    const state = patientState.get(jid);

    if (!state) {
      return;
    }

    state.lastReplyAt = Date.now();
    state.waitingSinceAt = null;

    if (state.snoozeTimer) {
      clearTimeout(state.snoozeTimer);
      state.snoozeTimer = null;
    }
  }

  function scheduleSnoozeReminder(state) {
    if (state.snoozeTimer) {
      clearTimeout(state.snoozeTimer);
    }

    state.snoozeTimer = setTimeout(async () => {
      try {
        await sendReminder(state, 'snooze');
      } catch (error) {
        console.error('[scheduler] Failed to send snoozed reminder:', error);
      }
    }, DEFAULT_SNOOZE_MINUTES * 60 * 1000);
  }

  function startReminderJobs() {
    for (const state of patientState.values()) {
      const task = cron.schedule(state.cron, async () => {
        try {
          await sendReminder(state);
        } catch (error) {
          console.error('[scheduler] Failed to send scheduled reminder:', error);
        }
      });

      tasks.push(task);
    }
  }

  function startSafetyChecks() {
    const task = cron.schedule(`*/${DEFAULT_CHECK_INTERVAL_MINUTES} * * * *`, async () => {
      const now = Date.now();
      const safetyWindowMs = DEFAULT_SAFETY_WINDOW_HOURS * 60 * 60 * 1000;

      for (const state of patientState.values()) {
        const isOverdue =
          state.awaitingReply &&
          state.waitingSinceAt &&
          now - state.waitingSinceAt >= safetyWindowMs;
        const recentlyAlerted = state.lastAlertAt && now - state.lastAlertAt < safetyWindowMs;

        if (!isOverdue || recentlyAlerted) {
          continue;
        }

        try {
          await triggerSos({
            userId: state.userId,
            phone: state.phone,
            message: safetyCopy(state)
          });

          state.lastAlertAt = now;

          await sock.sendMessage(state.jid, {
            text: '\ud83d\udea8 Emergency alert sent'
          });
        } catch (error) {
          console.error('[scheduler] Failed to trigger passive safety alert:', error);
        }
      }
    });

    tasks.push(task);
  }

  return {
    markUserReplied,
    scheduleSnoozeReminder,
    sendReminder,
    start() {
      startReminderJobs();
      startSafetyChecks();
    },
    stop() {
      for (const task of tasks) {
        task.stop();
        task.destroy();
      }

      tasks.length = 0;
    }
  };
}
