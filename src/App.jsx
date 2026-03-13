
import { useState, useRef, useEffect } from "react";
if (!window.storage) {
window.storage = {
 get: async (key, shared=true) => { try { const p=shared?'sr_s_':'sr_p_'; const v=localStorage.getItem(p+key); return v!==null?{key,value:v,shared}:null; } catch { return null; } },
 set: async (key, value, shared=true) => { try { const p=shared?'sr_s_':'sr_p_'; localStorage.setItem(p+key, typeof value==='string'?value:JSON.stringify(value)); return {key,value,shared}; } catch { return null; } },
 delete: async (key, shared=true) => { try { const p=shared?'sr_s_':'sr_p_'; localStorage.removeItem(p+key); return {key,deleted:true,shared}; } catch { return null; } },
 list: async (prefix='', shared=true) => { try { const sp=shared?'sr_s_':'sr_p_'; const keys=Object.keys(localStorage).filter(k=>k.startsWith(sp+prefix)).map(k=>k.slice(sp.length)); return {keys,prefix,shared}; } catch { return {keys:[]}; } }
};
}
const FF="Barlow,sans-serif",FN="'Bebas Neue',sans-serif",LS="0.08em",BD="#0d0d14",B1="#111",BF="#0a0a0f",BA="#1a1a1a",C5="#555",C4="#444",C6="#666",CA="#aaa",S10=10,S11=11,S12=12,S13=13,S14=14;
const callAI = async (messages, systemPrompt, imageBase64=null) => {
const userContent = imageBase64
 ? [{type:"image",source:{type:"base64",media_type:"image/jpeg",data:imageBase64.split(",")[1]}},{type:"text",text:messages}]
 : messages;
const res = await fetch("https://api.anthropic.com/v1/messages", {
 method:"POST", headers:{"Content-Type":"application/json"},
 body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:systemPrompt,messages:[{role:"user",content:userContent}]})
});
const data = await res.json();
return data.content?.[0]?.text || "";
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const hash = s => s.split("").reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0).toString(36);
const timeAgo = ts => { const d=Date.now()-ts,m=Math.floor(d/60000); if(m<1)return"just now"; if(m<60)return`${m}m ago`; const h=Math.floor(m/60); if(h<24)return`${h}h ago`; return`${Math.floor(h/24)}d ago`; };
const fmtSize = b => b<1024?b+"B":b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";
const f2b64 = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
const ICONS=["⚽","🏌️","🏀","🎾","🏈","🏒","🎱","🥊","🏋️","🎮","🎯","🏄"];
const COLORS=["#ff4d00","#00b4d8","#06d6a0","#ffd60a","#c77dff","#ff006e","#fb5607","#3a86ff"];
const REACTIONS=["🔥","💪","👏","😤","🎯","⚡"];
const STICKERS=["⚽","🔥","💪","🏆","🎯","⚡","👑","💥","🌟","😤","🥇","📸","🎬","💨","🏅"];
const FILTERS=[
{name:"Original",fn:()=>"none"},{name:"Vivid",fn:()=>"brightness(105%) contrast(120%) saturate(150%)"},
{name:"Muted",fn:()=>"saturate(60%) brightness(105%)"},{name:"Chrome",fn:()=>"contrast(130%) saturate(110%) brightness(105%)"},
{name:"Fade",fn:()=>"brightness(115%) contrast(85%) saturate(80%)"},{name:"Noir",fn:()=>"grayscale(100%) contrast(120%)"},
{name:"Warm",fn:()=>"sepia(40%) saturate(130%) brightness(105%)"},{name:"Cold",fn:()=>"hue-rotate(200deg) saturate(120%) brightness(105%)"},
{name:"Drama",fn:()=>"contrast(150%) brightness(90%) saturate(120%)"},{name:"Golden",fn:()=>"sepia(60%) saturate(180%) brightness(110%)"},
];
const ST={
get:async(k,sh=true)=>{try{const r=await window.storage.get(k,sh);return r?r.value:null;}catch{return null;}},
set:async(k,v,sh=true)=>{try{await window.storage.set(k,typeof v==="string"?v:JSON.stringify(v),sh);return true;}catch{return false;}},
del:async(k,sh=true)=>{try{await window.storage.delete(k,sh);return true;}catch{return false;}},
};
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d0d14}::-webkit-scrollbar-thumb{background:#ff4d00;border-radius:2px}
input,textarea,button{font-family:'Barlow Condensed',sans-serif;}
.hov{transition:all 0.15s;cursor:pointer}.hov:hover{filter:brightness(1.2)}.hov:active{transform:scale(0.97)}
.ch{transition:transform 0.2s,box-shadow 0.2s;cursor:pointer}.ch:hover{transform:translateY(-3px);box-shadow:0 0 0 2px #ff4d00,0 12px 32px rgba(255,77,0,0.2)}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px #ff4d0055}50%{box-shadow:0 0 22px #ff4d00aa}}
@keyframes tagPop{0%{transform:translate(-50%,-100%) scale(0)}60%{transform:translate(-50%,-100%) scale(1.2)}100%{transform:translate(-50%,-100%) scale(1)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.fu{animation:fadeUp 0.35s ease both}.fu2{animation:fadeUp 0.35s 0.07s ease both}.fu3{animation:fadeUp 0.35s 0.14s ease both}
.slider{-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:#222;outline:none;width:100%}
.slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#ff4d00;cursor:pointer}
.rbtn{cursor:pointer;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:20px;padding:4px 10px;font-size:14px;display:inline-flex;align-items:center;gap:4px;transition:all 0.15s;font-family:inherit}
.rbtn:hover,.rbtn.on{border-color:#ff4d00;background:#1f1208}
.tb{background:none;border:none;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:0.08em;padding:10px 14px;transition:all 0.15s;border-bottom:2px solid transparent;white-space:nowrap}
.tb.act{color:#ff4d00;border-bottom-color:#ff4d00}.tb:not(.act){color:#555}.tb:hover:not(.act){color:#888}
`;
const Spin=()=><div style={{width:26,height:26,border:"3px solid #1a1a1a",borderTopColor:"#ff4d00",borderRadius:"50%",animation:"spin 0.75s linear infinite",margin:"0 auto"}}/>;
const Btn=({children,onClick,bg="#ff4d00",fg="#fff",style={},...p})=>(
<button onClick={onClick} className="hov" style={{border:"none",background:bg,color:fg,FN,fontSize:15,LS,padding:"9px 18px",cursor:"pointer",...style}}{...p}>{children}</button>
);
const Inp=({style={},...p})=>(
<input style={{width:"100%",B1,border:"1px solid #2a2a2a",color:"#f0ede8",padding:"11px 14px",fontSize:15,outline:"none",fontFamily:"'Barlow',sans-serif",...style}}{...p}/>
);
const Avatar=({src,name,size=36,color="#ff4d00",onClick})=>(
<div onClick={onClick} style={{width:size,height:size,borderRadius:"50%",background:src?"transparent":`linear-gradient(135deg,${color},${color}88)`,border:`2px solid ${color}`,overflow:"hidden",flexShrink:0,cursor:onClick?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
 {src?<img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:size*.38,FN,color:"#fff"}}>{(name||"?")[0].toUpperCase()}</span>}
</div>
);
export default function SquadReel(){
const [screen,setScreen]=useState("splash");
const [user,setUser]=useState(null);
const [profile,setProfile]=useState(null);
const [groups,setGroups]=useState([]);
const [activeGroup,setActiveGroup]=useState(null);
const [groupMedia,setGroupMedia]=useState([]);
const [allMyMedia,setAllMyMedia]=useState([]);
const [taggedMedia,setTaggedMedia]=useState([]);
const [selected,setSelected]=useState(null);
const [profileTab,setProfileTab]=useState("posts");
const [viewingUser,setViewingUser]=useState(null);
const [viewingProfile,setViewingProfile]=useState(null);
const [notifications,setNotifications]=useState([]);
const [toast,setToast]=useState(null);
const [loading,setLoading]=useState(false);
const [modal,setModal]=useState(null);
const [form,setForm]=useState({});
const [filter,setFilter]=useState("all");
const [search,setSearch]=useState("");
const [newComment,setNewComment]=useState("");
const [reactionOpen,setReactionOpen]=useState(false);
const [dragOver,setDragOver]=useState(false);
const [uploading,setUploading]=useState(false);
const [uploadProg,setUploadProg]=useState(0);
const [tagMode,setTagMode]=useState(false);
const [tagSearch,setTagSearch]=useState("");
const [pendingTagPos,setPendingTagPos]=useState(null);
const [hoveredTag,setHoveredTag]=useState(null);
const [editScreen,setEditScreen]=useState("adjust");
const [editState,setEditState]=useState(null);
const [textOverlays,setTextOverlays]=useState([]);
const [stickerOverlays,setStickerOverlays]=useState([]);
const [activeFilter,setActiveFilter]=useState(0);
const [editingTextId,setEditingTextId]=useState(null);
const [aiLoading,setAiLoading]=useState(null);
const [aiTagSuggestions,setAiTagSuggestions]=useState([]);
const [aiCaption,setAiCaption]=useState(null);
const [aiCoachFeedback,setAiCoachFeedback]=useState(null);
const [aiReelPicks,setAiReelPicks]=useState([]);
const [showAiPanel,setShowAiPanel]=useState(null);
const fileRef=useRef(); const avatarRef=useRef(); const canvasRef=useRef(); const imgRef=useRef();
const toast$=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};
const F=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
const ac=profile?.accentColor||activeGroup?.color||"#ff4d00";
const unread=notifications.filter(n=>!n.read).length;
useEffect(()=>{
 (async()=>{
  try{
  const sess=await ST.get("session",false);
  if(!sess)return;
  const{username,passwordHash}=JSON.parse(sess);
  const raw=await ST.get(`user:${username.toLowerCase()}`);
  if(!raw)return;
  const u=JSON.parse(raw);
  if(u.passwordHash!==passwordHash)return;
  const praw=await ST.get(`profile:${username.toLowerCase()}`);
  const p=praw?JSON.parse(praw):{bio:"",avatar:"",accentColor:"#ff4d00",pinnedIds:[],approvedTagIds:[]};
  setUser(u);setProfile(p);
  await loadGroups(u);await loadNotifs(username);setScreen("dashboard");
  }catch{}
 })();
},[]);
const saveSession=async u=>await ST.set("session",JSON.stringify({username:u.username,passwordHash:u.passwordHash}),false);
const clearSession=async()=>await ST.del("session",false);
const pushNotif=async(toUser,notif)=>{
 const key=`notifs:${toUser.toLowerCase()}`;
 const raw=await ST.get(key);
 const existing=raw?JSON.parse(raw):[];
 await ST.set(key,JSON.stringify([{id:uid(),...notif,ts:Date.now(),read:false},...existing].slice(0,50)));
};
const loadNotifs=async username=>{const raw=await ST.get(`notifs:${username.toLowerCase()}`);if(raw)setNotifications(JSON.parse(raw));};
const markRead=async()=>{const u=notifications.map(n=>({...n,read:true}));setNotifications(u);await ST.set(`notifs:${user.username.toLowerCase()}`,JSON.stringify(u));};
const register=async()=>{
 const{username="",password=""}=form;
 if(!username.trim()||!password.trim())return toast$("Fill all fields","err");
 if(username.trim().length<2)return toast$("Username too short","err");
 if(password.length<4)return toast$("Min 4 chars","err");
 if(await ST.get(`user:${username.toLowerCase()}`))return toast$("Username taken","err");
 const u={username:username.trim(),passwordHash:hash(password),createdAt:Date.now(),groupIds:[]};
 const p={bio:"",avatar:"",accentColor:"#ff4d00",pinnedIds:[],approvedTagIds:[]};
 await ST.set(`user:${u.username.toLowerCase()}`,u);await ST.set(`profile:${u.username.toLowerCase()}`,p);
 setUser(u);setProfile(p);setForm({});await saveSession(u);await loadGroups(u);setScreen("dashboard");toast$(`Welcome, ${u.username}! 🔥`);
};
const login=async()=>{
 const{username="",password=""}=form;
 if(!username.trim()||!password.trim())return toast$("Fill all fields","err");
 setLoading(true);
 const raw=await ST.get(`user:${username.toLowerCase()}`);setLoading(false);
 if(!raw)return toast$("User not found","err");
 const u=JSON.parse(raw);
 if(u.passwordHash!==hash(password))return toast$("Wrong password","err");
 const praw=await ST.get(`profile:${u.username.toLowerCase()}`);
 const p=praw?JSON.parse(praw):{bio:"",avatar:"",accentColor:"#ff4d00",pinnedIds:[],approvedTagIds:[]};
 setUser(u);setProfile(p);setForm({});await saveSession(u);await loadGroups(u);await loadNotifs(u.username);setScreen("dashboard");toast$(`Back, ${u.username}!`);
};
const saveProfile=async updates=>{const p={...profile,...updates};setProfile(p);await ST.set(`profile:${user.username.toLowerCase()}`,p);};
const handleAvatar=async file=>{if(!file||!file.type.startsWith("image/"))return;await saveProfile({avatar:await f2b64(file)});toast$("Profile pic updated!");};
const placeTag=async(mediaId,username,x,y)=>{
 const updated=groupMedia.map(m=>{if(m.id!==mediaId)return m;const tags=[...(m.tags||[]).filter(t=>t.username!==username),{username,x,y,ts:Date.now()}];return{...m,tags};});
 setGroupMedia(updated);setSelected(updated.find(m=>m.id===mediaId)||null);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
 if(username!==user.username)await pushNotif(username,{type:"tag",from:user.username,mediaId,groupName:activeGroup.name,groupIcon:activeGroup.icon,msg:`${user.username} tagged you in a ${selected?.type==="video"?"video":"photo"} in ${activeGroup.name}`});
 setPendingTagPos(null);setTagSearch("");setTagMode(false);toast$(`@${username} tagged! 🏷️`);
};
const removeTag=async(mediaId,username)=>{
 const updated=groupMedia.map(m=>m.id===mediaId?{...m,tags:(m.tags||[]).filter(t=>t.username!==username)}:m);
 setGroupMedia(updated);setSelected(updated.find(m=>m.id===mediaId)||null);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));toast$("Tag removed");
};
const approveTag=async mediaId=>{
 const approved=[...(profile.approvedTagIds||[]),mediaId];
 const pinned=[...(profile.pinnedIds||[]),mediaId];
 await saveProfile({approvedTagIds:approved,pinnedIds:pinned});
 const updN=notifications.map(n=>n.mediaId===mediaId&&n.type==="tag"?{...n,approved:true}:n);
 setNotifications(updN);await ST.set(`notifs:${user.username.toLowerCase()}`,JSON.stringify(updN));
 setTaggedMedia(tm=>tm.map(m=>m.id===mediaId?{...m,isApproved:true}:m));toast$("Added to highlights! ⭐");
};
const declineTag=async mediaId=>{
 const updN=notifications.map(n=>n.mediaId===mediaId&&n.type==="tag"?{...n,rejected:true}:n);
 setNotifications(updN);await ST.set(`notifs:${user.username.toLowerCase()}`,JSON.stringify(updN));toast$("Tag declined");
};
const loadGroups=async u=>{
 setLoading(true);const loaded=[];
 for(const gid of u.groupIds||[]){const raw=await ST.get(`group:${gid}`);if(raw)loaded.push(JSON.parse(raw));}
 setGroups(loaded);setLoading(false);return loaded;
};
const createGroup=async()=>{
 const{groupName="",groupIcon="⚽",groupColor="#ff4d00"}=form;
 if(!groupName.trim())return toast$("Name your group","err");
 const code=Math.random().toString(36).slice(2,8).toUpperCase();
 const g={id:uid(),name:groupName.trim(),icon:groupIcon||"⚽",color:groupColor||"#ff4d00",code,createdBy:user.username,createdAt:Date.now(),members:[user.username],mediaCount:0};
 await ST.set(`group:${g.id}`,g);
 const updUser={...user,groupIds:[...(user.groupIds||[]),g.id]};
 await ST.set(`user:${user.username.toLowerCase()}`,updUser);setUser(updUser);setGroups(prev=>[g,...prev]);
 const keysRaw=await ST.get("group-index");const existing=keysRaw?JSON.parse(keysRaw):[];
 await ST.set("group-index",JSON.stringify([...new Set([...existing,g.id])]));
 setModal(null);setForm({});toast$(`"${g.name}" created! Code: ${code} 🎉`);
};
const joinGroup=async()=>{
 const code=(form.joinCode||"").trim().toUpperCase();
 if(!code)return toast$("Enter a code","err");
 setLoading(true);
 const keysRaw=await ST.get("group-index");const groupIds=keysRaw?JSON.parse(keysRaw):[];
 let found=null;
 for(const gid of groupIds){const raw=await ST.get(`group:${gid}`);if(raw){const g=JSON.parse(raw);if(g.code===code){found=g;break;}}}
 setLoading(false);
 if(!found)return toast$("Invalid code","err");
 if((user.groupIds||[]).includes(found.id))return toast$("Already a member!","err");
 const updG={...found,members:[...found.members,user.username]};
 await ST.set(`group:${found.id}`,updG);
 const updUser={...user,groupIds:[...(user.groupIds||[]),found.id]};
 await ST.set(`user:${user.username.toLowerCase()}`,updUser);setUser(updUser);setGroups(prev=>[updG,...prev]);
 setModal(null);setForm({});toast$(`Joined "${found.name}"! 🔥`);
};
const openGroup=async g=>{
 setActiveGroup(g);setLoading(true);
 const raw=await ST.get(`gmedia:${g.id}`);const index=raw?JSON.parse(raw):[];const loaded=[];
 for(const meta of index){const src=await ST.get(`gmsrc:${meta.id}`);if(src)loaded.push({...meta,src});}
 setGroupMedia(loaded);setFilter("all");setSearch("");setLoading(false);setScreen("group");
};
const handleFiles=async files=>{
 const arr=Array.from(files).filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/"));
 if(!arr.length)return toast$("Images & videos only","err");
 setUploading(true);const newItems=[];
 for(let i=0;i<arr.length;i++){
  setUploadProg(Math.round((i/arr.length)*100));
  try{const src=await f2b64(arr[i]);newItems.push({id:uid(),name:arr[i].name,type:arr[i].type.startsWith("video/")?"video":"photo",size:arr[i].size,uploader:user.username,uploaderAvatar:profile?.avatar||"",ts:Date.now(),src,caption:"",reactions:{},comments:[],tags:[]});}
  catch{toast$(`Failed: ${arr[i].name}`,"err");}
 }
 setUploadProg(100);
 const updated=[...newItems,...groupMedia];setGroupMedia(updated);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
 for(const item of newItems)await ST.set(`gmsrc:${item.id}`,item.src);
 const updG={...activeGroup,mediaCount:updated.length};
 await ST.set(`group:${updG.id}`,updG);setActiveGroup(updG);setGroups(prev=>prev.map(g=>g.id===updG.id?updG:g));
 setUploading(false);setUploadProg(0);toast$(`${newItems.length} file${newItems.length>1?"s":""} uploaded! 🔥`);
};
const react=async(mediaId,emoji)=>{
 const updated=groupMedia.map(m=>{if(m.id!==mediaId)return m;const r={...m.reactions};if(!r[emoji])r[emoji]=[];r[emoji]=r[emoji].includes(user.username)?r[emoji].filter(n=>n!==user.username):[...r[emoji],user.username];if(!r[emoji].length)delete r[emoji];return{...m,reactions:r};});
 setGroupMedia(updated);setSelected(updated.find(m=>m.id===mediaId)||null);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));setReactionOpen(false);
};
const addComment=async mediaId=>{
 if(!newComment.trim())return;
 const c={id:uid(),author:user.username,authorAvatar:profile?.avatar||"",text:newComment.trim(),ts:Date.now()};
 const updated=groupMedia.map(m=>m.id===mediaId?{...m,comments:[...(m.comments||[]),c]}:m);
 setGroupMedia(updated);setSelected(updated.find(m=>m.id===mediaId)||null);setNewComment("");
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
};
const updateCaption=async(id,caption)=>{
 const updated=groupMedia.map(m=>m.id===id?{...m,caption}:m);setGroupMedia(updated);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
};
const deleteMedia=async id=>{
 const updated=groupMedia.filter(m=>m.id!==id);setGroupMedia(updated);
 await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
 await ST.del(`gmsrc:${id}`);setSelected(null);setScreen("group");toast$("Deleted");
};
const download=item=>{const a=document.createElement("a");a.href=item.src;a.download=item.name||`squadreel-${item.id}`;a.click();toast$("Saving 📲");};
const togglePin=async mediaId=>{
 const pinned=profile.pinnedIds||[];
 const updated=pinned.includes(mediaId)?pinned.filter(id=>id!==mediaId):[...pinned,mediaId];
 await saveProfile({pinnedIds:updated});toast$(pinned.includes(mediaId)?"Removed":"Pinned! ⭐");
};
const openProfile=async username=>{
 setLoading(true);
 const praw=await ST.get(`profile:${username.toLowerCase()}`);
 const p=praw?JSON.parse(praw):{bio:"",avatar:"",accentColor:"#ff4d00",pinnedIds:[],approvedTagIds:[]};
 setViewingUser(username);setViewingProfile(p);
 const all=[];
 for(const g of groups){
  const raw=await ST.get(`gmedia:${g.id}`);if(!raw)continue;
  const index=JSON.parse(raw);
  for(const meta of index){
  if(meta.uploader===username||(p.approvedTagIds||[]).includes(meta.id)){
   const src=await ST.get(`gmsrc:${meta.id}`);if(src)all.push({...meta,src,groupName:g.name,groupColor:g.color,groupIcon:g.icon});
  }
  }
 }
 all.sort((a,b)=>b.ts-a.ts);setAllMyMedia(all);
 if(username===user.username){
  const tm=[];
  for(const g of groups){
  const raw=await ST.get(`gmedia:${g.id}`);if(!raw)continue;
  const index=JSON.parse(raw);
  for(const meta of index){
   if((meta.tags||[]).some(t=>t.username===username)){
    const src=await ST.get(`gmsrc:${meta.id}`);if(src)tm.push({...meta,src,groupName:g.name,groupColor:g.color,groupIcon:g.icon,isApproved:(p.approvedTagIds||[]).includes(meta.id)});
   }
  }
  }
  tm.sort((a,b)=>b.ts-a.ts);setTaggedMedia(tm);
 }
 setProfileTab("posts");setLoading(false);setScreen("profile");
};
const openEditor=item=>{
 if(item.type!=="photo")return toast$("Video editing coming soon!","err");
 setEditState({id:item.id,brightness:100,contrast:100,saturation:100,blur:0,sepia:0,grayscale:0,rotate:0,vignette:false,flip:false});
 setActiveFilter(0);setTextOverlays([]);setStickerOverlays([]);setEditScreen("adjust");setSelected(item);setScreen("editor");
};
const getFilter=(es,fi)=>fi>0?FILTERS[fi].fn():`brightness(${es.brightness}%) contrast(${es.contrast}%) saturate(${es.saturation}%) blur(${es.blur}px) sepia(${es.sepia}%) grayscale(${es.grayscale}%)`;
const bakeEdit=()=>{
 const canvas=canvasRef.current,img=imgRef.current;if(!canvas||!img)return null;
 const W=img.naturalWidth,H=img.naturalHeight;canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");ctx.filter=getFilter(editState,activeFilter);
 ctx.save();if(editState.flip){ctx.translate(W,0);ctx.scale(-1,1);}
 ctx.translate(W/2,H/2);ctx.rotate((editState.rotate*Math.PI)/180);ctx.drawImage(img,-W/2,-H/2);ctx.restore();
 if(editState.vignette){const g=ctx.createRadialGradient(W/2,H/2,W*.3,W/2,H/2,W*.8);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,0.72)");ctx.filter="none";ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 ctx.filter="none";
 stickerOverlays.forEach(s=>{ctx.font=`${Math.round(s.size*W/300)}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(s.emoji,s.x*W/100,s.y*H/100);});
 textOverlays.forEach(t=>{const fs=Math.round(t.size*W/300);ctx.font=`bold ${fs}px 'Bebas Neue',sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";if(t.bg){ctx.fillStyle="rgba(0,0,0,0.55)";const m=ctx.measureText(t.text);ctx.fillRect(t.x*W/100-m.width/2-8,t.y*H/100-fs/2-4,m.width+16,fs+8);}ctx.fillStyle=t.color;ctx.fillText(t.text,t.x*W/100,t.y*H/100);});
 return canvas.toDataURL("image/jpeg",.92);
};
const saveEdit=async()=>{
 const src=bakeEdit();if(!src)return;
 const updated=groupMedia.map(m=>m.id===editState.id?{...m,src}:m);setGroupMedia(updated);
 await ST.set(`gmsrc:${editState.id}`,src);await ST.set(`gmedia:${activeGroup.id}`,JSON.stringify(updated.map(({src,...m})=>m)));
 setScreen("group");toast$("Saved! 🔥");
};
const dlEdit=()=>{const src=bakeEdit();if(!src)return;const a=document.createElement("a");a.href=src;a.download=`edited-${selected?.name||"photo"}.jpg`;a.click();toast$("Downloaded 📲");};
const aiSuggestTags=async item=>{
 if(!item.src||item.type!=="photo")return toast$("AI tagging: photos only","err");
 setAiLoading("tags");setShowAiPanel("tags");setAiTagSuggestions([]);
 try{
  const members=(activeGroup?.members||[]).filter(m=>m!==user.username);
  if(!members.length){setAiLoading(null);return toast$("No squad members to suggest","err");}
  const result=await callAI(`Squad members: ${members.join(", ")}. Suggest who might be in this photo. Return ONLY a JSON array of usernames, max 3, like: ["user1","user2"]`,"Return valid JSON only.",item.src);
  const suggestions=JSON.parse(result.replace(/```json|```/g,"").trim());
  const valid=suggestions.filter(s=>members.includes(s));
  setAiTagSuggestions(valid.length?valid:members.slice(0,2));
 }catch{setAiTagSuggestions((activeGroup?.members||[]).filter(m=>m!==user.username).slice(0,2));}
 setAiLoading(null);
};
const aiGenerateCaption=async item=>{
 setAiLoading("caption");setShowAiPanel("caption");setAiCaption(null);
 try{
  const isPhoto=item.type==="photo";
  const prompt=isPhoto?`Short hype sports caption for this photo. Group: "${activeGroup?.name}". Max 15 words, 1-2 emojis. Return only caption.`:`Short hype sports caption for video "${item.name}" in group "${activeGroup?.name}". Max 15 words, 1-2 emojis. Return only caption.`;
  const result=await callAI(prompt,"Write short punchy sports captions. Return only the caption.",isPhoto?item.src:null);
  setAiCaption(result.trim().replace(/^[\"']|[\"']$/g,""));
 }catch{toast$("AI caption failed","err");}
 setAiLoading(null);
};
const aiCoachAnalysis=async item=>{
 setAiLoading("coach");setShowAiPanel("coach");setAiCoachFeedback(null);
 try{
  const isPhoto=item.type==="photo";
  const prompt=isPhoto?`Coach reviewing this photo from group "${activeGroup?.name}". Brief encouraging feedback + 1 actionable tip. Max 60 words.`:`Coach reviewing clip "${item.name}" from group "${activeGroup?.name}". Brief encouraging feedback + 1 actionable tip. Max 60 words.`;
  const result=await callAI(prompt,"You are an enthusiastic sports coach. Give short encouraging feedback.",isPhoto?item.src:null);
  setAiCoachFeedback(result.trim());
 }catch{toast$("AI coach unavailable","err");}
 setAiLoading(null);
};
const aiPickHighlights=async()=>{
 if(groupMedia.length<2)return toast$("Need more uploads","err");
 setAiLoading("reel");setAiReelPicks([]);
 try{
  const photos=groupMedia.filter(m=>m.type==="photo").slice(0,12);
  if(!photos.length){setAiLoading(null);return toast$("No photos to pick from","err");}
  const scored=photos.map(m=>{
  const reactions=Object.values(m.reactions||{}).reduce((s,a)=>s+a.length,0);
  const comments=(m.comments||[]).length;
  const recency=Math.max(0,1-(Date.now()-m.ts)/(1000*60*60*24*30));
  return{...m,score:reactions*3+comments*2+recency*5};
  }).sort((a,b)=>b.score-a.score);
  const topPicks=scored.slice(0,Math.min(6,scored.length));
  const intro=await callAI(`Write a short exciting highlight reel intro for group "${activeGroup?.name||"the squad"}". Max 12 words, 1 emoji. Return only the intro.`,"Write exciting sports highlight reel intros.");
  setAiReelPicks({picks:topPicks,intro:intro.trim()});
 }catch{toast$("AI reel picker failed","err");}
 setAiLoading(null);
};
const applyAiCaption=async caption=>{
 if(!selected)return;
 await updateCaption(selected.id,caption);setSelected(prev=>({...prev,caption}));
 setAiCaption(null);setShowAiPanel(null);toast$("Caption applied! ✍️");
};
const filtered=groupMedia.filter(m=>{
 if(filter!=="all"&&m.type!==filter)return false;
 if(search){const q=search.toLowerCase();return m.name.toLowerCase().includes(q)||m.uploader.toLowerCase().includes(q)||(m.caption||"").toLowerCase().includes(q);}
 return true;
});
const tagCandidates=(activeGroup?.members||[]).filter(m=>m!==user?.username&&!(selected?.tags||[]).find(t=>t.username===m)&&(tagSearch?m.toLowerCase().includes(tagSearch.toLowerCase()):true));
const myStats=()=>({uploads:allMyMedia.filter(m=>m.uploader===user?.username).length,highlights:(profile?.pinnedIds||[]).length,reactions:allMyMedia.reduce((s,m)=>s+Object.values(m.reactions||{}).reduce((ss,a)=>ss+a.length,0),0),groups:groups.length});
const handleTagClick=e=>{if(!tagMode||selected?.type==="video")return;const rect=e.currentTarget.getBoundingClientRect();setPendingTagPos({x:((e.clientX-rect.left)/rect.width)*100,y:((e.clientY-rect.top)/rect.height)*100});};
const pendingTagCount=notifications.filter(n=>n.type==="tag"&&!n.approved&&!n.rejected).length;
const totalR=m=>Object.values(m.reactions||{}).reduce((s,a)=>s+a.length,0);
const Header=()=>(
 <header style={{BF,borderBottom:`3px solid ${screen==="group"?activeGroup?.color||"#ff4d00":"#ff4d00"}`,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:56,position:"sticky",top:0,zIndex:50}}>
  <div style={{display:"flex",alignItems:"center",gap:14}}>
  {screen!=="dashboard"&&<span className="hov" onClick={()=>setScreen("dashboard")} style={{C5,S13,FF}}>← BACK</span>}
  {screen==="dashboard"&&<div style={{fontSize:26,fontWeight:900}}>SQUAD<span style={{color:"#ff4d00"}}>REEL</span></div>}
  {screen==="group"&&activeGroup&&<><div style={{width:1,height:20,background:"#222"}}/><span style={{fontSize:20}}>{activeGroup.icon}</span><span style={{fontSize:20,fontWeight:900}}>{activeGroup.name}</span><div style={{background:`${activeGroup.color}22`,border:`1px solid ${activeGroup.color}44`,padding:"3px 9px",S11,fontWeight:700,color:activeGroup.color}}>👥 {activeGroup.members.length}</div></>}
  {screen==="profile"&&<span style={{fontSize:20,fontWeight:900}}>{viewingUser}'S PROFILE</span>}
  </div>
  <div style={{display:"flex",alignItems:"center",gap:8}}>
  {screen==="group"&&activeGroup&&<Btn onClick={()=>setModal("inviteCode")} bg="#1a1a1a" fg="#aaa" style={{S12,padding:"6px 12px"}}>🔗 INVITE</Btn>}
  <div className="hov" onClick={()=>{setModal("notifs");markRead();}} style={{position:"relative",B1,border:"1px solid #222",padding:"6px 10px",cursor:"pointer"}}>
   <span style={{fontSize:15}}>🔔</span>
   {unread>0&&<div style={{position:"absolute",top:-4,right:-4,background:"#ff4d00",color:"#fff",S10,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 1.5s infinite"}}>{unread}</div>}
  </div>
  <div className="hov" onClick={()=>openProfile(user.username)} style={{display:"flex",alignItems:"center",gap:8,B1,border:"1px solid #222",padding:"5px 12px",cursor:"pointer"}}>
   <Avatar src={profile?.avatar} name={user.username} size={24} color={profile?.accentColor||"#ff4d00"}/><span style={{S13}}>{user.username}</span>
  </div>
  <Btn onClick={async()=>{await clearSession();setUser(null);setGroups([]);setProfile(null);setNotifications([]);setScreen("splash");}} bg="#1a1a1a" fg="#666" style={{S12,padding:"6px 12px"}}>LOG OUT</Btn>
  </div>
 </header>
);
return(
 <div style={{minHeight:"100vh",background:"#070709",color:"#f0ede8",FN,overflowX:"hidden"}}>
  <style>{CSS}</style>
  {toast&&<div className="fu" style={{position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",background:toast.type==="err"?"#c0392b":"#ff4d00",color:"#fff",padding:"10px 22px",fontWeight:700,fontSize:15,zIndex:9999,whiteSpace:"nowrap"}}>{toast.msg}</div>}
  <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleAvatar(e.target.files[0])}/>
  {screen==="splash"&&(
  <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
   <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,77,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,77,0,0.05) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
   <div style={{position:"absolute",top:0,left:0,right:0,background:"#ff4d00",height:26,overflow:"hidden",display:"flex",alignItems:"center"}}>
    <div style={{display:"flex",animation:"ticker 18s linear infinite",whiteSpace:"nowrap",S11,fontWeight:700,letterSpacing:"0.14em",color:"#fff"}}>{Array(6).fill("⚽ SQUADREEL • TAG YOUR SQUAD • HIGHLIGHTS • SHARE • REACT • YOUR CREW, YOUR MOMENTS • ").map((t,i)=><span key={i}>{t}</span>)}</div>
   </div>
   <div className="fu" style={{textAlign:"center",padding:"60px 20px 20px"}}>
    <div style={{fontSize:88,lineHeight:1,fontWeight:900,letterSpacing:"0.04em",textShadow:"0 0 60px rgba(255,77,0,0.4)"}}>SQUAD<span style={{color:"#ff4d00"}}>REEL</span></div>
    <div className="fu2" style={{C5,fontSize:15,FF,fontWeight:300,letterSpacing:"0.12em",marginBottom:44,marginTop:6,textTransform:"uppercase"}}>Tag your squad. Own your highlights.</div>
    <div className="fu3" style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
    <Btn onClick={()=>setScreen("login")} style={{fontSize:18,padding:"13px 36px",animation:"glow 2s infinite"}}>SIGN IN</Btn>
    <Btn onClick={()=>setScreen("register")} bg="#1a1a1a" fg="#ff4d00" style={{fontSize:18,padding:"13px 36px",border:"1px solid #ff4d00"}}>CREATE ACCOUNT</Btn>
    </div>
    <div style={{marginTop:40,display:"flex",gap:20,justifyContent:"center",color:"#333",S13,LS,flexWrap:"wrap"}}>
    {["🏷️ Tag Friends","⭐ Highlights","👤 Profiles","🔔 Notifications","✏️ Pro Editor","✨ AI Features"].map(f=><span key={f}>{f}</span>)}
    </div>
   </div>
  </div>
  )}
  {(screen==="login"||screen==="register")&&(
  <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
   <div className="fu" style={{BD,border:"2px solid #1a1a1a",padding:"36px 32px",width:"100%",maxWidth:380}}>
    <div style={{textAlign:"center",marginBottom:28}}>
    <div style={{fontSize:34,fontWeight:900}}>SQUAD<span style={{color:"#ff4d00"}}>REEL</span></div>
    <div style={{C5,S13,FF,marginTop:4}}>{screen==="login"?"Sign in":"Create account"}</div>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
    <Inp placeholder="Username" value={form.username||""} onChange={F("username")} onKeyDown={e=>e.key==="Enter"&&(screen==="login"?login():register())}/>
    <Inp placeholder="Password" type="password" value={form.password||""} onChange={F("password")} onKeyDown={e=>e.key==="Enter"&&(screen==="login"?login():register())}/>
    {loading?<div style={{padding:12,textAlign:"center"}}><Spin/></div>:<Btn onClick={screen==="login"?login:register} style={{width:"100%",fontSize:17,padding:"13px",marginTop:4}}>{screen==="login"?"SIGN IN →":"CREATE ACCOUNT →"}</Btn>}
    <div style={{textAlign:"center",S13,C5,FF,marginTop:4}}>
     {screen==="login"?"No account? ":"Have one? "}<span style={{color:"#ff4d00",cursor:"pointer",fontWeight:600}} onClick={()=>{setForm({});setScreen(screen==="login"?"register":"login");}}>{screen==="login"?"Register":"Sign in"}</span>
    </div>
    <div style={{textAlign:"center"}}><span style={{color:"#333",cursor:"pointer",S12,FF}} onClick={()=>setScreen("splash")}>← Back</span></div>
    </div>
   </div>
  </div>
  )}
  {(screen==="dashboard"||screen==="group"||screen==="profile")&&user&&<Header/>}
  {screen==="dashboard"&&user&&(
  <main style={{padding:24,maxWidth:1000,margin:"0 auto"}}>
   <div className="fu" style={{marginBottom:28,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
    <div><div style={{fontSize:42,fontWeight:900,lineHeight:1}}>YOUR GROUPS</div><div style={{C5,S14,FF,marginTop:4}}>Each group is a private media space</div></div>
    <div style={{display:"flex",gap:10}}>
    <Btn onClick={()=>setModal("joinGroup")} bg="#1a1a1a" fg="#ff4d00" style={{border:"1px solid #ff4d00",S14,padding:"9px 18px"}}>🔗 JOIN WITH CODE</Btn>
    <Btn onClick={()=>setModal("createGroup")} style={{S14,padding:"9px 18px"}}>+ CREATE GROUP</Btn>
    </div>
   </div>
   {loading&&<div style={{textAlign:"center",padding:60}}><Spin/></div>}
   {!loading&&groups.length===0&&<div className="fu" style={{textAlign:"center",padding:"70px 20px",border:"2px dashed #1a1a1a",color:"#333"}}><div style={{fontSize:52,marginBottom:12}}>🏟️</div><div style={{fontSize:26,fontWeight:900}}>NO GROUPS YET</div><div style={{C4,S14,FF,marginTop:8}}>Create a group and share the invite code with your squad</div></div>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
    {groups.map((g,i)=>(
    <div key={g.id} className="ch fu" style={{BD,border:`2px solid ${g.color}22`,overflow:"hidden",animationDelay:`${i*0.06}s`}} onClick={()=>openGroup(g)}>
     <div style={{height:90,background:`linear-gradient(135deg,${g.color}22,${g.color}08)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <div style={{fontSize:44}}>{g.icon}</div>
      <div style={{position:"absolute",top:8,right:8,background:g.color,padding:"2px 9px",S11,fontWeight:800,letterSpacing:"0.1em"}}>{g.mediaCount||0} FILES</div>
      {g.createdBy===user.username&&<div style={{position:"absolute",top:8,left:8,BA,border:`1px solid ${g.color}`,padding:"2px 7px",S10,fontWeight:700,color:g.color}}>ADMIN</div>}
     </div>
     <div style={{padding:"12px 14px"}}>
      <div style={{fontSize:20,fontWeight:900}}>{g.name}</div>
      <div style={{C5,S12,FF,marginTop:3,display:"flex",justifyContent:"space-between"}}><span>👥 {g.members.length} member{g.members.length!==1?"s":""}</span><span>{timeAgo(g.createdAt)}</span></div>
      <div style={{marginTop:10,display:"flex",gap:6}}>
      <div style={{flex:1,background:g.color,color:"#fff",padding:"7px 0",S13,fontWeight:700,textAlign:"center",letterSpacing:"0.06em"}}>OPEN →</div>
      <div onClick={e=>{e.stopPropagation();setActiveGroup(g);setModal("inviteCode");}} className="hov" style={{BA,border:"1px solid #2a2a2a",padding:"7px 10px",S13,C6,cursor:"pointer"}}>🔗</div>
      </div>
     </div>
    </div>
    ))}
   </div>
  </main>
  )}
  {screen==="profile"&&user&&viewingProfile&&(
  <main style={{maxWidth:860,margin:"0 auto",paddingBottom:40}}>
   <div style={{background:"linear-gradient(180deg,#0d0d14 0%,#070709 100%)",padding:"32px 24px 0",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${viewingProfile.accentColor||"#ff4d00"}18 0%,transparent 65%)`,pointerEvents:"none"}}/>
    <div style={{display:"flex",gap:24,alignItems:"flex-start",position:"relative",flexWrap:"wrap"}}>
    <div style={{flexShrink:0}}>
     {viewingUser===user.username?(
      <div onClick={()=>avatarRef.current?.click()} style={{cursor:"pointer",position:"relative"}}>
      <Avatar src={profile?.avatar} name={user.username} size={96} color={profile?.accentColor||"#ff4d00"}/>
      <div style={{position:"absolute",bottom:0,right:0,background:profile?.accentColor||"#ff4d00",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",S12}}>📷</div>
      </div>
     ):<Avatar src={viewingProfile.avatar} name={viewingUser} size={96} color={viewingProfile.accentColor||"#ff4d00"}/>}
    </div>
    <div style={{flex:1,minWidth:200}}>
     <div style={{fontSize:32,fontWeight:900,lineHeight:1}}>{viewingUser}</div>
     {viewingUser===user.username?(
      <input defaultValue={profile?.bio||""} placeholder="Add a bio..." onBlur={e=>saveProfile({bio:e.target.value})} style={{background:"transparent",border:"none",borderBottom:"1px solid #333",color:"#888",padding:"6px 0",S14,FF,outline:"none",marginTop:8,width:"100%",maxWidth:320}}/>
     ):<div style={{color:"#777",S14,FF,marginTop:8}}>{viewingProfile.bio||"No bio yet"}</div>}
     {viewingUser===user.username&&(()=>{const s=myStats();return(
      <div style={{display:"flex",gap:22,marginTop:16,flexWrap:"wrap"}}>
      {[["POSTS",s.uploads],["HIGHLIGHTS",s.highlights],["REACTIONS",s.reactions],["GROUPS",s.groups]].map(([l,v])=>(
       <div key={l} style={{textAlign:"center"}}><div style={{fontSize:26,fontWeight:900,color:profile?.accentColor||"#ff4d00",lineHeight:1}}>{v}</div><div style={{S11,C5,LS,marginTop:2}}>{l}</div></div>
      ))}
      </div>
     );})()}
     {viewingUser===user.username&&(
      <div style={{marginTop:14,display:"flex",gap:6,alignItems:"center"}}>
      <span style={{S11,C4,LS,marginRight:4}}>COLOR</span>
      {COLORS.map(c=><div key={c} onClick={()=>saveProfile({accentColor:c})} className="hov" style={{width:20,height:20,background:c,borderRadius:"50%",cursor:"pointer",border:`2px solid ${(profile?.accentColor||"#ff4d00")===c?"#fff":"transparent"}`}}/>)}
      </div>
     )}
    </div>
    </div>
    <div style={{display:"flex",gap:0,marginTop:24,borderBottom:"1px solid #1a1a1a",overflowX:"auto"}}>
    {(viewingUser===user.username?["posts","highlights","tagged","stats"]:["posts","highlights"]).map(t=>(
     <button key={t} className={`tb${profileTab===t?" act":""}`} onClick={()=>setProfileTab(t)} style={{color:profileTab===t?(profile?.accentColor||"#ff4d00"):"#555",borderBottomColor:profileTab===t?(profile?.accentColor||"#ff4d00"):"transparent",position:"relative"}}>
      {t==="posts"?"📷 POSTS":t==="highlights"?"⭐ HIGHLIGHTS":t==="tagged"?"🏷️ TAGGED":"📊 STATS"}
      {t==="tagged"&&pendingTagCount>0&&<div style={{position:"absolute",top:8,right:4,width:7,height:7,background:"#ff4d00",borderRadius:"50%"}}/>}
     </button>
    ))}
    </div>
   </div>
   <div style={{padding:"20px 24px"}}>
    {loading&&<div style={{textAlign:"center",padding:60}}><Spin/></div>}
    {profileTab==="posts"&&!loading&&(
    <>
     {allMyMedia.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#333"}}><div style={{fontSize:42,marginBottom:10}}>📷</div><div style={{fontSize:22,fontWeight:900}}>NO POSTS YET</div></div>}
     <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
      {allMyMedia.map((item,i)=>{
      const isPinned=(profile?.pinnedIds||[]).includes(item.id);
      return(
       <div key={item.id} className="ch fu" style={{aspectRatio:"1",position:"relative",overflow:"hidden",animationDelay:`${i*0.03}s`}} onClick={()=>{setSelected(item);setScreen("lightbox");}}>
        {item.type==="video"?<><video src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}} muted/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)"}}><div style={{width:28,height:28,background:`${profile?.accentColor||"#ff4d00"}ee`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",S11}}>▶</div></div></>:<img src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        {isPinned&&<div style={{position:"absolute",top:5,right:5,S13}}>⭐</div>}
        {(item.tags||[]).length>0&&<div style={{position:"absolute",top:5,left:5,background:"rgba(0,0,0,0.7)",padding:"2px 6px",S10,fontWeight:700}}>🏷️{(item.tags||[]).length}</div>}
        {totalR(item)>0&&<div style={{position:"absolute",bottom:4,left:4,background:"rgba(0,0,0,0.7)",padding:"2px 5px",S11}}>🔥{totalR(item)}</div>}
        <div style={{position:"absolute",bottom:4,right:4,background:`${item.groupColor||"#ff4d00"}cc`,padding:"2px 5px",fontSize:9,fontWeight:800}}>{item.groupIcon}</div>
       </div>
      );
      })}
     </div>
    </>
    )}
    {profileTab==="highlights"&&!loading&&(()=>{
    const pinned=allMyMedia.filter(m=>(profile?.pinnedIds||[]).includes(m.id));
    return(
     <div>
      {pinned.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#333"}}><div style={{fontSize:42,marginBottom:10}}>⭐</div><div style={{fontSize:22,fontWeight:900}}>NO HIGHLIGHTS</div><div style={{S13,C4,FF,marginTop:6}}>Pin posts from your grid, or approve tags</div></div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
      {pinned.map((item,i)=>(
       <div key={item.id} className="ch fu" style={{BD,overflow:"hidden",border:`1px solid ${profile?.accentColor||"#ff4d00"}33`,animationDelay:`${i*0.05}s`}}>
        <div style={{aspectRatio:"16/9",position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelected(item);setScreen("lightbox");}}>
        {item.type==="video"?<><video src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}} muted/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.38)"}}><div style={{width:34,height:34,background:`${profile?.accentColor||"#ff4d00"}ee`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",S14}}>▶</div></div></>:<img src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        <div style={{position:"absolute",top:6,right:6,background:profile?.accentColor||"#ff4d00",padding:"2px 7px",S10,fontWeight:800}}>⭐ HL</div>
        </div>
        <div style={{padding:"8px 11px"}}>
        <div style={{fontWeight:700,S13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
        <div style={{color:item.groupColor||"#ff4d00",S11,marginTop:2}}>{item.groupIcon} {item.groupName}</div>
        <div style={{display:"flex",gap:5,marginTop:8}}>
         <Btn onClick={()=>{setSelected(item);setScreen("lightbox");}} bg="#1a1a1a" fg="#ccc" style={{flex:1,S11,padding:"5px 0"}}>VIEW</Btn>
         <Btn onClick={()=>download(item)} bg={profile?.accentColor||"#ff4d00"} style={{padding:"5px 10px",S13}}>↓</Btn>
         <Btn onClick={()=>togglePin(item.id)} bg="#1a1a1a" fg="#888" style={{padding:"5px 10px",S13}}>✕</Btn>
        </div>
        </div>
       </div>
      ))}
      </div>
     </div>
    );
    })()}
    {profileTab==="tagged"&&viewingUser===user.username&&!loading&&(
    <div>
     <div style={{marginBottom:14,C5,S13,FF}}>When a teammate tags you, it appears here. Approve to add to Highlights.</div>
     {taggedMedia.length===0&&<div style={{textAlign:"center",padding:"50px 20px",color:"#333"}}><div style={{fontSize:42,marginBottom:10}}>🏷️</div><div style={{fontSize:22,fontWeight:900}}>NO TAGS YET</div></div>}
     <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {taggedMedia.map((item,i)=>{
      const isApproved=item.isApproved||(profile?.approvedTagIds||[]).includes(item.id);
      return(
       <div key={item.id} className="fu" style={{BD,border:`2px solid ${isApproved?(profile?.accentColor||"#ff4d00"):"#222"}`,display:"flex",gap:14,padding:12,animationDelay:`${i*0.05}s`,flexWrap:"wrap"}}>
        <div style={{width:110,aspectRatio:"16/9",flexShrink:0,position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelected(item);setScreen("lightbox");}}>
        {item.type==="video"?<><video src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}} muted/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)"}}><span style={{fontSize:18}}>▶</span></div></>:<img src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        </div>
        <div style={{flex:1,minWidth:160}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{item.name}</div>
        <div style={{C6,S12,FF,marginBottom:10}}>By <span style={{CA,fontWeight:600}}>{item.uploader}</span> in <span style={{color:item.groupColor||"#ff4d00",fontWeight:600}}>{item.groupIcon} {item.groupName}</span></div>
        {isApproved?(
         <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{background:`${profile?.accentColor||"#ff4d00"}22`,border:`1px solid ${profile?.accentColor||"#ff4d00"}`,padding:"4px 12px",S12,color:profile?.accentColor||"#ff4d00",fontWeight:700}}>⭐ IN HIGHLIGHTS</div>
          <Btn onClick={()=>{const a=(profile.approvedTagIds||[]).filter(id=>id!==item.id);const p=(profile.pinnedIds||[]).filter(id=>id!==item.id);saveProfile({approvedTagIds:a,pinnedIds:p});setTaggedMedia(prev=>prev.map(m=>m.id===item.id?{...m,isApproved:false}:m));toast$("Removed");}} bg="#1a1a1a" fg="#888" style={{S12,padding:"5px 12px"}}>REMOVE</Btn>
         </div>
        ):(
         <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>approveTag(item.id)} style={{S13,padding:"7px 16px"}}>⭐ ADD TO HIGHLIGHTS</Btn>
          <Btn onClick={()=>declineTag(item.id)} bg="#1a1a1a" fg="#888" style={{S13,padding:"7px 14px"}}>✕ DECLINE</Btn>
         </div>
        )}
        </div>
       </div>
      );
      })}
     </div>
    </div>
    )}
    {profileTab==="stats"&&viewingUser===user.username&&!loading&&(()=>{const s=myStats();return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
     {[["📤","TOTAL UPLOADS",s.uploads,"Files you've shared"],["⭐","HIGHLIGHTS",s.highlights,"Pinned to profile"],["🔥","REACTIONS",s.reactions,"Received on posts"],["👥","GROUPS",s.groups,"Member of"]].map(([icon,label,val,desc])=>(
      <div key={label} className="fu" style={{BD,border:`1px solid ${profile?.accentColor||"#ff4d00"}22`,padding:"20px 18px"}}>
      <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:38,fontWeight:900,color:profile?.accentColor||"#ff4d00",lineHeight:1}}>{val}</div>
      <div style={{S13,fontWeight:700,letterSpacing:"0.06em",marginTop:4}}>{label}</div>
      <div style={{S11,C5,FF,marginTop:3}}>{desc}</div>
      </div>
     ))}
    </div>
    );})()}
   </div>
  </main>
  )}
  {screen==="group"&&activeGroup&&(
  <main style={{padding:20,maxWidth:1200,margin:"0 auto"}}>
   <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files);}} onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${dragOver?activeGroup.color:"#1f1f1f"}`,background:dragOver?`${activeGroup.color}08`:"#0a0a0f",padding:"18px 24px",textAlign:"center",cursor:"pointer",marginBottom:18,transition:"all 0.2s"}}>
    <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
    {uploading?<div><div style={{fontWeight:700,fontSize:15,marginBottom:8}}>UPLOADING... {uploadProg}%</div><div style={{BA,height:4,borderRadius:2}}><div style={{width:`${uploadProg}%`,height:"100%",background:activeGroup.color,transition:"width 0.3s",borderRadius:2}}/></div></div>:(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}><span style={{fontSize:22}}>⬆️</span><div><div style={{fontWeight:800,fontSize:15}}>DROP FILES OR CLICK TO UPLOAD</div><div style={{C5,S12,FF,marginTop:1}}>Shared with {activeGroup.name}</div></div></div>
    )}
   </div>
   <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
    <div style={{flex:1,minWidth:180,position:"relative"}}>
    <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",C4,S13}}>🔍</span>
    <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",BD,border:"1px solid #1f1f1f",color:"#ddd",padding:"8px 12px 8px 32px",S13,outline:"none",FF}}/>
    </div>
    {["all","photo","video"].map(f=>(
    <button key={f} className="hov" onClick={()=>setFilter(f)} style={{border:"none",background:filter===f?activeGroup.color:"#1a1a1a",color:filter===f?"#fff":"#666",padding:"8px 14px",S12,FN,letterSpacing:"0.06em",cursor:"pointer",transition:"all 0.15s"}}>
     {f==="all"?`ALL (${groupMedia.length})`:f==="photo"?`📷 PHOTOS (${groupMedia.filter(m=>m.type==="photo").length})`:`🎬 VIDEOS (${groupMedia.filter(m=>m.type==="video").length})`}
    </button>
    ))}
    <button className="hov" onClick={()=>{setModal("aiReel");aiPickHighlights();}} style={{border:"1px solid #a855f744",background:"#0d0b14",color:"#a855f7",padding:"8px 14px",S12,FN,letterSpacing:"0.06em",cursor:"pointer"}}>
    {aiLoading==="reel"?"⏳ ANALYZING...":"✨ AI HIGHLIGHT REEL"}
    </button>
   </div>
   {loading&&<div style={{textAlign:"center",padding:60}}><Spin/></div>}
   {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:"#222"}}><div style={{fontSize:44,marginBottom:10}}>🎬</div><div style={{fontSize:24,fontWeight:900}}>NO MEDIA YET</div></div>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
    {filtered.map((item,i)=>(
    <div key={item.id} className="ch fu" style={{BD,overflow:"hidden",animationDelay:`${i*0.035}s`}}>
     <div style={{aspectRatio:"16/9",position:"relative",overflow:"hidden"}} onClick={()=>{setSelected(item);setScreen("lightbox");}}>
      {item.type==="video"?<><video src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}} muted/><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.38)"}}><div style={{width:36,height:36,background:`${activeGroup.color}ee`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",S13}}>▶</div></div></>:<img src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
      <div style={{position:"absolute",top:6,right:6,background:item.type==="video"?activeGroup.color:"rgba(0,0,0,0.7)",padding:"2px 7px",S10,fontWeight:800,letterSpacing:"0.1em"}}>{item.type==="video"?"VID":"IMG"}</div>
      {totalR(item)>0&&<div style={{position:"absolute",bottom:5,left:5,background:"rgba(0,0,0,0.75)",padding:"2px 7px",S12}}>{Object.entries(item.reactions||{}).slice(0,3).map(([e])=>e)} {totalR(item)}</div>}
      {(item.tags||[]).length>0&&<div style={{position:"absolute",bottom:5,right:5,background:"rgba(0,0,0,0.75)",padding:"2px 7px",S11,CA}}>🏷️{(item.tags||[]).length}</div>}
     </div>
     <div style={{padding:"9px 11px"}}>
      <div style={{fontWeight:700,S13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
      <div style={{C5,S11,marginTop:2,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span className="hov" style={{color:"#777",cursor:"pointer",display:"flex",alignItems:"center",gap:5}} onClick={()=>openProfile(item.uploader)}><Avatar src={item.uploaderAvatar} name={item.uploader} size={16} color={activeGroup.color}/>{item.uploader}</span>
      <span>{timeAgo(item.ts)}</span>
      </div>
      <div style={{display:"flex",gap:5,marginTop:9}}>
      <button className="hov" onClick={()=>{setSelected(item);setScreen("lightbox");}} style={{flex:1,BA,color:"#ccc",border:"none",padding:"6px 0",S11,FN,cursor:"pointer"}}>VIEW</button>
      <button className="hov" onClick={()=>openEditor(item)} style={{flex:1,background:item.type==="photo"?"#1a1a1a":"#111",color:item.type==="photo"?activeGroup.color:"#333",border:"none",padding:"6px 0",S11,FN,cursor:"pointer"}}>EDIT</button>
      <button className="hov" onClick={()=>download(item)} style={{background:activeGroup.color,color:"#fff",border:"none",padding:"6px 10px",S13,cursor:"pointer"}}>↓</button>
      </div>
     </div>
    </div>
    ))}
   </div>
  </main>
  )}
  {screen==="lightbox"&&selected&&(
  <div className="fu" style={{position:"fixed",inset:0,background:"#070709",zIndex:100,display:"flex",flexDirection:"column"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 18px",borderBottom:`2px solid ${ac}`,BF,flexShrink:0,flexWrap:"wrap",gap:8}}>
    <div style={{fontWeight:900,fontSize:17,maxWidth:"25%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name}</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    {selected.type==="photo"&&<Btn onClick={()=>openEditor(selected)} bg="#1a1a1a" fg={ac} style={{S12,padding:"7px 12px"}}>✏️ EDIT</Btn>}
    <Btn onClick={()=>{setTagMode(!tagMode);setPendingTagPos(null);setTagSearch("");}} bg={tagMode?ac:"#1a1a1a"} fg={tagMode?"#fff":"#aaa"} style={{S12,padding:"7px 12px"}}>🏷️ {tagMode?"TAGGING":"TAG"}</Btn>
    <Btn onClick={()=>{setShowAiPanel("tags");aiSuggestTags(selected);}} bg={showAiPanel==="tags"?"#a855f7":"#1a1a1a"} fg={showAiPanel==="tags"?"#fff":"#a855f7"} style={{S12,padding:"7px 12px",border:"1px solid #a855f733"}}>✨ AI TAG</Btn>
    <Btn onClick={()=>{setShowAiPanel("caption");aiGenerateCaption(selected);}} bg={showAiPanel==="caption"?"#a855f7":"#1a1a1a"} fg={showAiPanel==="caption"?"#fff":"#a855f7"} style={{S12,padding:"7px 12px",border:"1px solid #a855f733"}}>✨ CAPTION</Btn>
    <Btn onClick={()=>{setShowAiPanel("coach");aiCoachAnalysis(selected);}} bg={showAiPanel==="coach"?"#a855f7":"#1a1a1a"} fg={showAiPanel==="coach"?"#fff":"#a855f7"} style={{S12,padding:"7px 12px",border:"1px solid #a855f733"}}>🏆 COACH</Btn>
    <Btn onClick={()=>togglePin(selected.id)} bg="#1a1a1a" fg={(profile?.pinnedIds||[]).includes(selected.id)?"#ffd60a":"#888"} style={{S12,padding:"7px 12px"}}>{(profile?.pinnedIds||[]).includes(selected.id)?"⭐":"☆"} HL</Btn>
    <Btn onClick={()=>download(selected)} bg={ac} style={{S12,padding:"7px 12px"}}>↓ SAVE</Btn>
    {selected.uploader===user.username&&<Btn onClick={()=>deleteMedia(selected.id)} bg="#1a1a1a" fg="#c0392b" style={{S12,padding:"7px 12px"}}>🗑</Btn>}
    <Btn onClick={()=>{setScreen(activeGroup?"group":"profile");setTagMode(false);setPendingTagPos(null);setShowAiPanel(null);}} bg="#1a1a1a" fg="#666" style={{S12,padding:"7px 10px"}}>✕</Btn>
    </div>
   </div>
   {tagMode&&selected.type==="photo"&&<div style={{background:"#ff4d0022",borderBottom:"1px solid #ff4d0055",padding:"8px 18px",S13,color:"#ff4d00",FF,flexShrink:0}}>🏷️ <strong>TAG MODE</strong> — Click photo to place tag</div>}
   <div style={{flex:1,display:"flex",overflow:"hidden"}}>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#050507",position:"relative"}}>
    <div style={{position:"relative",display:"inline-block",maxWidth:"100%"}}>
     {selected.type==="video"?<video src={selected.src} controls autoPlay style={{maxWidth:"100%",maxHeight:"calc(100vh - 200px)",background:"#000",display:"block"}}/>:(
      <img src={selected.src} alt={selected.name} style={{maxWidth:"100%",maxHeight:"calc(100vh - 200px)",objectFit:"contain",display:"block",cursor:tagMode?"crosshair":"default"}} onClick={handleTagClick}/>
     )}
     {(selected.tags||[]).map(tag=>(
      <div key={tag.username} style={{position:"absolute",left:`${tag.x}%`,top:`${tag.y}%`,transform:"translate(-50%,-100%)",zIndex:10,animation:"tagPop 0.3s ease both"}} onMouseEnter={()=>setHoveredTag(tag.username)} onMouseLeave={()=>setHoveredTag(null)}>
      <div style={{width:26,height:26,borderRadius:"50%",background:hoveredTag===tag.username?`${ac}88`:"rgba(255,255,255,0.2)",border:`2px solid ${hoveredTag===tag.username?ac:"#fff"}`,backdropFilter:"blur(4px)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}><span style={{S10}}>🏷️</span></div>
      {hoveredTag===tag.username&&(
       <div style={{position:"absolute",bottom:"calc(100% + 4px)",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.88)",border:"1px solid rgba(255,255,255,0.15)",padding:"5px 10px",whiteSpace:"nowrap",FN,S13,letterSpacing:"0.06em",borderRadius:2,zIndex:20}}>
        <span style={{color:ac}}>@</span>{tag.username}
        {selected.uploader===user.username&&<span className="hov" onClick={()=>removeTag(selected.id,tag.username)} style={{marginLeft:8,color:"#c0392b",cursor:"pointer",S11}}>✕</span>}
       </div>
      )}
      </div>
     ))}
     {pendingTagPos&&<div style={{position:"absolute",left:`${pendingTagPos.x}%`,top:`${pendingTagPos.y}%`,transform:"translate(-50%,-50%)",width:22,height:22,borderRadius:"50%",background:`${ac}88`,border:`2px solid ${ac}`,zIndex:15,animation:"tagPop 0.3s ease both"}}/>}
    </div>
    {pendingTagPos&&(
     <div className="fu" style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",B1,border:`2px solid ${ac}`,padding:"14px 16px",minWidth:240,zIndex:30}}>
      <div style={{S13,fontWeight:700,color:ac,marginBottom:8,letterSpacing:"0.06em"}}>TAG WHO?</div>
      <input placeholder="Search member..." value={tagSearch} onChange={e=>setTagSearch(e.target.value)} autoFocus style={{width:"100%",background:"#0a0a0a",border:"1px solid #2a2a2a",color:"#fff",padding:"8px 10px",S14,outline:"none",FF,marginBottom:8}}/>
      <div style={{maxHeight:130,overflowY:"auto"}}>
      {tagCandidates.length===0&&<div style={{C5,S13,FF,padding:"6px 0"}}>No members found</div>}
      {tagCandidates.map(m=>(
       <div key={m} className="hov" onClick={()=>placeTag(selected.id,m,pendingTagPos.x,pendingTagPos.y)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",BD,marginBottom:4,cursor:"pointer",border:"1px solid #1a1a1a"}}>
        <Avatar name={m} size={26} color={ac}/><span style={{fontWeight:700,S14}}>@{m}</span>
       </div>
      ))}
      </div>
      <Btn onClick={()=>{setPendingTagPos(null);setTagSearch("");}} bg="#1a1a1a" fg="#666" style={{width:"100%",S12,padding:"7px",marginTop:8}}>CANCEL</Btn>
     </div>
    )}
    {tagMode&&selected.type==="video"&&(
     <div className="fu" style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",B1,border:`2px solid ${ac}`,padding:"14px 16px",minWidth:240,zIndex:30}}>
      <div style={{S13,fontWeight:700,color:ac,marginBottom:8}}>TAG SOMEONE IN THIS VIDEO</div>
      <input placeholder="Search member..." value={tagSearch} onChange={e=>setTagSearch(e.target.value)} autoFocus style={{width:"100%",background:"#0a0a0a",border:"1px solid #2a2a2a",color:"#fff",padding:"8px 10px",S14,outline:"none",FF,marginBottom:8}}/>
      <div style={{maxHeight:130,overflowY:"auto"}}>
      {tagCandidates.map(m=>(
       <div key={m} className="hov" onClick={()=>placeTag(selected.id,m,50,50)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",BD,marginBottom:4,cursor:"pointer",border:"1px solid #1a1a1a"}}>
        <Avatar name={m} size={26} color={ac}/><span style={{fontWeight:700,S14}}>@{m}</span>
       </div>
      ))}
      </div>
      <Btn onClick={()=>{setTagMode(false);setTagSearch("");}} bg="#1a1a1a" fg="#666" style={{width:"100%",S12,padding:"7px",marginTop:8}}>CLOSE</Btn>
     </div>
    )}
    </div>
    <div style={{width:288,BF,borderLeft:"1px solid #1a1a1a",display:"flex",flexDirection:"column",overflow:"hidden"}}>
    {showAiPanel&&(
     <div style={{background:"#0d0b14",borderBottom:"2px solid #a855f744",padding:"13px 15px",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{S12,fontWeight:900,color:"#a855f7",LS}}>
       {showAiPanel==="tags"?"✨ AI TAG SUGGESTIONS":showAiPanel==="caption"?"✨ AI CAPTION":"🏆 AI COACH FEEDBACK"}
      </div>
      <span className="hov" onClick={()=>{setShowAiPanel(null);setAiTagSuggestions([]);setAiCaption(null);setAiCoachFeedback(null);}} style={{C5,cursor:"pointer",S13}}>✕</span>
      </div>
      {aiLoading===showAiPanel&&(
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
       <div style={{width:14,height:14,border:"2px solid #a855f744",borderTopColor:"#a855f7",borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0}}/>
       <span style={{S12,color:"#a855f7",FF}}>AI is analyzing...</span>
      </div>
      )}
      {showAiPanel==="tags"&&!aiLoading&&aiTagSuggestions.length>0&&(
      <div>
       <div style={{S11,C6,FF,marginBottom:8}}>AI thinks these members might be in this photo:</div>
       <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {aiTagSuggestions.map(m=>(
        <div key={m} style={{display:"flex",alignItems:"center",justifyContent:"space-between",B1,border:"1px solid #a855f733",padding:"7px 10px"}}>
         <div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={m} size={24} color="#a855f7"/><span style={{fontWeight:700,S13}}>@{m}</span></div>
         <div style={{display:"flex",gap:5}}>
          <Btn onClick={()=>placeTag(selected.id,m,50,50)} bg="#a855f7" style={{S11,padding:"4px 10px"}}>TAG ✓</Btn>
          <Btn onClick={()=>setAiTagSuggestions(prev=>prev.filter(x=>x!==m))} bg="#1a1a1a" fg="#555" style={{S11,padding:"4px 8px"}}>✕</Btn>
         </div>
        </div>
        ))}
       </div>
       <div style={{marginTop:8,S11,C5,FF}}>Tap TAG to confirm, ✕ to dismiss</div>
      </div>
      )}
      {showAiPanel==="caption"&&!aiLoading&&aiCaption&&(
      <div>
       <div style={{B1,border:"1px solid #a855f744",padding:"11px 12px",marginBottom:9,S14,color:"#e0c8ff",FF,lineHeight:1.5,fontStyle:"italic"}}>"{aiCaption}"</div>
       <div style={{display:"flex",gap:6}}>
        <Btn onClick={()=>applyAiCaption(aiCaption)} bg="#a855f7" style={{flex:1,S12,padding:"7px"}}>✓ USE THIS</Btn>
        <Btn onClick={()=>aiGenerateCaption(selected)} bg="#1a1a1a" fg="#a855f7" style={{flex:1,S12,padding:"7px",border:"1px solid #a855f733"}}>↺ RETRY</Btn>
       </div>
      </div>
      )}
      {showAiPanel==="coach"&&!aiLoading&&aiCoachFeedback&&(
      <div>
       <div style={{B1,border:"1px solid #a855f744",padding:"11px 12px",S13,color:"#e0c8ff",FF,lineHeight:1.6}}>{aiCoachFeedback}</div>
       <Btn onClick={()=>aiCoachAnalysis(selected)} bg="#1a1a1a" fg="#a855f7" style={{width:"100%",S12,padding:"7px",marginTop:8,border:"1px solid #a855f733"}}>↺ MORE FEEDBACK</Btn>
      </div>
      )}
     </div>
    )}
    <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a1a"}}>
     <div className="hov" onClick={()=>openProfile(selected.uploader)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:6}}>
      <Avatar src={selected.uploaderAvatar} name={selected.uploader} size={32} color={ac}/>
      <div><div style={{fontWeight:700,S14}}>{selected.uploader}</div><div style={{S11,C4}}>{timeAgo(selected.ts)} • {fmtSize(selected.size)}</div></div>
     </div>
     {(selected.tags||[]).length>0&&(
      <div style={{marginTop:6}}>
      <div style={{S10,C4,LS,marginBottom:5}}>TAGGED</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
       {(selected.tags||[]).map(t=><div key={t.username} className="hov" onClick={()=>openProfile(t.username)} style={{background:`${ac}22`,border:`1px solid ${ac}44`,padding:"3px 9px",S12,color:ac,cursor:"pointer",fontWeight:700}}>@{t.username}</div>)}
      </div>
      </div>
     )}
    </div>
    <div style={{padding:"10px 16px",borderBottom:"1px solid #1a1a1a"}}>
     <div style={{S11,C4,LS,marginBottom:5}}>CAPTION</div>
     <textarea placeholder="Add a caption..." defaultValue={selected.caption||""} onBlur={e=>updateCaption(selected.id,e.target.value)} style={{width:"100%",B1,border:"1px solid #1f1f1f",color:"#ccc",padding:"7px 10px",S13,resize:"none",height:50,outline:"none",FF}}/>
    </div>
    <div style={{padding:"10px 16px",borderBottom:"1px solid #1a1a1a"}}>
     <div style={{S11,C4,LS,marginBottom:6}}>REACTIONS</div>
     <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{Object.entries(selected.reactions||{}).map(([e,users])=><button key={e} className={`rbtn${users.includes(user.username)?" on":""}`} onClick={()=>react(selected.id,e)}>{e} <span style={{S11,color:"#888"}}>{users.length}</span></button>)}</div>
     {reactionOpen?<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{REACTIONS.map(e=><button key={e} className="rbtn" onClick={()=>react(selected.id,e)} style={{fontSize:18}}>{e}</button>)}</div>:<Btn onClick={()=>setReactionOpen(true)} bg="#1a1a1a" fg="#888" style={{S12,padding:"6px 12px"}}>+ REACT</Btn>}
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
     <div style={{padding:"10px 16px 4px",S11,C4,LS}}>COMMENTS ({(selected.comments||[]).length})</div>
     <div style={{flex:1,overflowY:"auto",padding:"0 16px"}}>
      {!(selected.comments||[]).length&&<div style={{color:"#2a2a2a",S13,FF,padding:"8px 0"}}>No comments yet</div>}
      {(selected.comments||[]).map(c=>(
      <div key={c.id} style={{marginBottom:8,padding:"7px 9px",B1,borderLeft:`2px solid ${ac}`}}>
       <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
        <Avatar src={c.authorAvatar} name={c.author} size={18} color={ac} onClick={()=>openProfile(c.author)}/>
        <span style={{fontWeight:700,S12,color:ac}}>{c.author}</span>
        <span style={{color:"#333",S10}}>{timeAgo(c.ts)}</span>
       </div>
       <div style={{S13,color:"#bbb",FF,paddingLeft:24}}>{c.text}</div>
      </div>
      ))}
     </div>
     <div style={{padding:"9px 14px",borderTop:"1px solid #1a1a1a",display:"flex",gap:6}}>
      <input placeholder="Comment..." value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addComment(selected.id)} style={{flex:1,B1,border:"1px solid #1f1f1f",color:"#ddd",padding:"8px 10px",S13,outline:"none",FF}}/>
      <Btn onClick={()=>addComment(selected.id)} bg={ac} style={{padding:"8px 12px",S14}}>→</Btn>
     </div>
    </div>
    </div>
   </div>
  </div>
  )}
  {screen==="editor"&&selected&&editState&&(
  <div className="fu" style={{position:"fixed",inset:0,background:"#070709",zIndex:100,display:"flex",flexDirection:"column"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",borderBottom:`2px solid ${ac}`,BF,flexShrink:0,flexWrap:"wrap",gap:8}}>
    <div style={{fontSize:20,fontWeight:900}}>📸 PRO EDITOR</div>
    <div style={{display:"flex",gap:8}}>
    <Btn onClick={dlEdit} bg="#1a1a1a" fg={ac} style={{S12,padding:"7px 14px"}}>↓ DOWNLOAD</Btn>
    <Btn onClick={saveEdit} bg={ac} style={{S12,padding:"7px 14px"}}>✓ SAVE & SHARE</Btn>
    <Btn onClick={()=>setScreen("group")} bg="#1a1a1a" fg="#666" style={{S12,padding:"7px 12px"}}>✕</Btn>
    </div>
   </div>
   <div style={{display:"flex",BF,borderBottom:"1px solid #1a1a1a",padding:"0 16px",flexShrink:0,overflowX:"auto"}}>
    {[["adjust","🎛 ADJUST"],["filters","✨ FILTERS"],["text","✏️ TEXT"],["stickers","🔥 STICKERS"],["crop","✂️ TRANSFORM"]].map(([id,label])=>(
    <button key={id} className={`tb${editScreen===id?" act":""}`} onClick={()=>setEditScreen(id)} style={{color:editScreen===id?ac:"#555",borderBottomColor:editScreen===id?ac:"transparent",S12,padding:"10px 12px"}}>{label}</button>
    ))}
   </div>
   <div style={{flex:1,display:"flex",overflow:"hidden"}}>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:14,background:"#050507",position:"relative"}}>
    <div style={{position:"relative",display:"inline-block"}}>
     <img ref={imgRef} src={selected.src} alt="edit" crossOrigin="anonymous" style={{maxWidth:"100%",maxHeight:"calc(100vh - 200px)",objectFit:"contain",filter:getFilter(editState,activeFilter),transform:`rotate(${editState.rotate}deg) scaleX(${editState.flip?-1:1})`,transition:"filter 0.08s,transform 0.2s",display:"block"}}/>
     {textOverlays.map(t=><div key={t.id} onClick={()=>setEditingTextId(t.id===editingTextId?null:t.id)} style={{position:"absolute",left:`${t.x}%`,top:`${t.y}%`,transform:"translate(-50%,-50%)",FN,fontSize:t.size,color:t.color,background:t.bg?"rgba(0,0,0,0.5)":"transparent",padding:t.bg?"4px 10px":"0",cursor:"move",userSelect:"none",whiteSpace:"nowrap",letterSpacing:"0.06em",border:editingTextId===t.id?`1px dashed ${ac}`:"1px dashed transparent",zIndex:10}}>{t.text}</div>)}
     {stickerOverlays.map(s=><div key={s.id} style={{position:"absolute",left:`${s.x}%`,top:`${s.y}%`,transform:"translate(-50%,-50%)",fontSize:s.size,cursor:"move",userSelect:"none",zIndex:10}}>{s.emoji}</div>)}
    </div>
    <canvas ref={canvasRef} style={{display:"none"}}/>
    </div>
    <div style={{width:268,BF,borderLeft:"1px solid #1a1a1a",padding:15,overflowY:"auto",flexShrink:0}}>
    {editScreen==="adjust"&&<>
     <div style={{S11,fontWeight:900,color:ac,letterSpacing:"0.1em",marginBottom:13}}>LIGHT & COLOR</div>
     {[{key:"brightness",icon:"☀️",label:"Brightness",min:0,max:200,step:1},{key:"contrast",icon:"◑",label:"Contrast",min:0,max:200,step:1},{key:"saturation",icon:"🎨",label:"Saturation",min:0,max:200,step:1},{key:"sepia",icon:"🟫",label:"Warmth",min:0,max:100,step:1},{key:"grayscale",icon:"⬛",label:"Grayscale",min:0,max:100,step:1},{key:"blur",icon:"💨",label:"Blur",min:0,max:10,step:0.1}].map(c=>(
      <div key={c.key} style={{marginBottom:13}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,S12}}><span style={{color:"#777"}}>{c.icon} {c.label}</span><span style={{color:ac,fontWeight:700,S11}}>{parseFloat(editState[c.key]).toFixed(c.step<1?1:0)}</span></div>
      <input type="range" className="slider" min={c.min} max={c.max} step={c.step} value={editState[c.key]} onChange={e=>setEditState(s=>({...s,[c.key]:parseFloat(e.target.value)}))}/>
      </div>
     ))}
     <div onClick={()=>setEditState(s=>({...s,vignette:!s.vignette}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 11px",B1,border:`1px solid ${editState.vignette?ac:"#1f1f1f"}`,cursor:"pointer",marginBottom:10}}>
      <span style={{S12,CA}}>🌑 Vignette</span>
      <div style={{width:28,height:14,background:editState.vignette?ac:"#222",borderRadius:8,position:"relative"}}><div style={{position:"absolute",top:2,left:editState.vignette?14:2,width:10,height:10,background:"#fff",borderRadius:"50%",transition:"all 0.2s"}}/></div>
     </div>
     <Btn onClick={()=>setEditState(s=>({...s,brightness:100,contrast:100,saturation:100,blur:0,sepia:0,grayscale:0,rotate:0,vignette:false,flip:false}))} bg="#111" fg="#555" style={{width:"100%",S12}}>↺ RESET</Btn>
    </>}
    {editScreen==="filters"&&<>
     <div style={{S11,fontWeight:900,color:ac,letterSpacing:"0.1em",marginBottom:12}}>PRESETS</div>
     <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
      {FILTERS.map((f,i)=>(
      <div key={f.name} onClick={()=>setActiveFilter(i)} style={{cursor:"pointer",border:`2px solid ${activeFilter===i?ac:"#1f1f1f"}`,overflow:"hidden",B1}}>
       <div style={{height:52,overflow:"hidden"}}><img src={selected.src} style={{width:"100%",height:"100%",objectFit:"cover",filter:f.fn()}}/></div>
       <div style={{padding:"4px 7px",S11,fontWeight:700,color:activeFilter===i?ac:"#666"}}>{f.name}</div>
      </div>
      ))}
     </div>
    </>}
    {editScreen==="text"&&<>
     <div style={{S11,fontWeight:900,color:ac,letterSpacing:"0.1em",marginBottom:10}}>TEXT OVERLAYS</div>
     <Btn onClick={()=>setTextOverlays(prev=>[...prev,{id:uid(),text:"YOUR TEXT",x:50,y:50,size:40,color:"#ffffff",bg:true}])} bg={ac} style={{width:"100%",S13,marginBottom:10}}>+ ADD TEXT</Btn>
     {textOverlays.length===0&&<div style={{C4,S12,FF,textAlign:"center",padding:"14px 0"}}>No text added</div>}
     {textOverlays.map(t=>(
      <div key={t.id} style={{B1,border:`1px solid ${editingTextId===t.id?ac:"#1f1f1f"}`,padding:"9px",marginBottom:7}}>
      <input value={t.text} onChange={e=>setTextOverlays(prev=>prev.map(x=>x.id===t.id?{...x,text:e.target.value}:x))} style={{width:"100%",background:"#0a0a0a",border:"1px solid #2a2a2a",color:"#fff",padding:"5px 7px",S13,outline:"none",FN,letterSpacing:"0.06em",marginBottom:7}}/>
      <div style={{display:"flex",gap:4,marginBottom:7,flexWrap:"wrap"}}>{["#ffffff","#ff4d00","#ffd60a","#06d6a0","#00b4d8","#c77dff","#000000"].map(c=><div key={c} onClick={()=>setTextOverlays(prev=>prev.map(x=>x.id===t.id?{...x,color:c}:x))} style={{width:17,height:17,background:c,borderRadius:"50%",cursor:"pointer",border:`2px solid ${t.color===c?"#fff":"transparent"}`}}/>)}</div>
      {[["SZ",16,80,t.size,"size"],["X",5,95,t.x,"x"],["Y",5,95,t.y,"y"]].map(([l,mn,mx,val,k])=>(
       <div key={k} style={{display:"flex",gap:4,alignItems:"center",marginBottom:4}}><span style={{S10,C5,width:16}}>{l}</span><input type="range" className="slider" min={mn} max={mx} value={val} onChange={e=>setTextOverlays(prev=>prev.map(x=>x.id===t.id?{...x,[k]:parseInt(e.target.value)}:x))} style={{flex:1}}/><span style={{S10,color:ac,width:18,textAlign:"right"}}>{val}</span></div>
      ))}
      <div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"space-between",marginTop:5}}>
       <div onClick={()=>setTextOverlays(prev=>prev.map(x=>x.id===t.id?{...x,bg:!x.bg}:x))} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
        <div style={{width:22,height:11,background:t.bg?ac:"#222",borderRadius:8,position:"relative"}}><div style={{position:"absolute",top:1,left:t.bg?11:1,width:9,height:9,background:"#fff",borderRadius:"50%",transition:"all 0.2s"}}/></div>
        <span style={{S10,C6}}>BG</span>
       </div>
       <Btn onClick={()=>setTextOverlays(prev=>prev.filter(x=>x.id!==t.id))} bg="#1a1a1a" fg="#c0392b" style={{S10,padding:"3px 9px"}}>REMOVE</Btn>
      </div>
      </div>
     ))}
    </>}
    {editScreen==="stickers"&&<>
     <div style={{S11,fontWeight:900,color:ac,letterSpacing:"0.1em",marginBottom:10}}>TAP TO ADD</div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:14}}>
      {STICKERS.map(s=><div key={s} onClick={()=>setStickerOverlays(prev=>[...prev,{id:uid(),emoji:s,x:50,y:50,size:60}])} className="hov" style={{B1,border:"1px solid #1f1f1f",padding:"6px 0",textAlign:"center",fontSize:19,cursor:"pointer"}}>{s}</div>)}
     </div>
     {stickerOverlays.map(s=>(
      <div key={s.id} style={{B1,border:"1px solid #1f1f1f",padding:"7px 9px",marginBottom:5,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:19}}>{s.emoji}</span>
      <div style={{flex:1}}>
       {[["X",s.x,"x"],["Y",s.y,"y"]].map(([l,v,k])=><div key={k} style={{display:"flex",gap:4,alignItems:"center",marginBottom:3}}><span style={{S10,C5,width:12}}>{l}</span><input type="range" className="slider" min={5} max={95} value={v} onChange={e=>setStickerOverlays(prev=>prev.map(x=>x.id===s.id?{...x,[k]:parseInt(e.target.value)}:x))} style={{flex:1}}/></div>)}
      </div>
      <Btn onClick={()=>setStickerOverlays(prev=>prev.filter(x=>x.id!==s.id))} bg="#1a1a1a" fg="#c0392b" style={{S10,padding:"3px 7px"}}>✕</Btn>
      </div>
     ))}
    </>}
    {editScreen==="crop"&&<>
     <div style={{S11,fontWeight:900,color:ac,letterSpacing:"0.1em",marginBottom:10}}>ROTATE</div>
     <div style={{display:"flex",gap:5,marginBottom:10}}>{[0,90,180,270].map(d=><button key={d} className="hov" onClick={()=>setEditState(s=>({...s,rotate:d}))} style={{flex:1,background:editState.rotate===d?ac:"#1a1a1a",color:editState.rotate===d?"#fff":"#666",border:"none",padding:"8px 0",S12,FN,cursor:"pointer"}}>{d}°</button>)}</div>
     <div onClick={()=>setEditState(s=>({...s,flip:!s.flip}))} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",B1,border:`1px solid ${editState.flip?ac:"#1f1f1f"}`,cursor:"pointer",marginBottom:10}}>
      <span style={{S12,CA}}>↔️ Flip Horizontal</span>
      <div style={{width:28,height:14,background:editState.flip?ac:"#222",borderRadius:8,position:"relative"}}><div style={{position:"absolute",top:2,left:editState.flip?14:2,width:10,height:10,background:"#fff",borderRadius:"50%",transition:"all 0.2s"}}/></div>
     </div>
     <Btn onClick={()=>setEditState(s=>({...s,rotate:0,flip:false}))} bg="#111" fg="#555" style={{width:"100%",S12}}>↺ RESET</Btn>
    </>}
    </div>
   </div>
  </div>
  )}
  {modal&&(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&setModal(null)}>
   <div className="fu" style={{BD,border:`2px solid ${ac}`,padding:"28px 26px",width:"100%",maxWidth:modal==="notifs"?400:380,maxHeight:"85vh",overflowY:"auto"}}>
    {modal==="createGroup"&&<>
    <div style={{fontSize:24,fontWeight:900,marginBottom:18}}>CREATE GROUP</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
     <Inp placeholder="Group name..." value={form.groupName||""} onChange={F("groupName")}/>
     <div><div style={{S11,C5,LS,marginBottom:6}}>ICON</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{ICONS.map(icon=><span key={icon} onClick={()=>setForm(f=>({...f,groupIcon:icon}))} style={{fontSize:21,cursor:"pointer",padding:6,background:form.groupIcon===icon?"#1f1f1f":"transparent",border:`1px solid ${form.groupIcon===icon?ac:"transparent"}`,borderRadius:4}}>{icon}</span>)}</div></div>
     <div><div style={{S11,C5,LS,marginBottom:6}}>COLOR</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{COLORS.map(c=><div key={c} onClick={()=>setForm(f=>({...f,groupColor:c}))} style={{width:24,height:24,background:c,borderRadius:"50%",cursor:"pointer",border:`2px solid ${form.groupColor===c?"#fff":"transparent"}`}}/>)}</div></div>
     <div style={{display:"flex",gap:7,marginTop:4}}><Btn onClick={createGroup} style={{flex:1,S14,padding:"10px"}}>CREATE →</Btn><Btn onClick={()=>{setModal(null);setForm({});}} bg="#1a1a1a" fg="#666" style={{flex:1,S14,padding:"10px"}}>CANCEL</Btn></div>
    </div>
    </>}
    {modal==="joinGroup"&&<>
    <div style={{fontSize:24,fontWeight:900,marginBottom:8}}>JOIN A GROUP</div>
    <div style={{C5,S13,FF,marginBottom:16}}>Enter the 6-character invite code</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
     <Inp placeholder="e.g. A3K9PQ" value={form.joinCode||""} onChange={e=>setForm(f=>({...f,joinCode:e.target.value.toUpperCase()}))} style={{textTransform:"uppercase",letterSpacing:"0.2em",fontSize:20,textAlign:"center"}} maxLength={6}/>
     {loading?<div style={{textAlign:"center",padding:10}}><Spin/></div>:<div style={{display:"flex",gap:7}}><Btn onClick={joinGroup} style={{flex:1,S14,padding:"10px"}}>JOIN →</Btn><Btn onClick={()=>{setModal(null);setForm({});}} bg="#1a1a1a" fg="#666" style={{flex:1,S14,padding:"10px"}}>CANCEL</Btn></div>}
    </div>
    </>}
    {modal==="inviteCode"&&activeGroup&&<>
    <div style={{fontSize:24,fontWeight:900,marginBottom:6}}>INVITE TO {activeGroup.name.toUpperCase()}</div>
    <div style={{C5,S13,FF,marginBottom:16}}>Share this code with your squad</div>
    <div style={{B1,border:`2px solid ${activeGroup.color}`,padding:"18px",textAlign:"center",marginBottom:16}}>
     <div style={{fontSize:42,fontWeight:900,letterSpacing:"0.3em",color:activeGroup.color,animation:"glow 2s infinite"}}>{activeGroup.code}</div>
     <div style={{C5,S12,FF,marginTop:5}}>Dashboard → Join with Code</div>
    </div>
    <div style={{B1,padding:"10px 12px",marginBottom:14,S13,C6,FF}}>👥 Members: <span style={{CA}}>{activeGroup.members.join(", ")}</span></div>
    <Btn onClick={()=>setModal(null)} bg="#1a1a1a" fg="#888" style={{width:"100%",S14,padding:"10px"}}>CLOSE</Btn>
    </>}
    {modal==="aiReel"&&<>
    <div style={{fontSize:24,fontWeight:900,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
     <span>✨ AI HIGHLIGHT REEL</span>
     <Btn onClick={()=>setModal(null)} bg="#1a1a1a" fg="#666" style={{S11,padding:"5px 10px"}}>CLOSE</Btn>
    </div>
    <div style={{C5,S13,FF,marginBottom:14}}>AI picks your squad's best moments by reactions, comments & engagement</div>
    {aiLoading==="reel"&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{width:28,height:28,border:"3px solid #a855f744",borderTopColor:"#a855f7",borderRadius:"50%",animation:"spin 0.75s linear infinite",margin:"0 auto 12px"}}/><div style={{S13,color:"#a855f7",FF}}>AI is scanning your uploads...</div></div>}
    {!aiLoading&&aiReelPicks?.intro&&(
     <div>
      <div style={{background:"linear-gradient(135deg,#1a0d2e,#0d0b14)",border:"1px solid #a855f744",padding:"14px 16px",marginBottom:14,textAlign:"center"}}>
      <div style={{S11,color:"#a855f7",letterSpacing:"0.1em",marginBottom:4}}>AI REEL INTRO</div>
      <div style={{fontSize:16,fontWeight:900,color:"#e0c8ff",fontStyle:"italic"}}>"{aiReelPicks.intro}"</div>
      </div>
      <div style={{S11,color:"#a855f7",letterSpacing:"0.1em",marginBottom:10}}>TOP {aiReelPicks.picks?.length} PICKS</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:14}}>
      {(aiReelPicks.picks||[]).map((item,i)=>(
       <div key={item.id} className="ch" style={{B1,border:"1px solid #a855f733",overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelected(item);setModal(null);setScreen("lightbox");}}>
        <div style={{aspectRatio:"16/9",position:"relative",overflow:"hidden"}}>
        {item.type==="video"?<video src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}} muted/>:<img src={item.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
        <div style={{position:"absolute",top:4,left:4,background:"#a855f7",color:"#fff",padding:"2px 6px",S10,fontWeight:800}}>#{i+1}</div>
        <div style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,0.75)",padding:"2px 6px",S10}}>🔥{totalR(item)}</div>
        </div>
        <div style={{padding:"6px 8px",S11,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
       </div>
      ))}
      </div>
      <div style={{display:"flex",gap:7}}>
      <Btn onClick={()=>{(aiReelPicks.picks||[]).forEach(item=>togglePin(item.id));setModal(null);toast$("AI picks added to highlights! ⭐");}} bg="#a855f7" style={{flex:1,S13,padding:"9px"}}>⭐ PIN ALL TO HIGHLIGHTS</Btn>
      <Btn onClick={()=>aiPickHighlights()} bg="#1a1a1a" fg="#a855f7" style={{flex:1,S13,padding:"9px",border:"1px solid #a855f733"}}>↺ REPICK</Btn>
      </div>
     </div>
    )}
    </>}
    {modal==="notifs"&&<>
    <div style={{fontSize:24,fontWeight:900,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
     NOTIFICATIONS <Btn onClick={()=>setModal(null)} bg="#1a1a1a" fg="#666" style={{S11,padding:"5px 10px"}}>CLOSE</Btn>
    </div>
    {notifications.length===0&&<div style={{textAlign:"center",padding:"30px 20px",color:"#333"}}><div style={{fontSize:36,marginBottom:8}}>🔔</div><div style={{fontSize:18,fontWeight:900}}>ALL CAUGHT UP</div></div>}
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
     {notifications.map(n=>(
      <div key={n.id} style={{background:n.read?"#0d0d14":"#111",border:`1px solid ${n.read?"#1a1a1a":ac}`,padding:"11px 13px",position:"relative"}}>
      {!n.read&&<div style={{position:"absolute",top:9,right:9,width:7,height:7,background:ac,borderRadius:"50%"}}/>}
      <div style={{S13,FF,color:n.read?"#666":"#ccc",lineHeight:1.4,marginBottom:5}}>{n.msg}</div>
      <div style={{S11,C4,FF,marginBottom:n.type==="tag"&&!n.approved&&!n.rejected?9:0}}>{timeAgo(n.ts)}</div>
      {n.type==="tag"&&!n.approved&&!n.rejected&&(
       <div style={{display:"flex",gap:6}}>
        <Btn onClick={()=>approveTag(n.mediaId)} bg={ac} style={{S12,padding:"6px 13px"}}>⭐ ADD TO HIGHLIGHTS</Btn>
        <Btn onClick={()=>declineTag(n.mediaId)} bg="#1a1a1a" fg="#888" style={{S12,padding:"6px 11px"}}>DECLINE</Btn>
       </div>
      )}
      {n.type==="tag"&&n.approved&&<div style={{S11,color:ac,fontWeight:700}}>✓ Added to highlights</div>}
      {n.type==="tag"&&n.rejected&&<div style={{S11,C5,fontWeight:700}}>Declined</div>}
      </div>
     ))}
    </div>
    </>}
   </div>
  </div>
  )}
 </div>
);
}
