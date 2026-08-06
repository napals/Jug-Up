// Kept separate from drinkTypes.js deliberately — that file stays free of
// any React Native/Metro-specific code (like image requires) so it can be
// tested with plain Node. This file is only ever imported by actual RN
// screens, never by the tests/ suite.
export const DRINK_ICONS = {
  water: require('../../assets/drinks/water.png'),
  sparkling: require('../../assets/drinks/sparkling.png'),
  tea: require('../../assets/drinks/tea.png'),
  coffee: require('../../assets/drinks/coffee.png'),
  soda: require('../../assets/drinks/soda.png'),
  juice: require('../../assets/drinks/juice.png'),
  sports: require('../../assets/drinks/sports.png'),
  milk: require('../../assets/drinks/milk.png'),
  energy: require('../../assets/drinks/energy.png'),
  beer: require('../../assets/drinks/beer.png'),
  wine: require('../../assets/drinks/wine.png'),
  spirits: require('../../assets/drinks/spirits.png'),
};