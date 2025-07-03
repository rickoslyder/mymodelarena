export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables?: string[];
  category: string;
}

export const BUILT_IN_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'multiple-choice-basic',
    name: 'Multiple Choice Questions',
    description: 'Generate multiple choice questions with 4 options',
    category: 'Question Types',
    variables: ['count', 'difficulty', 'domain'],
    content: `Generate {{count}} {{difficulty}} difficulty multiple choice questions about {{domain}}.

For each question:
1. Create a clear, specific question
2. Provide exactly 4 answer options labeled A, B, C, D
3. Ensure only one option is clearly correct
4. Make incorrect options plausible but clearly wrong
5. Vary the position of correct answers

Requirements:
- Questions should test understanding, not just memorization
- Avoid ambiguous wording
- Each question should be self-contained
- Include a mix of factual and analytical questions

Format each question as:
Question: [question text]
A) [option 1]
B) [option 2] 
C) [option 3]
D) [option 4]
Correct Answer: [letter]
Explanation: [brief explanation]`
  },
  {
    id: 'coding-challenges',
    name: 'Coding Challenges',
    description: 'Programming problems and coding tasks',
    category: 'Programming',
    variables: ['count', 'difficulty', 'domain'],
    content: `Generate {{count}} {{difficulty}} level coding challenges focused on {{domain}}.

For each challenge:
1. Provide a clear problem description
2. Include input/output examples
3. Specify constraints and edge cases
4. Provide a sample solution approach (not full code)

Requirements:
- Problems should be solvable in multiple programming languages
- Include both algorithmic and practical coding tasks
- Vary complexity from basic syntax to advanced algorithms
- Test different programming concepts

Format:
Problem: [clear description]
Input: [input format and constraints]
Output: [expected output format]
Examples: [2-3 input/output examples]
Approach: [high-level solution strategy]`
  },
  {
    id: 'analytical-reasoning',
    name: 'Analytical Reasoning',
    description: 'Logic puzzles and analytical thinking problems',
    category: 'Reasoning',
    variables: ['count', 'difficulty'],
    content: `Create {{count}} {{difficulty}} analytical reasoning problems that test logical thinking and problem-solving skills.

For each problem:
1. Present a scenario with logical constraints
2. Ask questions that require deductive reasoning
3. Ensure problems have clear, unambiguous solutions
4. Include sufficient information to solve

Types to include:
- Logic grid puzzles
- Sequence pattern recognition
- Cause and effect analysis
- Assumption identification
- Argument evaluation

Requirements:
- Each problem should be self-contained
- Avoid cultural bias or specialized knowledge
- Provide clear, step-by-step reasoning for solutions
- Test different aspects of logical thinking`
  },
  {
    id: 'essay-prompts',
    name: 'Essay Questions',
    description: 'Open-ended essay and discussion prompts',
    category: 'Writing',
    variables: ['count', 'difficulty', 'domain'],
    content: `Generate {{count}} {{difficulty}} essay prompts related to {{domain}}.

For each prompt:
1. Create thought-provoking questions that require analysis
2. Provide clear context and background information
3. Include specific aspects to address in the response
4. Set appropriate scope for the difficulty level

Essay types:
- Argumentative (take a position and defend it)
- Analytical (examine and explain)
- Compare/contrast (identify similarities and differences)
- Cause/effect (explain relationships)
- Evaluative (assess and judge)

Requirements:
- Questions should encourage critical thinking
- Avoid yes/no questions - require elaboration
- Provide enough context for meaningful responses
- Include evaluation criteria or key points to address`
  },
  {
    id: 'comprehension-analysis',
    name: 'Text Comprehension',
    description: 'Reading comprehension with analysis questions',
    category: 'Language',
    variables: ['count', 'difficulty'],
    content: `Create {{count}} text comprehension exercises with {{difficulty}} level analysis questions.

For each exercise:
1. Provide a relevant passage (200-500 words)
2. Create 3-5 questions testing different comprehension levels
3. Include both literal and inferential questions
4. Test vocabulary in context

Question types to include:
- Main idea identification
- Detail recall
- Inference and implication
- Vocabulary in context
- Author's purpose/tone
- Text structure analysis

Requirements:
- Use engaging, well-written passages
- Questions should progress from basic to complex
- Avoid questions answerable without reading
- Include questions requiring synthesis of information`
  },
  {
    id: 'mathematical-problems',
    name: 'Math Word Problems',
    description: 'Mathematical reasoning and problem-solving',
    category: 'Mathematics',
    variables: ['count', 'difficulty', 'domain'],
    content: `Generate {{count}} {{difficulty}} mathematical word problems focusing on {{domain}}.

For each problem:
1. Create realistic, relatable scenarios
2. Provide all necessary information
3. Include step-by-step solution approach
4. Vary problem types and contexts

Problem types:
- Application problems (real-world scenarios)
- Multi-step problems requiring planning
- Problems with multiple valid approaches
- Estimation and reasoning problems

Requirements:
- Clear, unambiguous wording
- Realistic numbers and scenarios
- Test mathematical reasoning, not just computation
- Include problems requiring different mathematical concepts
- Provide detailed solution explanations`
  },
  {
    id: 'scenario-based',
    name: 'Scenario Analysis',
    description: 'Real-world scenarios requiring practical reasoning',
    category: 'Application',
    variables: ['count', 'difficulty', 'domain'],
    content: `Create {{count}} {{difficulty}} scenario-based questions related to {{domain}}.

For each scenario:
1. Present a realistic, complex situation
2. Include relevant background context
3. Ask questions requiring practical problem-solving
4. Test application of knowledge to new situations

Question focuses:
- Decision-making under constraints
- Problem identification and solution generation
- Risk assessment and mitigation
- Stakeholder analysis
- Resource allocation
- Ethical considerations

Requirements:
- Scenarios should be believable and relevant
- Include sufficient detail for informed responses
- Test practical application of theoretical knowledge
- Avoid overly specialized jargon
- Include multiple valid solution approaches`
  },
  {
    id: 'creative-synthesis',
    name: 'Creative Problem Solving',
    description: 'Open-ended creative and synthesis challenges',
    category: 'Creativity',
    variables: ['count', 'domain'],
    content: `Design {{count}} creative problem-solving challenges related to {{domain}}.

For each challenge:
1. Present an open-ended problem or opportunity
2. Encourage innovative thinking and multiple solutions
3. Include constraints to focus creativity
4. Test ability to synthesize ideas from different sources

Challenge types:
- Design thinking problems
- Innovation challenges
- Synthesis of disparate concepts
- Alternative use generation
- Improvement and optimization
- Cross-disciplinary applications

Requirements:
- No single "correct" answer
- Encourage diverse approaches
- Include evaluation criteria for responses
- Test originality, feasibility, and effectiveness
- Provide sufficient creative freedom within constraints`
  }
];

export const getTemplatesByCategory = (): Record<string, PromptTemplate[]> => {
  return BUILT_IN_PROMPT_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, PromptTemplate[]>);
};

export const getTemplateById = (id: string): PromptTemplate | undefined => {
  return BUILT_IN_PROMPT_TEMPLATES.find(template => template.id === id);
};