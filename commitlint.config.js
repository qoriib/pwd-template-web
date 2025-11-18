module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Relax rules so empty type/subject don't block commits (still lint others).
  rules: {
    'type-empty': [0],
    'subject-empty': [0],
  },
};
