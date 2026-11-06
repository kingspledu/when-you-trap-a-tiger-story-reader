(()=>{'use strict';
const button=document.getElementById('install-app'),dialog=document.getElementById('install-help'),fullscreen=document.getElementById('read-fullscreen');
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
let installPrompt=null;
function update(){button.hidden=standalone()}
update();
window.matchMedia('(display-mode: standalone)').addEventListener('change',update);
window.matchMedia('(display-mode: fullscreen)').addEventListener('change',update);
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;update()});
window.addEventListener('appinstalled',()=>{installPrompt=null;button.hidden=true;if(dialog.open)dialog.close()});
button.addEventListener('click',async()=>{
 if(installPrompt){const pending=installPrompt;installPrompt=null;try{await pending.prompt();const choice=await pending.userChoice;if(choice.outcome==='accepted')button.hidden=true;return}catch{}}
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 document.getElementById('install-instructions').textContent=ios?'Safari에서 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하세요. 홈 화면에 생긴 아이콘으로 열면 주소창 없이 읽을 수 있어요.':'브라우저 메뉴에서 “앱 설치” 또는 “앱으로 설치”를 선택하세요. 설치한 아이콘으로 열면 독립된 앱 화면에서 읽을 수 있어요.';
 fullscreen.hidden=!document.documentElement.requestFullscreen;
 dialog.showModal();
});
fullscreen.addEventListener('click',async()=>{dialog.close();try{await document.documentElement.requestFullscreen()}catch{document.getElementById('install-instructions').textContent='브라우저에서 전체화면을 허용하지 않았습니다. 앱으로 설치한 뒤 아이콘으로 열어 주세요.';dialog.showModal()}});
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()}});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{}));
})();
