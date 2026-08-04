import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from'react';
import{THEME_DEFINITIONS,makeCustomTheme,resolveThemeId,themeHasAccess}from'../constants/themes';
import{calculateStreak}from'../utils/storage';
import{getPremiumPrefs,getPremiumStatus,savePremiumPrefs}from'../utils/premium';
const C=createContext(null);
export function ThemeProvider({children}){
 const[prefs,setPrefs]=useState({selectedTheme:'auto',birthday:'',demoPremium:false,customTheme:null});const[accessIds,setAccessIds]=useState([]);const[source,setSource]=useState('loading');const[streak,setStreak]=useState(0);const[preview,setPreview]=useState('');const timer=useRef(null);
 const hasAccess=useCallback((access)=>access==='free'||accessIds.includes('premium')||accessIds.includes(access),[accessIds]);
 const refresh=useCallback(async()=>{const[status,p,s]=await Promise.all([getPremiumStatus(),getPremiumPrefs(),calculateStreak().catch(()=>({streak:0}))]);setPrefs(p);setAccessIds(status.accessIds||[]);setSource(status.source);setStreak(s.streak||0)},[]);
 useEffect(()=>{refresh();return()=>{if(timer.current)clearTimeout(timer.current)}},[refresh]);
 const updatePrefs=useCallback(async(changes)=>{const next=await savePremiumPrefs(changes);setPrefs(next);await refresh();},[refresh]);
 const custom=prefs.customTheme?makeCustomTheme(prefs.customTheme):null;const selectedId=resolveThemeId({selected:prefs.selectedTheme,date:new Date(),birthday:prefs.birthday,streak,hasAccess});
 let theme;
 if(preview){
  // Previewing a locked theme is the entire point of this feature, so it
  // deliberately bypasses themeHasAccess — only fall back if the id itself
  // doesn't resolve to a real theme.
  theme=preview==='custom'?custom:THEME_DEFINITIONS[preview];
  if(!theme)theme=THEME_DEFINITIONS.standard;
 }else{
  theme=selectedId==='custom'?custom:THEME_DEFINITIONS[selectedId];
  if(!theme||!themeHasAccess(theme,hasAccess,streak))theme=THEME_DEFINITIONS.standard;
 }
 const previewTheme=useCallback((id)=>{if(timer.current)clearTimeout(timer.current);setPreview(id);timer.current=setTimeout(()=>setPreview(''),30000)},[]);
 const value=useMemo(()=>({colors:theme.colors,theme,themeId:theme.id,premium:hasAccess('premium'),hasAccess,accessIds,prefs,streak,source,refresh,updatePrefs,previewTheme,stopPreview:()=>setPreview(''),previewing:Boolean(preview)}),[accessIds,hasAccess,prefs,preview,previewTheme,refresh,source,streak,theme,updatePrefs]);
 return<C.Provider value={value}>{children}</C.Provider>;
}
export function useTheme(){return useContext(C)||{colors:THEME_DEFINITIONS.standard.colors,theme:THEME_DEFINITIONS.standard,premium:false,hasAccess:()=>false,prefs:{},streak:0}}
