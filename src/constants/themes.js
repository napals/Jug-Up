export const ACCESS = { FREE: 'free', PREMIUM: 'premium', SEASONS: 'seasons', HOLIDAYS: 'holidays' };
const base = { onPrimary:'#FFFFFF', success:'#22C55E', warning:'#F59E0B', danger:'#DC2626' };
export const THEME_DEFINITIONS = {
  standard:{ id:'standard', name:'Hydrate Blue', emoji:'💧', access:ACCESS.FREE, description:'The clean free Hydrate theme.', colors:{...base,background:'#EAF6FF',primary:'#1E90FF',primaryDark:'#0B5ED7',accent:'#4FD1E9',card:'#FFFFFF',surface:'#FFFFFF',text:'#0B2545',textMuted:'#5C7A99',border:'#DCE9F5',soft:'#E1F1FF',track:'#D7ECFB'}},
  midnight:{ id:'midnight', name:'Midnight', emoji:'🌙', access:ACCESS.FREE, description:'A calm free dark theme.', colors:{...base,background:'#08111F',primary:'#60A5FA',primaryDark:'#93C5FD',accent:'#22D3EE',card:'#132238',surface:'#111C2E',text:'#F3F8FF',textMuted:'#9FB3CB',border:'#263A54',soft:'#172E4A',track:'#203651'}},
  spring:{ id:'spring', name:'Spring Bloom', emoji:'🌸', access:ACCESS.SEASONS, description:'Fresh leaves, blossoms and soft rain.', colors:{...base,background:'#F1FBF3',primary:'#4CAF72',primaryDark:'#257A4A',accent:'#F28AB2',card:'#FFFFFF',surface:'#FFFFFF',text:'#163C2A',textMuted:'#5E7D6B',border:'#D8EEDC',soft:'#E4F7E9',track:'#D7F0DE'}},
  summer:{ id:'summer', name:'Summer Splash', emoji:'☀️', access:ACCESS.SEASONS, description:'Pool blue, sunshine and tropical energy.', colors:{...base,background:'#E7FBFF',primary:'#00A7C7',primaryDark:'#006F87',accent:'#FFB703',card:'#FFFFFF',surface:'#FFFFFF',text:'#073B4C',textMuted:'#4C7580',border:'#CDECF2',soft:'#D9F7FC',track:'#C7EEF5'}},
  autumn:{ id:'autumn', name:'Autumn Harvest', emoji:'🍂', access:ACCESS.SEASONS, description:'Warm amber leaves and cosy cards.', colors:{...base,background:'#FFF7ED',primary:'#D97706',primaryDark:'#92400E',accent:'#EAB308',card:'#FFFFFF',surface:'#FFFFFF',text:'#431407',textMuted:'#8B5E4A',border:'#F4D9C0',soft:'#FDEBD7',track:'#F7DFC7'}},
  winter:{ id:'winter', name:'Winter Frost', emoji:'❄️', access:ACCESS.SEASONS, description:'Icy blues and quiet winter light.', colors:{...base,background:'#EDF5FF',primary:'#4979C6',primaryDark:'#274C8A',accent:'#9AD9EA',card:'#FFFFFF',surface:'#FFFFFF',text:'#142A4A',textMuted:'#637895',border:'#D5E2F3',soft:'#E0ECFA',track:'#D6E5F7'}},
  halloween:{ id:'halloween', name:'Halloween Night', emoji:'🎃', access:ACCESS.HOLIDAYS, description:'Pumpkins, purple night and spooky sips.', colors:{...base,background:'#160D23',primary:'#F97316',primaryDark:'#FDBA74',accent:'#A855F7',card:'#2D1943',surface:'#251438',text:'#FFF7ED',textMuted:'#D4BCE7',border:'#4A2B65',soft:'#392050',track:'#4A2B65'}},
  christmas:{ id:'christmas', name:'Christmas Cheer', emoji:'🎄', access:ACCESS.HOLIDAYS, description:'Evergreen, cranberry and snowy highlights.', colors:{...base,background:'#F3F8F3',primary:'#B91C1C',primaryDark:'#7F1D1D',accent:'#15803D',card:'#FFFFFF',surface:'#FFFFFF',text:'#17351F',textMuted:'#627568',border:'#D9E7DB',soft:'#E7F2E9',track:'#D8EBDD'}},
  newyear:{ id:'newyear', name:'New Year Glow', emoji:'🎆', access:ACCESS.HOLIDAYS, description:'Midnight blue with celebratory gold.', colors:{...base,onPrimary:'#17120A',background:'#080C24',primary:'#F4C95D',primaryDark:'#FFE39A',accent:'#8B5CF6',card:'#151D48',surface:'#111739',text:'#FFFFFF',textMuted:'#B9C1E2',border:'#303A72',soft:'#202858',track:'#2B356A'}},
  valentine:{ id:'valentine', name:'Valentine Hearts', emoji:'💗', access:ACCESS.HOLIDAYS, description:'Rose, berry and soft romantic accents.', colors:{...base,background:'#FFF0F5',primary:'#E11D70',primaryDark:'#9D174D',accent:'#FB7185',card:'#FFFFFF',surface:'#FFFFFF',text:'#4A102D',textMuted:'#8D5B72',border:'#F4CDD9',soft:'#FCE2EC',track:'#F7D6E2'}},
  birthday:{ id:'birthday', name:'Birthday Celebration', emoji:'🎂', access:ACCESS.PREMIUM, description:'Confetti colours on your birthday.', colors:{...base,background:'#FFF8E7',primary:'#7C3AED',primaryDark:'#5B21B6',accent:'#F59E0B',card:'#FFFFFF',surface:'#FFFFFF',text:'#33204F',textMuted:'#76658C',border:'#E8D9F5',soft:'#F1E8FA',track:'#E8DBF5'}},
  champion:{ id:'champion', name:'Streak Champion', emoji:'🏆', access:ACCESS.PREMIUM, unlockStreak:30, description:'A metallic reward for a 30-day streak.', colors:{...base,onPrimary:'#201A0A',background:'#101827',primary:'#F5C451',primaryDark:'#FFE39A',accent:'#38BDF8',card:'#1D2940',surface:'#172033',text:'#FFF9E8',textMuted:'#C4C9D3',border:'#35435D',soft:'#27344C',track:'#34435F'}},
};
export const THEME_IDS=Object.keys(THEME_DEFINITIONS);
export function themeHasAccess(theme, hasAccess, streak=0){ if(!(theme?.access===ACCESS.FREE || hasAccess(theme?.access)))return false; if(theme?.unlockStreak && streak<theme.unlockStreak)return false; return true; }
export function seasonalThemeId(date=new Date(), birthday='', hasAccess=()=>false){
  const d=new Date(date); const m=d.getMonth()+1; const day=d.getDate(); const mmdd=`${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if(birthday && String(birthday).slice(5)===mmdd && hasAccess(ACCESS.PREMIUM)) return 'birthday';
  if(((m===12&&day>=27)||(m===1&&day<=7)) && hasAccess(ACCESS.HOLIDAYS)) return 'newyear';
  if(m===2&&day>=7&&day<=15 && hasAccess(ACCESS.HOLIDAYS)) return 'valentine';
  if(((m===10&&day>=15)||(m===11&&day<=2)) && hasAccess(ACCESS.HOLIDAYS)) return 'halloween';
  if(m===12&&day<=26 && hasAccess(ACCESS.HOLIDAYS)) return 'christmas';
  if(hasAccess(ACCESS.SEASONS)||hasAccess(ACCESS.PREMIUM)){ if(m>=3&&m<=5)return 'spring'; if(m>=6&&m<=8)return 'summer'; if(m>=9&&m<=11)return 'autumn'; return 'winter'; }
  return 'standard';
}
export function resolveThemeId({selected='auto',date=new Date(),birthday='',streak=0,hasAccess=()=>false}){
  if(selected!=='auto' && THEME_DEFINITIONS[selected] && themeHasAccess(THEME_DEFINITIONS[selected],hasAccess,streak)){ return selected; }
  if(streak>=30&&hasAccess(ACCESS.PREMIUM))return 'champion'; return seasonalThemeId(date,birthday,hasAccess);
}
export function makeCustomTheme(input={}){
 const standard=THEME_DEFINITIONS.standard.colors; const valid=(v,f)=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toUpperCase():f;
 return {id:'custom',name:String(input.name||'My Theme').trim().slice(0,40)||'My Theme',emoji:'🎨',access:ACCESS.PREMIUM,description:'Your personalised Hydrate palette.',colors:{...base,background:valid(input.background,standard.background),surface:valid(input.surface,standard.surface),card:valid(input.surface,standard.card),primary:valid(input.primary,standard.primary),primaryDark:valid(input.primaryDark,standard.primaryDark),accent:valid(input.accent,standard.accent),text:valid(input.text,standard.text),textMuted:valid(input.textMuted,standard.textMuted),border:valid(input.border,standard.border),soft:valid(input.soft,standard.soft),track:valid(input.track,standard.track),onPrimary:valid(input.onPrimary,standard.onPrimary)}};
}
