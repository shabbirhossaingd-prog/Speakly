export type LearnerType =
  | "school"
  | "college"
  | "university"
  | "professional"
  | "ielts"
  | "other";

export type CollegeGroup = "science" | "commerce" | "arts";

export type LearningProfile = {
  learnerType: LearnerType | "";
  classLevel: string;
  studyGroup: CollegeGroup | "none" | "";
  field: string;
  goals: string[];
  englishLevel: string;
  subjects: string[];
  learningStyle: string[];
};

export const initialLearningProfile: LearningProfile = {
  learnerType: "",
  classLevel: "",
  studyGroup: "",
  field: "",
  goals: [],
  englishLevel: "",
  subjects: [],
  learningStyle: [],
};

export const collegeSubjects: Record<CollegeGroup, string[]> = {
  science: ["Physics", "Chemistry", "Biology", "Higher Math", "ICT"],
  commerce: ["Accounting", "Finance", "Business Organization", "Economics", "ICT"],
  arts: ["Economics", "Civics", "History", "Sociology", "Geography", "Logic"],
};

export const universityFields = [
  "Computer Science & Engineering",
  "Electrical & Electronic Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Business Administration",
  "Accounting",
  "Marketing",
  "Economics",
  "English",
  "Law",
  "Medical",
  "Pharmacy",
  "Architecture",
  "Other",
];

export const goalOptions = [
  "Fluent Daily Conversation",
  "Speaking Confidence",
  "Academic Study",
  "IELTS",
  "Job Interview",
  "Corporate English",
  "Presentation",
  "Professional Writing",
  "Advanced Vocabulary",
  "Study Abroad",
];

// Speakly is intentionally not a beginner alphabet/basic-sentence course.
// The product starts from a functional Standard level and moves toward
// confident, academic and professional English.
export const levelOptions = [
  {
    id: "standard",
    label: "Standard",
    hint: "I can use everyday English, but I want better grammar, vocabulary and confidence.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    hint: "I can communicate clearly, but I want stronger fluency, accuracy and expression.",
  },
  {
    id: "upper-intermediate",
    label: "Upper Intermediate",
    hint: "I can discuss complex topics and want more natural, polished English.",
  },
  {
    id: "advanced",
    label: "Advanced",
    hint: "I want high-level academic, professional, IELTS and presentation communication.",
  },
];

export function getSuggestedTopics(profile: LearningProfile) {
  if (profile.learnerType === "college" && profile.studyGroup === "science") {
    return [
      "Explain a scientific concept using precise English",
      "Learn high-value academic Physics vocabulary",
      "Give a 2-minute explanation with clear structure and transitions",
      "Read an ICT passage and summarize it professionally",
    ];
  }

  if (profile.learnerType === "college" && profile.studyGroup === "commerce") {
    return [
      "Explain assets, liabilities and cash flow using business English",
      "Practice professional finance and accounting vocabulary",
      "Summarize a balance sheet in clear English",
      "Deliver a short business presentation with strong transitions",
    ];
  }

  if (profile.learnerType === "college" && profile.studyGroup === "arts") {
    return [
      "Build a clear argument about a historical or social topic",
      "Practice analytical and opinion vocabulary",
      "Summarize an academic passage with stronger sentence structure",
      "Present a topic with evidence, transitions and a strong conclusion",
    ];
  }

  if (profile.field.toLowerCase().includes("computer")) {
    return [
      "Explain a database concept clearly in 60 seconds",
      "Compare SQL and NoSQL using technical English",
      "Practice advanced CSE vocabulary in context",
      "Complete a project viva with the AI tutor",
    ];
  }

  return [
    "Complete a focused fluency lesson",
    "Practice a realistic conversation with stronger expression",
    "Review high-value vocabulary in context",
    "Speak for 2 minutes and improve clarity, grammar and fluency",
  ];
}
