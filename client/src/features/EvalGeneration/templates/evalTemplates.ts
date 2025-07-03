// Template categories for UI filtering
// Templates are now loaded from the API

export const TEMPLATE_CATEGORIES = [
  'All',
  'Programming',
  'Logic & Reasoning',
  'Knowledge',
  'Language',
  'Ethics',
  'Analysis',
  'General'
];

// Template filtering helper functions
export const getTemplatesByCategory = <T extends { category: string }>(templates: T[], category: string): T[] => {
  if (category === 'All') {
    return templates;
  }
  return templates.filter(template => template.category === category);
};

export const getTemplateById = <T extends { id: string }>(templates: T[], id: string): T | undefined => {
  return templates.find(template => template.id === id);
};