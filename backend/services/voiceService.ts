export type VoiceReminder = {
  medicine: string;
  dosage: string;
  time: string;
  quantity: number;
};

export type VoiceQueryInput = {
  userId: string;
  query: string;
};

export type VoiceQueryResult = {
  success: boolean;
  text: string;
  medicines: Array<{ name: string; dosage: string; time: string; quantity: number }>;
};

const isRemainingMedicineQuery = (query: string): boolean =>
  /\b(remaining|left|stock|balance|pending|how many)\b/i.test(query);

export const handleVoiceQuery = async (
  input: VoiceQueryInput,
  reminders: VoiceReminder[]
): Promise<VoiceQueryResult> => {
  const cleanQuery = input.query.trim();

  if (!cleanQuery) {
    return {
      success: false,
      text: 'Please provide a valid query.',
      medicines: []
    };
  }

  const medicines = reminders.map((item) => ({
    name: item.medicine,
    dosage: item.dosage,
    time: item.time,
    quantity: item.quantity
  }));

  if (medicines.length === 0) {
    return {
      success: true,
      text: 'No medicines are currently saved for this user.',
      medicines: []
    };
  }

  if (isRemainingMedicineQuery(cleanQuery)) {
    const remainingSummary = medicines
      .map((m) => `${m.name}: ${m.quantity} dose${m.quantity === 1 ? '' : 's'} remaining`)
      .join(', ');

    const totalDosesRemaining = medicines.reduce((sum, medicine) => sum + medicine.quantity, 0);

    return {
      success: true,
      text: `You have ${totalDosesRemaining} total dose${
        totalDosesRemaining === 1 ? '' : 's'
      } remaining. ${remainingSummary}.`,
      medicines
    };
  }

  const medicineSummary = medicines
    .map((m) => `${m.name} (${m.dosage}) at ${m.time}`)
    .join(', ');

  return {
    success: true,
    text: `You currently have: ${medicineSummary}.`,
    medicines
  };
};
