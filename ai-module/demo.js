const fs = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const {
  applyClarificationAnswers,
  extractMedicinesAndReminders,
  compilePrescriptionData
} = require('./ocr');

const PREFERENCES_PATH = path.join(__dirname, 'user-preferences.json');
const DEFAULT_PREFERENCES = {
  meal_times: {
    breakfast: '',
    lunch: '',
    dinner: ''
  },
  daypart_times: {
    morning: '08:00',
    afternoon: '14:00',
    evening: '18:00',
    night: '21:00',
    bedtime: '22:00'
  },
  before_food_minutes: 30,
  after_food_minutes: 30,
  with_food_minutes: 0,
  empty_stomach_before_minutes: 60,
  empty_stomach_after_minutes: 120,
  empty_stomach_strategy: 'before_meal'
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isClockTime(value) {
  const text = normalizeText(value);
  return /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(text) || /^(?:0?\d|1[0-2]):[0-5]\d\s*(am|pm)$/i.test(text);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(value));
}

function isDateTime(value) {
  return /^\d{4}-\d{2}-\d{2}\s+(?:[01]?\d|2[0-3]):[0-5]\d$/.test(normalizeText(value));
}

function isSpecificTimePhrase(value) {
  return /^(before breakfast|after breakfast|with breakfast|empty stomach breakfast|before lunch|after lunch|with lunch|empty stomach lunch|before dinner|after dinner|with dinner|empty stomach dinner|morning|afternoon|evening|night|bedtime)$/i.test(
    normalizeText(value)
  );
}

function isManualTimeList(value) {
  const parts = normalizeText(value)
    .split(',')
    .map((part) => normalizeText(part))
    .filter(Boolean);

  return parts.length > 1 && parts.every((part) => isClockTime(part) || isSpecificTimePhrase(part));
}

function isScheduleAnswer(value) {
  const text = normalizeText(value);

  if (!text || text.includes(',')) {
    return false;
  }

  return (
    /^\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?$/.test(text) ||
    /^(once daily|twice daily|thrice daily|three times daily|four times daily|every \d+ hours?|morning|afternoon|evening|night|bedtime)$/i.test(
      text
    ) ||
    isClockTime(text) ||
    isSpecificTimePhrase(text)
  );
}

function validateAnswer(question, answer) {
  const value = normalizeText(answer);

  if (!value) {
    return { valid: true, normalized: '' };
  }

  switch (question.field) {
    case 'start_date':
      return isDate(value)
        ? { valid: true, normalized: value }
        : { valid: false, message: 'Use YYYY-MM-DD, for example 2026-04-02.' };
    case 'meal_breakfast_time':
    case 'meal_lunch_time':
    case 'meal_dinner_time':
    case 'daypart_morning_time':
    case 'daypart_afternoon_time':
    case 'daypart_evening_time':
    case 'daypart_night_time':
      return isClockTime(value)
        ? { valid: true, normalized: value }
        : { valid: false, message: 'Use a clock time like 09:00 or 9:00 pm.' };
    case 'first_dose_datetime':
      return isDateTime(value)
        ? { valid: true, normalized: value }
        : { valid: false, message: 'Use YYYY-MM-DD HH:MM, for example 2026-04-02 09:00.' };
    case 'timing':
      return !value || isClockTime(value) || isSpecificTimePhrase(value) || isManualTimeList(value)
        ? { valid: true, normalized: value }
        : {
            valid: false,
            message: 'Use a fixed time like 17:00, a phrase like after dinner, or multiple labels like morning, after lunch, night.'
          };
    case 'schedule_pattern':
    case 'conflict':
      return isScheduleAnswer(value)
        ? { valid: true, normalized: value }
        : {
            valid: false,
            message: 'Pick one option only (no commas). Example: 1-0-1 OR twice daily OR after dinner OR 21:00.'
          };
    case 'duration_text':
      return /\b\d+\s*(day|days|week|weeks|month|months)\b/i.test(value) ||
        /(ongoing|lifelong|no end|until further notice|indefinite|continuous)/i.test(value)
        ? { valid: true, normalized: value }
        : { valid: false, message: 'Use a duration like 5 days, 2 weeks, or ongoing.' };
    default:
      return { valid: true, normalized: value };
  }
}

async function loadPreferences() {
  try {
    const raw = await fs.readFile(PREFERENCES_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      meal_times: {
        ...DEFAULT_PREFERENCES.meal_times,
        ...(parsed?.meal_times || {})
      },
      daypart_times: {
        ...DEFAULT_PREFERENCES.daypart_times,
        ...(parsed?.daypart_times || {})
      }
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

async function savePreferences(preferences) {
  const safePreferences = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    meal_times: {
      ...DEFAULT_PREFERENCES.meal_times,
      ...(preferences?.meal_times || {})
    },
    daypart_times: {
      ...DEFAULT_PREFERENCES.daypart_times,
      ...(preferences?.daypart_times || {})
    }
  };

  await fs.writeFile(PREFERENCES_PATH, `${JSON.stringify(safePreferences, null, 2)}\n`, 'utf8');
}

function buildUserContext(preferences) {
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    start_date: '',
    meal_times: {
      ...DEFAULT_PREFERENCES.meal_times,
      ...(preferences?.meal_times || {})
    },
    daypart_times: {
      ...DEFAULT_PREFERENCES.daypart_times,
      ...(preferences?.daypart_times || {})
    }
  };
}

function collectPreferenceUpdates(result) {
  const updates = {};
  const context = result?.user_context || {};

  if (context?.meal_times) {
    updates.meal_times = {
      breakfast: normalizeText(context.meal_times.breakfast),
      lunch: normalizeText(context.meal_times.lunch),
      dinner: normalizeText(context.meal_times.dinner)
    };
  }

  if (context?.daypart_times) {
    updates.daypart_times = {
      morning: normalizeText(context.daypart_times.morning),
      afternoon: normalizeText(context.daypart_times.afternoon),
      evening: normalizeText(context.daypart_times.evening),
      night: normalizeText(context.daypart_times.night),
      bedtime: normalizeText(context.daypart_times.bedtime)
    };
  }

  for (const key of [
    'before_food_minutes',
    'after_food_minutes',
    'with_food_minutes',
    'empty_stomach_before_minutes',
    'empty_stomach_after_minutes',
    'empty_stomach_strategy'
  ]) {
    if (context[key] !== undefined) {
      updates[key] = context[key];
    }
  }

  return updates;
}

function toRawItems(medicines = []) {
  return medicines.map((item) => ({
    medicine: item.medicine || item.medicine_name || item.name || '',
    dosage: item.dosage || '',
    frequency: item.frequency || '',
    timing: item.timing || '',
    duration_text: item.duration_text || '',
    schedule_pattern: item.schedule_pattern || '',
    condition: item.condition || '',
    instructions: item.instructions || item.special_instructions || '',
    source_text: item.source_text || '',
    manual_time_labels: item.manual_time_labels || [],
    schedule_confirmed: Boolean(item.schedule_confirmed),
    schedule_ambiguous: Boolean(item.schedule_ambiguous),
    conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
  }));
}

async function manageManualEdits(result) {
  if (!stdin.isTTY) {
    return result;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  let currentResult = result;
  let rawItems = toRawItems(result.medicines || []);

  try {
    const addAnswer = normalizeText(await rl.question('Add a medicine manually? (y/n)\n> ')).toLowerCase();

    if (addAnswer === 'y' || addAnswer === 'yes') {
      const name = normalizeText(await rl.question('Medicine name:\n> '));
      const dosage = normalizeText(await rl.question('Dosage (e.g., 1 tablet, 500 mg). Optional:\n> '));
      const schedule = normalizeText(
        await rl.question('Schedule (e.g., 1-0-1, twice daily, after dinner, 21:00):\n> ')
      );
      const duration = normalizeText(await rl.question('Duration (e.g., 5 days, 2 weeks, ongoing):\n> '));
      const instructions = normalizeText(await rl.question('Special instructions (optional):\n> '));

      if (name) {
        rawItems.push({
          medicine: name,
          dosage,
          frequency: schedule,
          timing: schedule,
          duration_text: duration,
          schedule_pattern: '',
          condition: '',
          instructions,
          source_text: ''
        });
        currentResult = compilePrescriptionData(rawItems, { userContext: currentResult.user_context });
      }
    }

    const removeAnswer = normalizeText(await rl.question('Remove a medicine? (y/n)\n> ')).toLowerCase();
    if ((removeAnswer === 'y' || removeAnswer === 'yes') && rawItems.length) {
      console.log('Current medicines:');
      rawItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.medicine}`);
      });

      const selection = normalizeText(await rl.question('Enter the number to remove:\n> '));
      const index = Number(selection) - 1;
      if (Number.isInteger(index) && rawItems[index]) {
        rawItems.splice(index, 1);
        currentResult = compilePrescriptionData(rawItems, { userContext: currentResult.user_context });
      }
    }

    return currentResult;
  } finally {
    await rl.close();
  }
}

async function askQuestionsUntilSettled(result) {
  if (!stdin.isTTY) {
    return result;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    let current = result;
    let previousSignature = '';

    while (Array.isArray(current.questions) && current.questions.length) {
      const signature = current.questions.map((question) => question.id).join('|');

      if (signature === previousSignature) {
        break;
      }

      previousSignature = signature;
      const answers = {};

      for (const question of current.questions) {
        while (true) {
          const answer = await rl.question(`${question.question}\n> `);
          const validation = validateAnswer(question, answer);

          if (validation.valid) {
            if (validation.normalized) {
              answers[question.id] = validation.normalized;
            }
            break;
          }

          console.log(validation.message);
        }
      }

      if (!Object.keys(answers).length) {
        break;
      }

      current = applyClarificationAnswers(current, answers);
    }

    return current;
  } finally {
    await rl.close();
  }
}

async function main() {
  const imagePathArg = process.argv[2];
  let imagePath = imagePathArg || '';
  let manualOnly = false;

  const preferences = await loadPreferences();
  if (!imagePath && stdin.isTTY) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      const answer = normalizeText(await rl.question('Use a prescription image? (y/n)\n> ')).toLowerCase();
      if (answer === 'y' || answer === 'yes') {
        imagePath = normalizeText(await rl.question('Image path:\n> '));
      } else {
        manualOnly = true;
      }
    } finally {
      await rl.close();
    }
  }

  const result = imagePath
    ? await extractMedicinesAndReminders(imagePath, {
        debug: true,
        userContext: buildUserContext(preferences)
      })
    : compilePrescriptionData([], { userContext: buildUserContext(preferences) });

  let edited = result;
  if (stdin.isTTY) {
    if (manualOnly) {
      edited = await manageManualEdits(result);
    } else {
      const rl = readline.createInterface({ input: stdin, output: stdout });
      try {
        const answer = normalizeText(
          await rl.question('Manually add or remove medicines before clarifications? (y/n)\n> ')
        ).toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          edited = await manageManualEdits(result);
        }
      } finally {
        await rl.close();
      }
    }
  }

  const finalized = await askQuestionsUntilSettled(edited);

  await savePreferences({
    ...preferences,
    ...collectPreferenceUpdates(finalized)
  });

  const startDateSource = finalized?.user_context?.start_date ? 'runtime_input' : 'missing';

  console.log(JSON.stringify({
    meta: {
      start_date_source: startDateSource,
      preferences_path: PREFERENCES_PATH
    },
    schedule_context: {
      start_date: finalized?.user_context?.start_date || '',
      start_date_source: startDateSource,
      meal_times_used: {
        breakfast: finalized?.user_context?.meal_times?.breakfast || '',
        lunch: finalized?.user_context?.meal_times?.lunch || '',
        dinner: finalized?.user_context?.meal_times?.dinner || ''
      },
      daypart_times_used: {
        morning: finalized?.user_context?.daypart_times?.morning || '',
        afternoon: finalized?.user_context?.daypart_times?.afternoon || '',
        evening: finalized?.user_context?.daypart_times?.evening || '',
        night: finalized?.user_context?.daypart_times?.night || '',
        bedtime: finalized?.user_context?.daypart_times?.bedtime || ''
      }
    },
    medications: finalized.medications || [],
    clarifications_needed: finalized.clarifications_needed || [],
    schedule_preview: (finalized.reminders || []).map((reminder) => ({
      ...reminder,
      dose: reminder.dose_count || reminder.dosage || ''
    })),
    error: finalized.error || ''
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
