export interface LeagueTier {
  name: string;
  color: string;
  dark: string;
  emoji: string;
}

export const LEAGUES: LeagueTier[] = [
  { name: 'Bronze', color: '#CD7F32', dark: '#9A5F26', emoji: '🥉' },
  { name: 'Silver', color: '#B8C0C8', dark: '#8C949C', emoji: '🥈' },
  { name: 'Gold', color: '#FFC800', dark: '#C99A00', emoji: '🥇' },
  { name: 'Sapphire', color: '#2F6BFF', dark: '#2150C4', emoji: '🔷' },
  { name: 'Ruby', color: '#E0245E', dark: '#B01848', emoji: '♦️' },
  { name: 'Emerald', color: '#00B26B', dark: '#008A52', emoji: '💚' },
  { name: 'Amethyst', color: '#9B59FF', dark: '#7A3FD1', emoji: '🔮' },
  { name: 'Pearl', color: '#F2D7E8', dark: '#C9A8BC', emoji: '🦪' },
  { name: 'Obsidian', color: '#3A3A4A', dark: '#1F1F2B', emoji: '🖤' },
  { name: 'Diamond', color: '#4DD9FF', dark: '#1FA9D6', emoji: '💎' },
];

export const BOT_NAMES = [
  'Aarav', 'Maria', 'Kavya', 'Diego', 'Ishaan', 'Sofia', 'Lakshmi', 'Mateo', 'Anita', 'Lucas',
  'Meera', 'Carlos', 'Nila', 'Valentina', 'Arjun', 'Camila', 'Divya', 'Pablo', 'Sneha', 'Andrés',
  'Priya', 'Julia', 'Karthik', 'Elena', 'Rohan', 'Isabel', 'Tara', 'Javier', 'Ananya', 'Marco',
  'Deepa', 'Lucía', 'Vikram', 'Paula', 'Suresh', 'Daniela', 'Ravi', 'Carmen', 'Hari', 'Alba',
];
export const BOT_AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🐨', '🦄', '🐙', '🦉', '🐧', '🐢', '🦋', '🐝', '🐬'];
