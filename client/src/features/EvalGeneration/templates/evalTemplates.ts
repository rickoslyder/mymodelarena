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
export const getTemplatesByCategory = (templates: { category: string }[], category: string) => {
  if (category === 'All') {
    return templates;
  }
  return templates.filter(template => template.category === category);
};

export const getTemplateById = (templates: { id: string }[], id: string) => {
  return templates.find(template => template.id === id);
};