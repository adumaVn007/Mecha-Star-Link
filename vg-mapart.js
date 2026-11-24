/* vg-mapart.js — hình vẽ 2.5D dùng chung cho index.html (game) và worldmap-editor.html.
   Chỉ vẽ canvas, không đụng dữ liệu. VG.art = {DRAW (icon trang trí), KDRAW (công trình), banner (nhãn nổi)}. */
(function(g){var VG=g.VG=g.VG||{};
var shade=function(hex,k){var n=parseInt(hex.slice(1),16),f=function(v){return Math.max(0,Math.min(255,Math.round(v*k)))};return'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')'};
function dia(c,px,py,w,h){c.beginPath();c.moveTo(px,py);c.lineTo(px+w,py+h);c.lineTo(px,py+2*h);c.lineTo(px-w,py+h);c.closePath()}
function poly(c,pts,fill,stroke){c.beginPath();c.moveTo(pts[0],pts[1]);for(var i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()}}
function blk(c,cx,cy,hw,hg,col){var hh=hw/2,T=cy-hg;
 poly(c,[cx-hw,T,cx,T+hh,cx,cy+hh,cx-hw,cy],shade(col,.6));poly(c,[cx+hw,T,cx,T+hh,cx,cy+hh,cx+hw,cy],shade(col,.8));poly(c,[cx,T-hh,cx+hw,T,cx,T+hh,cx-hw,T],col,'#0003')}
function roof(c,cx,cy,hw,rise,col){var hh=hw/2;poly(c,[cx-hw,cy,cx,cy+hh,cx,cy-rise],shade(col,.65));poly(c,[cx+hw,cy,cx,cy+hh,cx,cy-rise],shade(col,.9));poly(c,[cx-hw,cy,cx,cy-hh,cx+hw,cy,cx,cy-rise],col,'#0003')}
function glow(c,x,y,r,col){var gr=c.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col+'cc');gr.addColorStop(1,col+'00');c.fillStyle=gr;c.beginPath();c.arc(x,y,r,0,7);c.fill()}
function shadow(c,cx,cy,rx){c.fillStyle='#0006';c.beginPath();c.ellipse(cx,cy+2,rx,rx/2,0,0,7);c.fill()}
var DRAW={
 tree:function(c,x,y,z){shadow(c,x,y,9*z);c.fillStyle='#4a3a28';c.fillRect(x-1.6*z,y-8*z,3.2*z,9*z);
  var k=[['#245a43',-12,10],['#2f7358',-17,8],['#3d8a6a',-21,5.5]];k.forEach(function(a){var gr=c.createRadialGradient(x-2*z,y+a[1]*z-2*z,1,x,y+a[1]*z,a[2]*z+2);gr.addColorStop(0,shade('#5fae8a',1.1));gr.addColorStop(1,a[0]);c.fillStyle=gr;c.beginPath();c.ellipse(x,y+a[1]*z,a[2]*z+1*z,a[2]*z,0,0,7);c.fill()})},
 pine:function(c,x,y,z){shadow(c,x,y,8*z);c.fillStyle='#4a3a28';c.fillRect(x-1.4*z,y-5*z,2.8*z,6*z);
  [[-4,11,'#1f4d3c'],[-12,9,'#28604a'],[-20,6.5,'#327558']].forEach(function(a){poly(c,[x-a[1]*z,y+a[0]*z,x,y+(a[0]-12)*z,x,y+(a[0]+3)*z],shade(a[2],.7));poly(c,[x+a[1]*z,y+a[0]*z,x,y+(a[0]-12)*z,x,y+(a[0]+3)*z],a[2])})},
 peak:function(c,x,y,z){shadow(c,x,y,17*z);poly(c,[x-17*z,y,x-3*z,y-30*z,x+2*z,y+4*z],'#5b605d');poly(c,[x+17*z,y,x-3*z,y-30*z,x+2*z,y+4*z],'#868b87');poly(c,[x-3*z,y-30*z,x-8*z,y-19*z,x-3*z,y-22*z,x+2*z,y-17*z,x+4*z,y-21*z],'#eef4f2')},
 boulder:function(c,x,y,z){shadow(c,x,y,10*z);poly(c,[x-10*z,y,x-6*z,y-10*z,x+1*z,y-12*z,x+4*z,y+3*z],'#5f645f');poly(c,[x+1*z,y-12*z,x+9*z,y-6*z,x+10*z,y,x+4*z,y+3*z],'#8b908b');poly(c,[x-6*z,y-10*z,x+1*z,y-12*z,x-1*z,y-5*z],'#a3a8a2')},
 crystal:function(c,x,y,z){shadow(c,x,y,8*z);glow(c,x,y-9*z,16*z,'#7fe8ff');poly(c,[x-5*z,y,x-4*z,y-14*z,x,y-20*z,x,y+2*z],'#3aa6c7');poly(c,[x+5*z,y,x+4*z,y-14*z,x,y-20*z,x,y+2*z],'#8ff0ff');poly(c,[x+3*z,y,x+8*z,y-8*z,x+6*z,y+1*z],'#5bc7e0')},
 pagoda:function(c,x,y,z){shadow(c,x,y,13*z);blk(c,x,y,12*z,3*z,'#8a8a82');blk(c,x,y-3*z,7*z,8*z,'#8a6a3c');roof(c,x,y-11*z,11*z,6*z,'#2f7d6f');blk(c,x,y-17*z,5*z,6*z,'#8a6a3c');roof(c,x,y-23*z,8*z,5*z,'#2f7d6f');c.fillStyle='#e4c27b';c.fillRect(x-.8*z,y-34*z,1.6*z,6*z)},
 tent:function(c,x,y,z){shadow(c,x,y,12*z);poly(c,[x-12*z,y,x,y-16*z,x-1*z,y+5*z],'#a58a5a');poly(c,[x+12*z,y,x,y-16*z,x-1*z,y+5*z],'#d2b57d');poly(c,[x-3*z,y+4*z,x,y-3*z,x+2*z,y+3*z],'#3a2a1a')},
 ruinpil:function(c,x,y,z){shadow(c,x,y,8*z);c.fillStyle='#8a7a5c';c.fillRect(x-4*z,y-14*z,8*z,15*z);c.fillStyle='#b8a67f';c.fillRect(x-4*z,y-14*z,3.5*z,15*z);poly(c,[x-4*z,y-14*z,x-1*z,y-17*z,x+1*z,y-12*z,x+4*z,y-15*z,x+4*z,y-14*z],'#6e6048');c.fillStyle='#6e6048';c.fillRect(x+6*z,y-3*z,6*z,4*z)},
 chest:function(c,x,y,z){shadow(c,x,y,8*z);blk(c,x,y,7*z,6*z,'#8a5a2c');c.fillStyle='#e4c27b';c.fillRect(x-1*z,y-3*z,2*z,3*z)},
 banner:function(c,x,y,z){shadow(c,x,y,5*z);c.fillStyle='#4a3a28';c.fillRect(x-1*z,y-26*z,2*z,28*z);poly(c,[x+1*z,y-26*z,x+14*z,y-22*z,x+1*z,y-14*z],'#c0392b');c.fillStyle='#e4c27b';c.fillRect(x-2*z,y-28*z,4*z,3*z)},
 lotus:function(c,x,y,z){c.fillStyle='#2f6a4a';c.beginPath();c.ellipse(x,y-1*z,11*z,5*z,0,0,7);c.fill();for(var i=-1;i<=1;i++)poly(c,[x+i*4*z-3*z,y-2*z,x+i*4*z,y-10*z,x+i*4*z+3*z,y-2*z],i?'#e8a6c0':'#f6c9da')},
 spring:function(c,x,y,z){glow(c,x,y-2*z,18*z,'#7fe8ff');c.fillStyle='#3a8fb0';c.beginPath();c.ellipse(x,y,11*z,5.5*z,0,0,7);c.fill();c.strokeStyle='#d6f6ff';c.lineWidth=1.2*z;c.beginPath();c.ellipse(x,y,6*z,3*z,0,0,7);c.stroke()}
};
var KDRAW={
 capital:function(c,x,y,z,col){shadow(c,x,y,28*z);blk(c,x,y,26*z,4*z,'#8d8d86');blk(c,x,y-4*z,15*z,14*z,'#8a6a3c');roof(c,x,y-18*z,20*z,11*z,col||'#2f7d6f');blk(c,x,y-27*z,9*z,9*z,'#a07c44');roof(c,x,y-36*z,14*z,9*z,col||'#2f7d6f');c.fillStyle='#e4c27b';c.fillRect(x-1*z,y-52*z,2*z,8*z);glow(c,x,y-30*z,22*z,'#e4c27b')},
 city:function(c,x,y,z,col){shadow(c,x,y,22*z);blk(c,x,y,20*z,4*z,'#8d8d86');blk(c,x-7*z,y-2*z,8*z,10*z,'#8a6a3c');roof(c,x-7*z,y-12*z,12*z,8*z,col||'#2f7d6f');blk(c,x+8*z,y+1*z,7*z,8*z,'#9a7a48');roof(c,x+8*z,y-7*z,10*z,6*z,col||'#2f7d6f')},
 fortress:function(c,x,y,z,col){shadow(c,x,y,20*z);blk(c,x,y,18*z,10*z,'#7d817c');for(var i=-1;i<=1;i++)blk(c,x+i*9*z,y-10*z+Math.abs(i)*0,3.5*z,3*z,'#9a9e98');blk(c,x,y-10*z,9*z,12*z,'#6d716c');roof(c,x,y-22*z,12*z,6*z,col||'#8a3a2c');c.fillStyle=col||'#e0463c';c.fillRect(x-.8*z,y-38*z,1.6*z,12*z);poly(c,[x+.8*z,y-38*z,x+9*z,y-35*z,x+.8*z,y-31*z],col||'#e0463c')},
 sect:function(c,x,y,z,col){shadow(c,x,y,20*z);blk(c,x,y,18*z,3*z,'#a8a8a0');c.fillStyle='#b8392c';c.fillRect(x-13*z,y-22*z,3.5*z,24*z);c.fillRect(x+9.5*z,y-22*z,3.5*z,24*z);poly(c,[x-18*z,y-22*z,x,y-27*z,x+18*z,y-22*z,x+16*z,y-18*z,x,y-22*z,x-16*z,y-18*z],'#2a2f30');c.fillStyle='#b8392c';c.fillRect(x-11*z,y-16*z,22*z,2.5*z);glow(c,x,y-12*z,18*z,'#8fe3cf')},
 cave:function(c,x,y,z){shadow(c,x,y,20*z);poly(c,[x-20*z,y+2*z,x-14*z,y-14*z,x-2*z,y-22*z,x+12*z,y-16*z,x+20*z,y+2*z],'#5b605d');poly(c,[x+4*z,y-20*z,x+12*z,y-16*z,x+20*z,y+2*z,x+6*z,y+2*z],'#7c817d');c.fillStyle='#05080a';c.beginPath();c.ellipse(x-1*z,y-3*z,8*z,10*z,0,Math.PI,0);c.lineTo(x+7*z,y+1*z);c.lineTo(x-9*z,y+1*z);c.fill();glow(c,x-1*z,y-3*z,10*z,'#b46aff')},
 realm:function(c,x,y,z){var r=15*z;glow(c,x,y-14*z,30*z,'#8fe3cf');c.strokeStyle='#8fe3cf';c.lineWidth=3*z;c.beginPath();c.ellipse(x,y-14*z,r*.62,r,0,0,7);c.stroke();c.strokeStyle='#e4c27b';c.lineWidth=1.2*z;c.beginPath();c.ellipse(x,y-14*z,r*.42,r*.7,0,0,7);c.stroke();c.fillStyle='#8fe3cf44';c.beginPath();c.ellipse(x,y-14*z,r*.6,r*.95,0,0,7);c.fill();c.fillStyle='#0006';c.beginPath();c.ellipse(x,y,r*.8,r*.35,0,0,7);c.fill()},
 village:function(c,x,y,z,col){shadow(c,x,y,16*z);blk(c,x-6*z,y,6*z,5*z,'#9a7a48');roof(c,x-6*z,y-5*z,9*z,5*z,'#7a5a34');blk(c,x+7*z,y+3*z,5*z,4*z,'#a8864f');roof(c,x+7*z,y-1*z,8*z,4*z,'#7a5a34')},
 other:function(c,x,y,z){shadow(c,x,y,6*z);c.fillStyle='#4a3a28';c.fillRect(x-1*z,y-24*z,2*z,26*z);poly(c,[x+1*z,y-24*z,x+12*z,y-20*z,x+1*z,y-14*z],'#77c5a6')}};
function drawBanner(c,x,y,name,col,s,on){c.font='bold '+(12*s)+'px Georgia';var tw=c.measureText(name).width,w=tw+14*s,h=22*s,l=x-w/2,t=y-h;
 c.fillStyle='#4a3a28';c.fillRect(x-1,y,2,8*s);
 c.fillStyle='#0a1117ee';c.fillRect(l,t,w,h);c.fillStyle=col;c.fillRect(l,t,w,3*s);c.strokeStyle=on?'#fff':'#e4c27b';c.lineWidth=on?2:1;c.strokeRect(l+.5,t+.5,w-1,h-1);
 c.fillStyle='#e4c27b';var q=3*s;[[l,t],[l+w-q,t],[l,t+h-q],[l+w-q,t+h-q]].forEach(function(p){c.fillRect(p[0],p[1],q,q)});
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#0a1117';c.strokeText(name,x,t+h/2+1.5*s);c.fillStyle='#f3e7c9';c.fillText(name,x,t+h/2+1.5*s);return[l,t,w,h]}
VG.art={DRAW:DRAW,KDRAW:KDRAW,banner:drawBanner};
})(typeof window!='undefined'?window:globalThis);
