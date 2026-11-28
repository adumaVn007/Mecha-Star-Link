/* vg-admin.js — thanh điều hướng chung cho mọi trang chỉnh sửa (mẫu giao diện duy nhất, xem vg-admin.css). */
(function(){
  var P=[['admin.html','Mecha Studio'],['AdminEditNPCPlayer.html','NPC'],['AdminEditMonster.html','Quái & Boss'],['EditJobMSL.html','Nghề'],['AdminEditBlueprint.html','Bản vẽ'],['editmisson.html','Nhiệm vụ'],['stat-formula.html','Chỉ số cấp bậc'],['worldmap-editor.html','Bản đồ'],['EditPlayoutCombat.html','Giao diện combat'],['index.html','▶ Vào game']];
  var cur=(location.pathname.split('/').pop()||'index.html');if(cur==='admin')cur='admin.html';
  function build(){if(document.getElementById('vgnav'))return;var n=document.createElement('nav');n.id='vgnav';n.setAttribute('aria-label','Công cụ chỉnh sửa');
    n.innerHTML=P.map(function(x){return '<a href="'+x[0]+'"'+(x[0]===cur?' class="on" aria-current="page"':'')+'>'+x[1]+'</a>'}).join('');
    document.body.insertBefore(n,document.body.firstChild);var a=n.querySelector('.on');if(a&&a.scrollIntoView)try{a.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}}
  if(document.body)build();else document.addEventListener('DOMContentLoaded',build);
})();
