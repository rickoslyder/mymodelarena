import prisma from "../db/prisma";

// Define the template interface matching the frontend structure
interface TemplateData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  prompt: string;
  defaultOptions: {
    questionTypes: string[];
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    format: 'open-ended' | 'multiple-choice' | 'true-false' | 'code-completion';
    count: number;
  };
  tags: string[];
  examples: string[];
}

// All the existing templates from the frontend
const TEMPLATE_DATA: TemplateData[] = [
  // Programming & Technical
  {
    id: 'python-basics',
    name: 'Python Programming Basics',
    description: 'Essential Python programming concepts and syntax',
    category: 'Programming',
    icon: '🐍',
    prompt: 'Generate Python programming questions covering basic syntax, data types, control structures, and functions. Focus on practical coding problems that test fundamental understanding.',
    defaultOptions: {
      questionTypes: ['coding'],
      difficulty: 'medium',
      format: 'code-completion',
      count: 10
    },
    tags: ['python', 'programming', 'basics'],
    examples: [
      'Write a function to find the largest number in a list',
      'Implement a simple class for a bank account with deposit/withdraw methods',
      'Debug this code that should reverse a string'
    ]
  },
  {
    id: 'data-structures',
    name: 'Data Structures & Algorithms',
    description: 'Common data structures and algorithmic thinking',
    category: 'Programming',
    icon: '🔗',
    prompt: 'Create challenging questions about data structures (arrays, linked lists, trees, graphs) and algorithms (sorting, searching, dynamic programming). Include implementation and analysis tasks.',
    defaultOptions: {
      questionTypes: ['coding', 'logic'],
      difficulty: 'hard',
      format: 'code-completion',
      count: 8
    },
    tags: ['algorithms', 'data-structures', 'computer-science'],
    examples: [
      'Implement a binary search tree with insertion and deletion',
      'Find the shortest path in a weighted graph',
      'Analyze the time complexity of this recursive function'
    ]
  },
  {
    id: 'web-development',
    name: 'Web Development Fundamentals',
    description: 'HTML, CSS, JavaScript, and web technologies',
    category: 'Programming',
    icon: '🌐',
    prompt: 'Generate questions covering web development fundamentals including HTML structure, CSS styling, JavaScript programming, DOM manipulation, and modern web APIs.',
    defaultOptions: {
      questionTypes: ['coding', 'knowledge'],
      difficulty: 'medium',
      format: 'code-completion',
      count: 12
    },
    tags: ['web-development', 'html', 'css', 'javascript'],
    examples: [
      'Create a responsive navigation bar using CSS flexbox',
      'Write JavaScript to validate a form and display errors',
      'Explain the difference between var, let, and const'
    ]
  },

  // Logic & Reasoning
  {
    id: 'logical-puzzles',
    name: 'Logical Reasoning Puzzles',
    description: 'Brain teasers and logical deduction challenges',
    category: 'Logic & Reasoning',
    icon: '🧩',
    prompt: 'Create logical reasoning puzzles that test deductive reasoning, pattern recognition, and problem-solving skills. Include riddles, sequence puzzles, and logical deduction problems.',
    defaultOptions: {
      questionTypes: ['logic'],
      difficulty: 'medium',
      format: 'open-ended',
      count: 10
    },
    tags: ['logic', 'puzzles', 'reasoning'],
    examples: [
      'If all roses are flowers and some flowers fade quickly, what can we conclude?',
      'Find the pattern in this sequence: 2, 6, 12, 20, 30, ?',
      'Five people sit in a row. Given these clues, determine their order...'
    ]
  },
  {
    id: 'mathematical-reasoning',
    name: 'Mathematical Problem Solving',
    description: 'Mathematical word problems and analytical thinking',
    category: 'Logic & Reasoning',
    icon: '🔢',
    prompt: 'Design mathematical word problems that require analytical thinking, covering algebra, geometry, probability, and real-world applications of mathematics.',
    defaultOptions: {
      questionTypes: ['math', 'logic'],
      difficulty: 'medium',
      format: 'open-ended',
      count: 8
    },
    tags: ['mathematics', 'word-problems', 'analytical'],
    examples: [
      'A train travels 300km in 4 hours. If it increases speed by 25%, how long for the same journey?',
      'What is the probability of drawing two red cards from a standard deck?',
      'Find the area of a triangle given three coordinate points'
    ]
  },

  // Knowledge & Facts
  {
    id: 'science-trivia',
    name: 'Science Knowledge Quiz',
    description: 'General science facts and concepts',
    category: 'Knowledge',
    icon: '🔬',
    prompt: 'Create science questions covering biology, chemistry, physics, and earth science. Mix factual recall with conceptual understanding and real-world applications.',
    defaultOptions: {
      questionTypes: ['knowledge'],
      difficulty: 'medium',
      format: 'multiple-choice',
      count: 15
    },
    tags: ['science', 'biology', 'chemistry', 'physics'],
    examples: [
      'What is the chemical formula for water?',
      'Which planet is closest to the Sun?',
      'Explain photosynthesis in simple terms'
    ]
  },
  {
    id: 'world-history',
    name: 'World History Assessment',
    description: 'Historical events, figures, and civilizations',
    category: 'Knowledge',
    icon: '🏛️',
    prompt: 'Generate questions about major historical events, important figures, ancient civilizations, and historical cause-and-effect relationships across different time periods.',
    defaultOptions: {
      questionTypes: ['knowledge', 'analysis'],
      difficulty: 'medium',
      format: 'open-ended',
      count: 12
    },
    tags: ['history', 'civilizations', 'events'],
    examples: [
      'What were the main causes of World War I?',
      'Compare the governmental systems of ancient Athens and Sparta',
      'Describe the impact of the printing press on European society'
    ]
  },

  // Language & Communication
  {
    id: 'english-grammar',
    name: 'English Grammar & Usage',
    description: 'Grammar rules, sentence structure, and language mechanics',
    category: 'Language',
    icon: '📝',
    prompt: 'Create questions testing English grammar, punctuation, sentence structure, and language usage. Include error correction and style improvement tasks.',
    defaultOptions: {
      questionTypes: ['language'],
      difficulty: 'medium',
      format: 'multiple-choice',
      count: 12
    },
    tags: ['grammar', 'english', 'language'],
    examples: [
      'Identify the grammatical error in this sentence',
      'Choose the correct punctuation for this compound sentence',
      'Rewrite this sentence to eliminate the dangling modifier'
    ]
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing Prompts',
    description: 'Imaginative writing and storytelling challenges',
    category: 'Language',
    icon: '✍️',
    prompt: 'Design creative writing prompts that inspire imaginative storytelling, character development, and descriptive writing. Include various genres and writing styles.',
    defaultOptions: {
      questionTypes: ['creative'],
      difficulty: 'medium',
      format: 'open-ended',
      count: 8
    },
    tags: ['creative-writing', 'storytelling', 'imagination'],
    examples: [
      'Write a short story that begins with "The last person on Earth heard a knock at the door"',
      'Describe a character who can taste colors',
      'Create a dialogue between two characters who speak different languages'
    ]
  },

  // Ethics & Philosophy
  {
    id: 'ethical-dilemmas',
    name: 'Ethical Decision Making',
    description: 'Moral reasoning and ethical philosophy questions',
    category: 'Ethics',
    icon: '⚖️',
    prompt: 'Present ethical dilemmas and moral reasoning challenges that explore different philosophical frameworks, real-world ethical issues, and decision-making under moral uncertainty.',
    defaultOptions: {
      questionTypes: ['ethics'],
      difficulty: 'hard',
      format: 'open-ended',
      count: 6
    },
    tags: ['ethics', 'philosophy', 'moral-reasoning'],
    examples: [
      'Is it ethical to lie to protect someone\'s feelings?',
      'Should AI systems be programmed with specific moral values?',
      'Analyze the trolley problem from utilitarian and deontological perspectives'
    ]
  },

  // Analysis & Critical Thinking
  {
    id: 'text-analysis',
    name: 'Reading Comprehension & Analysis',
    description: 'Text analysis, inference, and critical reading skills',
    category: 'Analysis',
    icon: '🔍',
    prompt: 'Create questions that test reading comprehension, textual analysis, inference skills, and critical thinking about written passages from various domains.',
    defaultOptions: {
      questionTypes: ['analysis'],
      difficulty: 'medium',
      format: 'open-ended',
      count: 10
    },
    tags: ['reading', 'analysis', 'comprehension'],
    examples: [
      'What is the main argument presented in this passage?',
      'Identify the logical fallacy in this argument',
      'What can you infer about the author\'s perspective?'
    ]
  },

  // Mixed/General
  {
    id: 'general-knowledge',
    name: 'General Knowledge Quiz',
    description: 'Broad knowledge across multiple domains',
    category: 'General',
    icon: '🌟',
    prompt: 'Generate a diverse set of questions covering multiple knowledge areas including current events, geography, culture, technology, and general trivia.',
    defaultOptions: {
      questionTypes: ['knowledge', 'analysis'],
      difficulty: 'medium',
      format: 'multiple-choice',
      count: 20
    },
    tags: ['general-knowledge', 'trivia', 'diverse'],
    examples: [
      'Which country has the most time zones?',
      'What is the most widely spoken language in the world?',
      'Name three renewable energy sources'
    ]
  },
  {
    id: 'critical-thinking',
    name: 'Critical Thinking Assessment',
    description: 'Comprehensive reasoning and analysis across domains',
    category: 'General',
    icon: '🎯',
    prompt: 'Design questions that test critical thinking skills including logical reasoning, problem-solving, pattern recognition, and analytical thinking across various contexts.',
    defaultOptions: {
      questionTypes: ['logic', 'analysis', 'math'],
      difficulty: 'hard',
      format: 'open-ended',
      count: 8
    },
    tags: ['critical-thinking', 'reasoning', 'analysis'],
    examples: [
      'Analyze the assumptions in this argument and identify potential flaws',
      'Given this data set, what conclusions can be drawn?',
      'Solve this multi-step problem using logical reasoning'
    ]
  }
];

export async function seedTemplates() {
  console.log('Starting template seeding...');

  try {
    // First, check if templates already exist
    const existingCount = await prisma.evalTemplate.count();
    if (existingCount > 0) {
      console.log(`Templates already exist (${existingCount} found). Skipping seed.`);
      return;
    }

    // Transform and insert templates
    const templatesToInsert = TEMPLATE_DATA.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      prompt: template.prompt,
      isPublic: true,
      isBuiltIn: true,
      defaultQuestionTypes: JSON.stringify(template.defaultOptions.questionTypes),
      defaultDifficulty: template.defaultOptions.difficulty,
      defaultFormat: template.defaultOptions.format,
      defaultCount: template.defaultOptions.count,
      tags: JSON.stringify(template.tags),
      examples: JSON.stringify(template.examples),
      usageCount: 0,
    }));

    // Insert templates in batches for better performance
    const batchSize = 5;
    for (let i = 0; i < templatesToInsert.length; i += batchSize) {
      const batch = templatesToInsert.slice(i, i + batchSize);
      await prisma.evalTemplate.createMany({
        data: batch
      });
      console.log(`Inserted template batch ${Math.floor(i/batchSize) + 1}`);
    }

    console.log(`Successfully seeded ${templatesToInsert.length} templates`);

  } catch (error) {
    console.error('Error seeding templates:', error);
    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Template seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Template seeding failed:', error);
      process.exit(1);
    });
}