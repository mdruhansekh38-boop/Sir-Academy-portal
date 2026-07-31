export const CLASSES = [
  'Class V',
  'Class VI',
  'Class VII',
  'Class VIII',
  'Class IX',
  'Class X',
  'Class XI',
  'Class XII',
] as const;

export type ClassName = (typeof CLASSES)[number];

/**
 * Official class → fixed subjects mapping.
 * Class V   : Bengali, English, Mathematics, Environmental Science
 * Class VI-VIII: Bengali, English, Mathematics, Geography, History, Environment & Science
 * Class IX-X: Bengali, English, Mathematics, Geography, History, Life Science, Physical Science
 * Class XI-XII: Bengali, English + elective subjects chosen per student
 *   (Nutrition, Geography, History, Pol. Science, Philosophy, Education)
 */
export const CLASS_SUBJECTS: Record<ClassName, string[]> = {
  'Class V': ['Bengali', 'English', 'Mathematics', 'Environmental Science'],
  'Class VI': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Environment & Science'],
  'Class VII': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Environment & Science'],
  'Class VIII': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Environment & Science'],
  'Class IX': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Life Science', 'Physical Science'],
  'Class X': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Life Science', 'Physical Science'],
  'Class XI': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Life Science', 'Physical Science'],
  'Class XII': ['Bengali', 'English', 'Mathematics', 'Geography', 'History', 'Life Science', 'Physical Science'],
};

/** Elective subjects available to Class XI/XII students for multi-select. */
export const SENIOR_ELECTIVES = [
  'Nutrition',
  'Geography',
  'History',
  'Pol. Science',
  'Philosophy',
  'Education',
] as const;

/** Full subject list used by the DPP publisher (every class combined). */
export const ALL_SUBJECTS = Array.from(
  new Set(Object.values(CLASS_SUBJECTS).flat().concat([...SENIOR_ELECTIVES])),
).sort();

/** Returns the fixed subject list for a given class. Empty array if unknown. */
export function subjectsForClass(className: string): string[] {
  return CLASS_SUBJECTS[className as ClassName] ?? [];
}

/** True for Class XI / Class XII — students pick their own electives. */
export function isSeniorClass(className: string): boolean {
  return className === 'Class XI' || className === 'Class XII';
}

/**
 * Returns the subjects a student should see based on their class and
 * enrolled_subjects:
 *  - Class V-X: the fixed class subjects
 *  - Class XI/XII: Bengali + English + the student's chosen electives
 */
export function effectiveSubjects(
  className: string,
  enrolledSubjects: string[] | null | undefined,
): string[] {
  if (isSeniorClass(className)) {
    const electives = (enrolledSubjects ?? []).filter(Boolean);
    return ['Bengali', 'English', ...electives];
  }
  return subjectsForClass(className);
}
