// Editable pixel originals: integer rasterization and small material ramps.
export function painter(canvas) {
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function line(x0,y0,x1,y1,color,width=1){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){rect(x0-Math.floor(width/2),y0-Math.floor(width/2),width,width,color);if(x0===x1&&y0===y1)break;const twice=error*2;if(twice>=dy){error+=dy;x0+=sx;}if(twice<=dx){error+=dx;y0+=sy;}}
  }
  function polygon(points,color){
    const lo=Math.floor(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let y=lo;y<hi;y++){const edges=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))edges.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}edges.sort((a,b)=>a-b);for(let i=0;i<edges.length;i+=2)rect(Math.ceil(edges[i]),y,Math.floor(edges[i+1])-Math.ceil(edges[i])+1,1,color);}
  }
  function ellipse(x,y,rx,ry,color){for(let yy=-Math.floor(ry);yy<=ry;yy++){const xx=Math.floor(rx*Math.sqrt(Math.max(0,1-yy*yy/(ry*ry))));rect(x-xx,y+yy,xx*2+1,1,color);}}
  function hash(x,y,seed=0){let n=Math.imul(x+seed*101,374761393)^Math.imul(y+seed,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
  function texture(x,y,w,h,colors,density=.18,step=3,seed=0){for(let yy=0;yy<h;yy+=step)for(let xx=0;xx<w;xx+=step){const n=hash(x+xx,y+yy,seed);if(n<density)rect(x+xx,y+yy,Math.min(step,1+Math.floor(n/density*step)),1,colors[Math.floor(hash(xx,yy,seed+31)*colors.length)]);}}
  function frame(x,y,w,h,base='#716744',light='#a89968',dark='#273a36'){
    rect(x-2,y-2,w+4,h+5,'#0c1b24');rect(x,y,w,h,base);rect(x,y,w,2,light);rect(x,y,2,h,light);rect(x+w-3,y+2,3,h-2,dark);rect(x+2,y+h-3,w-2,3,dark);
    for(const [dx,dy]of[[5,5],[w-6,5],[5,h-7],[w-6,h-7]]){rect(x+dx,y+dy,2,2,'#c5b27b');rect(x+dx+1,y+dy+1,1,1,'#34463d');}
  }
  function shadow(x,y,rx=40,ry=7){ellipse(x,y,rx+6,ry+3,'rgba(5,15,21,.15)');ellipse(x,y,rx,ry,'rgba(5,15,21,.26)');}
  function glow(x,y,rx,ry,rgb='226,179,102',strength=1){for(let i=5;i>=1;i--)ellipse(x,y,rx*i/5,ry*i/5,`rgba(${rgb},${.014*strength})`);}
  function paper(x,y,w=30,h=20,seal=false){
    rect(x+3,y+3,w,h,'#14252a');polygon([[x,y],[x+w-5,y],[x+w,y+5],[x+w,y+h],[x,y+h]],'#d4c5a1');rect(x+1,y+1,w-7,1,'#f0e0b8');polygon([[x+w-5,y],[x+w-5,y+5],[x+w,y+5]],'#9e9475');
    for(let n=0;n<Math.floor((h-7)/4);n++)rect(x+4,y+5+n*4,Math.max(3,w-10-(n*7)%11),1,'#8b8b71');if(seal){ellipse(x+w-9,y+h-7,4,3,'#875347');rect(x+w-10,y+h-8,2,1,'#c59165');}
  }
  function table(x,y,w=150,h=76){
    shadow(x+w/2,y+h,w*.52,8);polygon([[x,y],[x+w,y],[x+w+9,y+7],[x+5,y+7]],'#a18457');rect(x+4,y+7,w+5,8,'#544b35');rect(x+8,y+15,w-8,25,'#715d40');rect(x+11,y+17,w-15,1,'#ab8f5c');
    for(let i=0;i<3;i++){const dw=(w-21)/3;rect(x+12+i*dw,y+21,dw-5,14,'#5a513b');rect(x+16+i*dw,y+23,dw-12,1,'#8b7850');rect(x+dw/2+i*dw,y+27,9,2,'#b69b62');}
    if(h>40)for(const dx of[11,w-11]){rect(x+dx,y+40,8,h-40,'#4d4a35');rect(x+dx,y+40,2,h-40,'#8c7a4e');rect(x+dx-2,y+h-4,12,5,'#303b31');}
    texture(x+6,y+1,w-5,6,['#d0ac71','#776540'],.3,3,3);texture(x+10,y+37,w-15,3,['#9e8958'],.35,3);
  }
  function book(x,y,w=23,h=32,color='#6a7960',flat=false){
    if(flat){rect(x,y,w,h,'#354a41');rect(x+1,y+2,w-3,h-4,'#c7b992');for(let i=4;i<h-2;i+=3)rect(x+2,y+i,w-4,1,'#958e73');rect(x,y,w,2,color);rect(x,y+h-2,w,2,color);rect(x,y,3,h,color);return;}
    rect(x+2,y+2,w,h,'#10232a');rect(x,y,w,h,color);rect(x+2,y,2,h,'#b3a778');rect(x+6,y+4,w-10,1,'#c9b67e');rect(x+6,y+h-5,w-10,1,'#a3905e');rect(x+w-2,y+2,2,h-3,'#2b4039');
  }
  function lamp(x,y,on=true){
    if(on)polygon([[x-14,y],[x+14,y],[x+49,y+53],[x-49,y+53]],'rgba(233,190,109,.055)');
    shadow(x,y+35,17,3);ellipse(x,y+32,16,4,'#364b40');rect(x-2,y-3,4,34,'#947944');rect(x-2,y,1,30,'#d0b476');
    polygon([[x-23,y+1],[x-14,y-17],[x+14,y-17],[x+23,y+1]],'#486c5e');polygon([[x-14,y-17],[x-9,y-17],[x-14,y],[x-20,y]],'#7c9778');rect(x-23,y,46,3,'#233e37');rect(x-17,y+3,34,2,on?'#ead18c':'#847b51');rect(x-1,y-20,3,3,'#c3ad6f');
  }
  function pipe(points,on=false,width=7){
    for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];line(...a,...b,'#11262a',width+3);line(...a,...b,'#716c48',width);line(a[0]-1,a[1]-1,b[0]-1,b[1]-1,on?'#bea76b':'#92946c',2);}
    for(const [x,y]of points.slice(1,-1)){rect(x-5,y-4,10,8,'#85835a');rect(x-5,y-4,10,1,'#c2b582');rect(x+3,y-3,2,7,'#3a5548');}
  }
  function gauge(x,y,r=12,value=.5){ellipse(x+1,y+2,r+2,r+2,'#15282b');ellipse(x,y,r,r,'#b69e65');ellipse(x,y,r-3,r-3,'#d2c59d');for(let n=0;n<5;n++){const a=-2.4+n*1.2;rect(x+Math.sin(a)*(r-5),y-Math.cos(a)*(r-5),1,1,'#626c50');}const angle=-2.2+value*4.4;line(x,y,x+Math.sin(angle)*(r-5),y-Math.cos(angle)*(r-5),'#4a6251');rect(x-1,y-1,3,3,'#5a684c');}
  function gear(x,y,r=22,teeth=16,phase=0,color='#aa955e'){
    shadow(x+1,y+3,r+2,r+2);const points=[];for(let i=0;i<teeth*4;i++){const a=i*Math.PI*2/(teeth*4)+phase,rr=i%4<2?r:r-4;points.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}polygon(points,color);ellipse(x,y,r-6,r-6,'#777a4f');ellipse(x-1,y-1,r-8,r-8,'#354e43');
    for(let i=0;i<6;i++){const a=i*Math.PI/3+phase;line(x,y,x+Math.cos(a)*(r-8),y+Math.sin(a)*(r-8),'#9c925f',4);}
    ellipse(x,y,6,6,'#b6a16b');ellipse(x,y,3,3,'#344a3f');rect(x-1,y-2,2,1,'#ebcf8b');line(x-r+8,y-r+6,x-r+16,y-r+9,'#c7b272');
  }
  function clock(x,y,r=24,turn=.12,period=12){
    shadow(x+2,y+3,r+3,r+3);ellipse(x,y,r+3,r+3,'#263f39');ellipse(x,y,r,r,'#aa925c');ellipse(x,y,r-2,r-2,'#d4c49b');ellipse(x,y,r-5,r-5,'#c5ba94');
    for(let i=0;i<period;i++){const a=i*Math.PI*2/period;line(x+Math.sin(a)*(r-5),y-Math.cos(a)*(r-5),x+Math.sin(a)*(r-8),y-Math.cos(a)*(r-8),'#697252');}
    const a=turn*Math.PI*2;line(x,y,x+Math.sin(a)*(r-9),y-Math.cos(a)*(r-9),'#3d594b',2);line(x,y,x-5,y+7,'#768365',2);ellipse(x,y,2,2,'#8b8558');rect(x-r+8,y-r+5,8,1,'#f0ddad');
  }
  function cabinet(x,y,w=140,rows=4,cols=3,mail=false){
    shadow(x+w/2,y+rows*31+9,w*.52,7);polygon([[x,y],[x+w,y],[x+w+6,y+5],[x+6,y+5]],'#9f9163');frame(x,y+5,w,rows*31+7,'#4f6655','#929875','#243e38');
    const cw=(w-12)/cols;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const xx=x+6+col*cw,yy=y+10+row*31;
      rect(xx,yy,cw-3,27,mail?'#203a36':row%2?'#62725a':'#697c60');rect(xx,yy,cw-3,1,'#8f9b73');rect(xx+cw-5,yy,2,27,'#263f36');
      if(mail){if(hash(row,col,8)>.2){paper(xx+3,yy+13,cw-10,10,false);rect(xx+4,yy+23,cw-11,2,'#6b6b47');}}
      else{rect(xx+7,yy+6,cw-18,7,'#bbb68f');rect(xx+9,yy+8,cw-24,1,'#7d8869');rect(xx+cw/2-4,yy+18,10,2,'#c4aa6b');rect(xx+cw/2-5,yy+20,12,2,'#354e3d');}
      texture(xx+2,yy+2,cw-7,24,['#8e9870','#475f4d'],.12,4,row+col);
    }
  }
  function fern(x,y,size=1,bloom=false){
    shadow(x,y+10,18*size,4);polygon([[x-14*size,y-3],[x+14*size,y-3],[x+10*size,y+16*size],[x-10*size,y+16*size]],'#86664a');rect(x-16*size,y-5,32*size,5*size,'#a58b61');rect(x-12*size,y,4*size,13*size,'#b19566');rect(x+8*size,y,3*size,13*size,'#624f39');
    line(x,y-3,x,y-48*size,'#91a36c',2);
    for(let i=0;i<7;i++){const dir=i%2?-1:1,yy=y-9*size-i*5*size,xx=x+dir*(16+i%3*5)*size;polygon([[x,yy+4*size],[xx,yy-10*size],[xx-dir*4*size,yy+1*size],[x,yy+7*size]],i%3?'#557e59':'#799765');line(x,yy+4*size,xx-dir*3*size,yy-4*size,'#9aaf74');rect(xx-dir*2*size,yy-9*size,3*size,2*size,'#a2af78');}
    if(bloom){for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ellipse(x+Math.cos(a)*10,y-50*size+Math.sin(a)*7,6,4,'#e3c587');}ellipse(x,y-50*size,5,4,'#b99557');rect(x-1,y-52*size,3,2,'#f0dfac');}
    else{ellipse(x,y-50*size,5*size,8*size,'#8f9b68');line(x,y-57*size,x+2,y-45*size,'#bac28b');}
  }
  function digits(value,x,y,color='#d3d4a8',scale=1){const glyphs={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};[...String(value)].forEach((ch,i)=>glyphs[ch]?.forEach((row,yy)=>[...row].forEach((v,xx)=>{if(v==='1')rect(x+i*4*scale+xx*scale,y+yy*scale,scale,scale,color);})))}
  return {c,rect,line,polygon,ellipse,hash,texture,frame,shadow,glow,paper,table,book,lamp,pipe,gauge,gear,clock,cabinet,fern,digits};
}

export function harbor(p,x,y,w,h,dawn=false,frame=0){
  const {rect:r,polygon:poly,line:l,ellipse:e}=p;
  p.c.save();p.c.beginPath();p.c.rect(x,y,w,h);p.c.clip();
  const sky=dawn?['#b6c9b8','#ccd0b3','#dfd5ae','#e6d4a6']:['#132b3d','#1e3e4d','#2e5157','#426764'];
  for(let i=0;i<4;i++)r(x,y+i*h*.17,w,h*.18,sky[i]);
  for(let i=0;i<7;i++){const xx=x+(i*43)%(w+30)-15,yy=y+13+(i*11)%Math.max(14,h*.24);r(xx,yy,18+i%3*7,2,dawn?'#e3ddbe':'#365461');r(xx+7,yy-2,17,2,dawn?'#dae0c4':'#2e4c5c');}
  if(w>90){e(x+w*.79,y+h*.22,dawn?13:9,dawn?13:9,dawn?'#f0dfad':'#8da9a0');if(!dawn)e(x+w*.79-4,y+h*.22-3,8,8,'#213e4f');}
  const shore=y+h*.64;
  for(let i=0;i<Math.ceil(w/12);i++){const xx=x+i*16-6,hh=7+(i*13)%23;r(xx,shore-hh,13,hh+4,dawn?'#527c7b':'#193d47');poly([[xx-2,shore-hh],[xx+6,shore-hh-6],[xx+15,shore-hh]],dawn?'#496e72':'#16323e');if(i%3===0){r(xx+4,shore-hh+5,2,3,dawn?'#a6b7a0':'#b69e68');r(xx+9,shore-hh+5,2,3,dawn?'#a6b7a0':'#82957a');}}
  if(w>120){const xx=x+w*.23;l(xx,shore,xx,shore-h*.34,dawn?'#486d71':'#213e46',2);l(xx-14,shore-h*.28,xx+35,shore-h*.4,dawn?'#486d71':'#213e46',2);l(xx+28,shore-h*.38,xx+28,shore-h*.15,'#426364');}
  r(x,shore+4,w,h*.4,dawn?'#83a5a0':'#274b54');
  for(let i=0;i<Math.ceil(w*h/180);i++){const yy=shore+7+(i*11)%Math.max(10,Math.floor(h*.32)),xx=x+(i*37+frame)%w;r(xx,yy,2+i%7,1,dawn?(i%3?'#a8c0ad':'#d3d3aa'):(i%3?'#3a6264':'#68857a'));}
  if(!dawn)for(let i=0;i<Math.ceil(w/7);i++){const xx=x+(i*37)%w,yy=y+(i*19+frame*3)%h;l(xx,yy,xx-2,yy+6,'rgba(125,168,175,.23)');}
  p.c.restore();
}

export function windowFrame(p,x,y,w,h,dawn=false,frame=0){
  p.frame(x-7,y-8,w+14,h+19,'#536b60','#9ca58a','#213b36');harbor(p,x,y,w,h,dawn,frame);
  p.rect(x-2,y-2,w+4,3,'#253f3d');p.rect(x-2,y,w+2,2,'#869e8b');
  for(const xx of[x+w*.5]){p.rect(xx-3,y,6,h,'#3c5b51');p.rect(xx-2,y,1,h,'#92a78b');}
  p.rect(x,y+h*.52,w,4,'#3b5a50');p.rect(x,y+h*.52,w,1,'#a0ad8c');
  p.line(x+7,y+4,x+7,y+h*.45,'rgba(192,218,190,.3)');p.line(x+w-10,y+h*.57,x+w-10,y+h-6,'rgba(192,218,190,.2)');
  p.rect(x-10,y+h+4,w+20,4,'#a6ac87');p.rect(x-10,y+h+8,w+20,4,'#40574b');p.rect(x-5,y+h+12,w+10,4,'#172f2c');
}

export function protagonist(p,x=311,y=290,frame=0){
  const r=p.rect,poly=p.polygon;
  p.shadow(x+5,y+41,23,5);
  // Coat, separate legs, a turned face and a brass-bound field notebook.
  r(x-6,y+29,9,15,'#263e42');r(x+9,y+29,9,15,'#1b333a');r(x-7,y+42,12,4,'#152c34');r(x+8,y+42,15,4,'#152c34');r(x-5,y+42,8,1,'#6b8277');
  poly([[x-9,y+2],[x+12,y],[x+20,y+15],[x+17,y+32],[x-10,y+32]],'#607f6e');r(x-8,y+5,4,22,'#97a78a');r(x+12,y+7,6,22,'#3c6156');r(x-5,y+9,14,1,'#bac09c');r(x+4,y+6,2,24,'#8ba28a');r(x-7,y+27,20,3,'#78947a');r(x-4,y+15,8,9,'#486f60');r(x-3,y+16,6,1,'#b3b791');
  poly([[x-6,y+1],[x-1,y-2],[x+4,y+6],[x-1,y+11]],'#c1c5a0');poly([[x+8,y-2],[x+14,y+1],[x+7,y+11],[x+4,y+6]],'#a1b392');
  r(x-4,y-19,20,18,'#b99f7c');r(x-3,y-18,17,12,'#d5bd94');r(x+14,y-12,4,4,'#cfb48d');r(x+14,y-10,2,1,'#ead4a6');r(x+1,y-1,9,4,'#9a9775');
  poly([[x-6,y-24],[x+10,y-25],[x+18,y-19],[x+16,y-15],[x+6,y-17],[x+3,y-11],[x-4,y-12]],'#273d3c');r(x-5,y-20,5,9,'#203735');r(x-1,y-23,11,2,'#536457');r(x+3,y-22,10,1,'#71806a');r(x+11,y-13,3,1,'#3b5145');if(frame%38!==34)r(x+12,y-11,2,2,'#293d37');r(x+8,y-2,5,1,'#b8a17e');
  r(x-13,y+10,7,17,'#658574');r(x-13,y+12,2,12,'#9aab8b');r(x-12,y+26,6,6,'#c3ad84');r(x+17,y+14,5,13,'#385e53');r(x+17,y+26,5,5,'#b7a27c');
  p.book(x-13,y+19,15,17,'#ad8e55');r(x-10,y+22,8,1,'#e7ce94');r(x-8,y+25,6,1,'#d0c297');r(x-14,y+26,4,4,'#d3b98f');
}
