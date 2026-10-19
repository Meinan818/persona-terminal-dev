import {escapeHtml} from './encounters.js';

// Set a local file only after its appearance has been reviewed and accepted.
export const approvedArt = {hero:null,enemy:null};

export function visualArt(slot, fallback) {
  const source=approvedArt[slot];
  if(!source)return fallback;
  let url;
  try{url=new URL(source,location.href);}catch{return fallback;}
  if(url.origin!==location.origin||!(/\.(png|webp|svg|avif)$/i).test(url.pathname))return fallback;
  return `<div class="visual-slot" data-art-slot="${slot}"><div class="art-fallback">${fallback}</div><img class="approved-illustration" src="${escapeHtml(url.href)}" alt="" hidden></div>`;
}
document.addEventListener('load',event=>{
  const image=event.target;if(!(image instanceof HTMLImageElement)||!image.matches('.approved-illustration'))return;
  const fallback=image.parentElement.querySelector('.art-fallback');
  if(image.naturalWidth>0){image.hidden=false;if(fallback)fallback.hidden=true;}
},true);
document.addEventListener('error',event=>{
  const image=event.target;if(!(image instanceof HTMLImageElement)||!image.matches('.approved-illustration'))return;
  image.hidden=true;const fallback=image.parentElement.querySelector('.art-fallback');if(fallback)fallback.hidden=false;
},true);
