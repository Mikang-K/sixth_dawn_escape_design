import { PREFIX } from './content.js';
import { painter, harbor, windowFrame, protagonist } from './pixel-art.js';

const PALE='#e3d1a3',BRASS='#bca16a',DARK='#112831';

function roomShell(p,room){
  const r=p.rect;
  const walls={reception:'#314a49',hall:'#324b45',archive:'#3c5149',greenhouse:'#264e45',observatory:'#243a4d',theater:'#40333a',postoffice:'#3a5448',clockwork:'#3d5043',exit:'#2d4647',ending:'#7b9b8a'};
  r(0,0,640,360,'#11262f');r(8,34,624,220,walls[room]||walls.reception);
  p.texture(20,43,600,180,['#486055','#263f40','#536951'],.065,4,2);
  r(9,26,622,8,'#182d32');r(12,34,616,3,'#7f8b6b');r(14,38,612,3,'#4e6a57');r(16,42,608,2,'#1e3938');
  r(15,178,610,74,'#2c443e');
  for(let i=0;i<9;i++){const x=18+i*68;r(x,181,64,68,'#253d38');r(x+3,184,58,62,'#3b5546');r(x+5,186,54,1,'#647654');r(x+5,186,1,58,'#526c4e');r(x+59,187,2,59,'#1f3934');p.texture(x+7,191,49,45,['#48634c','#314f41'],.12,5,i);}
  r(14,175,612,3,'#828564');r(14,179,612,2,'#172f30');r(13,250,614,7,'#172d2d');r(13,250,614,1,'#7a8260');
  for(const x of[13,615]){r(x,43,12,208,'#1b3333');r(x+2,43,6,207,'#526c54');r(x+3,43,2,207,'#839071');r(x-2,47,16,5,'#7f8b67');r(x-3,241,18,9,'#7b8761');}
  const stone=['greenhouse','observatory','hall','exit'].includes(room);
  const bands=[255,264,278,297,323,360];
  for(let row=0;row<bands.length-1;row++){
    const y=bands[row],height=bands[row+1]-y,divisions=stone?7:6;
    for(let col=-1;col<divisions+1;col++){
      const width=640/divisions*(.75+row*.11),x=320+(col-divisions/2+(row%2)*.46)*width;
      const color=stone?['#354e48','#3b554b','#314a44','#40584c'][(row+col+8)%4]:['#4f5140','#55563f','#474d3c','#5c5941'][(row+col+8)%4];
      r(x,y,width-2,height-2,color);r(x,y,width-2,1,stone?'#63755c':'#8d7d52');r(x,y,1,height-2,stone?'#4b6652':'#796d49');
      p.texture(x+3,y+3,width-7,height-5,stone?['#556e55','#2c453f']:['#7e7750','#3b4b3b','#62684b'],.085,stone?4:3,row+col);
      if(!stone)for(let n=0;n<3;n++)r(x+6+n*17,y+4+(n*5)%(height-3),Math.min(12+n*7,width-14),1,'#71704d');
    }
  }
  r(0,257,640,3,'rgba(8,25,28,.28)');
  if(room==='reception'){
    p.polygon([[232,279],[405,279],[440,337],[195,337]],'#77664d');
    p.polygon([[235,282],[402,282],[433,333],[203,333]],'#a18d64');
    p.polygon([[240,286],[399,286],[425,329],[212,329]],'#646851');
    for(let i=0;i<9;i++){const x=225+i*21;p.line(x,320,x+6,327,'#a59c70');p.line(x+6,327,x+13,320,'#a59c70');}
    for(let i=0;i<20;i++)p.line(198+i*12,337,196+i*12,341,'#bab08a');
  }
}

function envelope(p,x,y,w=28,h=17,sealed=false){
  p.rect(x+2,y+2,w,h,'#1a3032');p.rect(x,y,w,h,'#d5c59e');p.line(x,y,x+w/2,y+h*.56,'#a29873');p.line(x+w,y,x+w/2,y+h*.56,'#a29873');p.line(x,y+h,x+w*.4,y+h*.6,'#c0b28b');
  if(sealed){p.ellipse(x+w*.5,y+h*.55,3,3,'#a06a51');p.rect(x+w*.5-1,y+h*.55-1,2,1,'#dfb57d');}
}
function valve(p,x,y,on=false){p.ellipse(x+1,y+2,9,9,'#1d3e36');p.ellipse(x,y,8,8,on?'#beaa70':'#82916a');p.ellipse(x,y,5,5,'#244b3c');p.line(x-7,y,x+7,y,on?'#e3ca8e':'#b1af7c',2);p.line(x,y-7,x,y+7,on?'#e3ca8e':'#b1af7c',2);p.rect(x-1,y-1,3,3,'#e0c48b');}
function wallSconce(p,x,y,on=true){
  p.rect(x-6,y+5,12,27,'#243f37');p.rect(x-4,y+7,8,22,'#807c51');p.line(x,y+20,x+10,y+7,BRASS,2);p.ellipse(x+9,y+2,9,5,'#415f45');p.rect(x+1,y-8,16,12,on?'#ddc285':'#6a7855');p.rect(x+1,y-8,16,2,'#9f955f');p.rect(x+4,y-6,2,7,on?'#f1dfab':'#8e9b73');p.line(x+1,y+4,x+17,y+4,'#4e6949',2);
}
function bookStack(p,x,y,seed=0){for(let i=0;i<4;i++)p.book(x+(i%2)*3,y-i*7,31+(i*13+seed)%18,6,['#627961','#7f7453','#486f69','#9a8659'][(i+seed)%4],true);}

function reception(p,s,frame){
  const r=p.rect,solved=id=>s.solved.includes(id);
  windowFrame(p,38,62,128,132,false,frame);p.polygon([[43,198],[168,198],[235,281],[18,281]],'rgba(119,165,149,.07)');
  p.pipe([[26,232],[176,232],[176,251]],false,4);for(let i=0;i<11;i++){r(29+i*12,227,7,24,'#4d6652');r(30+i*12,228,2,21,'#819071');}
  p.table(222,205,207,83);p.paper(261,185,45,25,true);p.paper(309,194,35,16);p.lamp(393,174);
  p.frame(218,110,119,76,'#62765a','#a3aa7d','#2f4e3e');r(227,120,100,53,'#25433b');
  for(let i=0;i<3;i++){const x=235+i*31;p.frame(x,130,21,30,'#7d8b66','#b5b18a','#193f37');r(x+4,134,12,20,solved('P00-1')?'#c8b578':'#294d43');if(i===0)p.ellipse(x+10,144,3,3,PALE);if(i===1)p.polygon([[x+10,140],[x+6,147],[x+15,147]],PALE);if(i===2)r(x+7,141,7,7,PALE);r(x+9,160,3,4,solved('P00-1')?'#edd89c':'#7b8f6c');}
  p.pipe([[228,186],[228,196],[349,196],[349,249]],solved('P00-1'),3);
  p.rect(340,192,17,10,'#233d39');p.ellipse(349,189,7,4,'#3c4d3c');p.ellipse(349,187,6,3,'#a18d60');p.line(347,182,353,168,'#cfb783');
  bookStack(p,226,196);p.paper(444,105,30,34,true);p.clock(396,82,25,.12);
  p.frame(488,55,108,204,'#4e6651','#a1a47a','#1b3a34');r(497,65,89,188,'#385744');
  for(let i=0;i<2;i++){p.frame(504,78+i*79,74,69,'#46614b','#7b9168','#253f35');r(510,84+i*79,62,55,'#2c4c3f');p.texture(513,88+i*79,56,46,['#547457','#3b5c47'],.18,5,i);}
  if(solved('P00-2')){p.polygon([[497,66],[534,76],[534,254],[497,254]],'#102c32');r(497,66,2,188,'#78997a');r(506,249,28,3,'#a6b085');}
  r(565,166,7,17,'#b8a06b');p.ellipse(569,172,4,3,'#d9c18a');if(solved('P00-2'))r(553,171,20,4,'#c8b27a');
  r(461,227,9,30,'#4c6951');p.line(465,224,465,124,'#5f7757',3);for(const y of[134,147,163]){p.line(465,y,452,y-9,'#6c805d',2);p.line(465,y,478,y-9,'#6c805d',2);}p.polygon([[451,141],[463,145],[462,204],[446,205]],'#4b6c62');r(451,146,3,49,'#739081');
  wallSconce(p,584,45);p.glow(390,169,113,81);p.glow(106,129,95,92,'132,183,168',.5);
}

function hall(p,s){
  const r=p.rect;
  for(let i=0;i<6;i++){
    const x=19+i*103,open=i<2?s.solved.includes('P00-2'):i<4?s.solved.includes('R1-3')&&s.solved.includes('R2-3'):s.solved.includes('R3-3')&&s.solved.includes('R4-3'),done=s.solved.includes(`R${i+1}-3`);
    p.shadow(x+38,260,45,8);p.ellipse(x+37,80,42,31,'#737c57');p.ellipse(x+37,80,38,27,'#b1a573');p.ellipse(x+37,81,35,25,'#3e5b47');p.frame(x-3,74,81,184,'#777a55','#b1a56e','#243c33');p.frame(x+4,82,67,169,'#425e49','#7b9569','#1e3d31');
    r(x+9,88,57,155,'#294c40');p.texture(x+10,90,54,149,['#41664a','#1e4039'],.17,4,i);r(x+34,88,2,154,'#1f3e34');r(x+34,88,1,154,'#62835c');
    p.frame(x+14,99,47,41,'#8b8b5d','#c2b481','#2f4f38');r(x+18,104,39,30,done?'#d2c38b':open?'#7d9c7b':'#445c49');
    // Six distinct transom motifs, not puzzle answers.
    const cx=x+37,cy=119;
    if(i===0){p.book(cx-11,cy-8,21,18,'#45674e');r(cx-1,cy-5,1,12,'#bac29a');}
    if(i===1){p.line(cx,cy+10,cx,cy-9,'#385b45',2);p.polygon([[cx,cy],[cx-10,cy-7],[cx-9,cy+1]],'#476c49');p.polygon([[cx,cy-5],[cx+10,cy-12],[cx+8,cy-2]],'#476c49');}
    if(i===2){p.line(cx-10,cy,cx+10,cy,'#42644d');p.line(cx,cy-10,cx,cy+10,'#42644d');p.line(cx-6,cy-6,cx+6,cy+6,'#42644d');p.line(cx-6,cy+6,cx+6,cy-6,'#42644d');}
    if(i===3){p.polygon([[cx-11,cy-8],[cx+11,cy-8],[cx+7,cy+6],[cx,cy+10],[cx-8,cy+6]],'#476a4d');r(cx-7,cy-2,4,2,'#a6b58a');r(cx+3,cy-2,4,2,'#a6b58a');}
    if(i===4)envelope(p,cx-11,cy-7,22,14);
    if(i===5)p.clock(cx,cy,12,.17);
    for(const y of[154,208]){p.frame(x+14,y,47,23,'#3d5b44','#729065','#244333');r(x+18,y+4,39,14,'#2b4b3b');}
    r(x+57,170,7,15,'#bb9e62');p.ellipse(x+58,176,3,3,'#e4cb8d');
    if(!open){for(let n=0;n<7;n++){const yy=159+n*4,xx=x+7+n*8;p.ellipse(xx,yy,5,3,'#7f8d70');p.ellipse(xx,yy,3,1,'#2b4539');}p.frame(x+28,179,20,24,'#7d8d64','#b1b18a','#314e3a');r(x+36,187,3,7,'#314a38');}
    if(done){p.frame(x+20,216,35,15,'#b5a16a','#ead194','#69764b');p.line(x+27,223,x+32,227,'#3c6246',2);p.line(x+32,227,x+43,219,'#3c6246',2);}
    p.pipe([[x+37,259],[x+37,294+i%3*8],[319,294+i%3*8]],done,3);
    for(const px of[x-7,x+78]){r(px,67,5,192,'#728969');r(px,68,1,191,'#abb18a');r(px-3,62,11,8,'#a39e70');r(px-3,251,11,8,'#939b72');}
    if(open)p.glow(cx,168,47,99,'190,193,130',.5);
  }
  p.frame(282,284,77,39,'#4a6650','#a9a477','#213f33');p.clock(320,292,25,s.solved.includes('R6-3')?.48:0);p.digits(6,316,326,'#bea66f');
  for(const x of[28,233,439])wallSconce(p,x,44);
  p.glow(320,199,215,145,'183,164,102',.6);
}

function archive(p,s,frame){
  const r=p.rect,restored=s.solved.includes('R1-3');
  p.cabinet(28,62,151,5,3);p.table(24,235,171,62);bookStack(p,36,226);p.paper(79,218,45,18,true);p.paper(130,220,45,18);p.line(123,224,149,212,'#81957a',2);
  windowFrame(p,202,61,69,108,false,frame);p.paper(199,187,38,33,true);r(209,184,3,5,'#c7ac74');
  p.table(270,217,147,67);p.frame(280,109,118,100,'#a29565','#d7c18a','#3d5845');r(288,117,102,83,'#bdb58b');
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){r(298+x*21,128+y*16,15,11,(x+y*3)%3?'#49694f':'#c7c09a');r(298+x*21,128+y*16,15,1,'#a9b28a');}
  p.line(292,121,380,195,'rgba(235,231,192,.19)');r(276,214,127,4,'#8c8357');p.lamp(406,195,s.solved.includes('R1-1'));
  p.cabinet(470,75,138,5,2);if(restored){r(479,185,118,27,'#203b32');p.paper(488,192,34,15,true);p.paper(530,192,45,15);r(479,211,118,4,'#b8ad7b');}
  bookStack(p,485,66,2);p.paper(541,56,35,17,true);
  p.pipe([[400,226],[445,226],[445,251],[493,251]],restored,3);
  for(let n=0;n<5;n++)p.paper(200+n*7,271+n%2*3,25,15,n===2);p.book(548,267,38,9,'#5d7661',true);p.book(551,257,35,9,'#8b7951',true);
  p.glow(334,161,151,108,'217,188,122',.7);p.glow(230,110,57,89,'138,182,170',.4);
}

function greenhouse(p,s,frame){
  const r=p.rect,drained=s.solved.includes('R2-2'),flower=s.solved.includes('R2-3');
  harbor(p,25,45,590,174,false,frame);
  for(let i=0;i<8;i++){const x=20+i*85;p.line(320,37,x,104,'#748d6b',5);p.line(320,37,x,104,'#b1b391');p.line(x,104,x,254,'#536f52',5);p.line(x-1,105,x-1,250,'#95a481');}
  for(const y of[105,154,205]){r(19,y,600,4,'#617d5a');r(19,y,600,1,'#a4af85');r(19,y+4,600,2,'#274c3e');}
  for(let n=0;n<22;n++){const x=31+(n*67)%579,y=57+(n*29)%145;r(x,y,1,7,'rgba(174,204,172,.32)');r(x-1,y+6,3,2,'rgba(145,184,158,.31)');}
  for(let n=0;n<8;n++){const x=39+n*78;p.line(x,42,x+5,75+n%3*8,'#7e9863');for(let i=0;i<5;i++){const y=49+i*6;p.polygon([[x+3,y],[x-5,y-2],[x-3,y+5]],'#487a50');p.polygon([[x+3,y+3],[x+12,y],[x+8,y+8]],'#6d925e');}}
  p.fern(32,244,1.2);p.fern(600,247,1.6);p.fern(448,225,.65);p.fern(192,231,.7);
  p.table(27,213,159,70);p.frame(72,183,74,24,'#6b815b','#b5b98c','#31533d');r(106,132,4,58,'#8d9565');p.line(61,154,152,154,'#c6bd82',3);p.line(61,154,61,179,'#aab18a');p.line(151,154,151,179,'#aab18a');p.polygon([[44,178],[78,178],[72,187],[50,187]],'#a8a472');p.polygon([[134,178],[168,178],[161,187],[141,187]],'#a8a472');
  p.ellipse(60,172,6,5,'#c6b779');p.ellipse(151,172,6,5,'#82956c');p.gauge(109,139,10,.5);
  p.frame(233,111,164,119,'#5f7955','#a5b184','#315540');
  for(let i=0;i<4;i++){const x=243+i*36;p.frame(x,122,27,84,'#82916b','#bdc39a','#36583e');r(x+4,127,18,72,'#244b46');r(x+4,195-i*13,18,9+i*13,'#82b3a0');for(let n=0;n<4;n++)r(x+5,139+n*15,5,1,'#d0d5aa');r(x+5,128,1,65,'#c5d6b3');p.pipe([[x+13,207],[x+13,234],[i%2?419:215,234]],drained,3);valve(p,x+14,214,drained);}
  p.table(473,247,108,39);p.fern(527,222,1.9,flower);p.frame(578,151,30,66,'#607e59','#adb68b','#2c523c');p.gauge(593,171,11,flower?.86:.2);p.pipe([[593,211],[593,240],[570,240]],flower,4);
  const waterY=drained?326:280;
  r(9,waterY,622,360-waterY,'rgba(66,110,103,.59)');
  for(let n=0;n<75;n++){const x=15+(n*53+frame*(n%3))%606,y=waterY+3+(n*17)%Math.max(6,356-waterY);r(x,y,3+n%18,1,n%4?'#5b897d':'#9cb49a');if(n%7===0)r(x+4,y+2,4,1,'#315f59');}
  for(const x of[64,131,271,353,521,592]){r(x,waterY+6,4,Math.max(4,351-waterY),'rgba(173,188,139,.08)');r(x-4,waterY+15,9,1,'#8aa48a');}
  p.glow(324,128,240,135,'132,180,130',.6);if(flower)p.glow(528,157,59,68,'231,199,118',.7);
}

function observatory(p,s,frame){
  const r=p.rect,lit=s.solved.includes('R3-2'),restored=s.solved.includes('R3-3');
  p.ellipse(320,111,292,94,'#10283e');p.ellipse(320,109,279,85,'#203e55');
  for(let n=0;n<110;n++){const x=49+n*47%546,y=43+n*31%127;if(((x-320)/279)**2+((y-109)/85)**2<.92){r(x,y,n%17===0?2:1,n%17===0?2:1,n%5?'#a0b6b5':'#d6c79b');if(n%31===0){r(x-2,y,5,1,'#c0cbc1');r(x,y-2,1,5,'#c0cbc1');}}}
  p.ellipse(462,68,14,14,'#b0bfae');p.ellipse(455,64,13,13,'#203e55');
  for(let n=0;n<19;n++){const a=Math.PI+n*Math.PI/18;const x=320+286*Math.cos(a),y=137+108*Math.sin(a);p.line(x,y,x+8*Math.cos(a),y+8*Math.sin(a),'#6e8a7b',3);}
  p.line(173,44,206,166,'#536f73',3);p.line(464,44,433,166,'#536f73',3);p.line(320,24,320,159,'#657e7c',4);
  p.table(28,228,164,60);p.frame(43,115,132,106,'#5a7880','#aab9a0','#2b4d56');r(49,121,119,93,'#193b52');
  for(let i=0;i<5;i++){p.line(57+i*24,125,57+i*24,207,'#35596a');p.line(53,130+i*18,163,130+i*18,'#35596a');}
  const stars=[[66,151],[90,151],[90,171],[115,171],[139,137],[154,194]];for(const[x,y]of stars){p.line(x-2,y,x+2,y,'#d9d4ad');p.line(x,y-2,x,y+2,'#d9d4ad');}
  p.paper(37,220,37,17);p.book(139,218,41,9,'#728b7b',true);
  p.frame(263,105,123,129,'#6c816a','#c0b88a','#2d4f46');r(271,113,107,112,'#1b3c4d');
  for(let i=0;i<5;i++){p.line(279+i*20,119,279+i*20,219,'#315866');p.line(276,124+i*21,374,124+i*21,'#315866');}
  for(const[x,y]of[[294,145],[294,199],[352,199]]){p.ellipse(x,y,10,10,'#789b9c');p.line(x-5,y-5,x+5,y+5,'#cadac1',2);}
  if(lit){p.line(271,145,294,145,'#dfcf8b',2);p.line(294,145,294,199,'#dfcf8b',2);p.line(294,199,352,199,'#dfcf8b',2);p.line(352,199,352,113,'#dfcf8b',2);}
  for(let i=0;i<2;i++){const x=478+i*66;p.shadow(x+12,257,32,6);p.line(x+8,200,x+8,249,'#a39966',5);p.line(x+8,229,x-10,258,'#91a17d',3);p.line(x+8,229,x+30,258,'#91a17d',3);p.polygon([[x-12,176],[x+27,140],[x+44,158],[x+5,195]],'#7d9a91');p.polygon([[x-10,176],[x+27,141],[x+32,146],[x-5,184]],'#bac5a5');p.line(x-8,183,x+31,148,'#cdd4b5',2);p.polygon([[x+25,138],[x+35,140],[x+47,154],[x+45,160],[x+37,158],[x+24,145]],'#aaab7b');p.ellipse(x+34,149,6,7,lit?'#a4c8be':'#304f5e');p.gauge(x+6,202,9,restored?.5:.12);}
  p.paper(546,59,37,23,true);p.pipe([[386,215],[435,215],[435,250],[484,250]],lit,3);
  p.glow(324,159,143,115,'112,166,176',.7);p.glow(463,74,112,67,'130,168,189',.5);if(restored)p.glow(540,188,65,55,'214,200,135',.5);
}

function puppet(p,x,y,role,front){
  const r=p.rect,cloth=front?'#bf8c72':'#5d7c72';
  p.line(x,74,x,y,'#c4b99a');p.ellipse(x,y+1,7,7,'#c9b38a');
  if(role==='W'){p.polygon([[x-6,y-2],[x-7,y-12],[x-1,y-6]],'#bba779');p.polygon([[x+6,y-2],[x+8,y-12],[x+2,y-6]],'#bba779');}
  if(role==='B')p.polygon([[x+6,y-2],[x+13,y+1],[x+6,y+3]],'#cbb272');
  if(role==='F'){p.polygon([[x-6,y-2],[x-12,y-6],[x-12,y+7],[x-5,y+3]],'#92a28d');}
  if(role==='D'){p.line(x-5,y-4,x-10,y-13,'#d6c699',2);p.line(x+5,y-4,x+10,y-13,'#d6c699',2);p.line(x-8,y-10,x-14,y-10,'#d6c699');p.line(x+8,y-10,x+14,y-10,'#d6c699');}
  r(x+2,y-1,1,1,'#3a4e42');p.polygon([[x-7,y+9],[x+7,y+9],[x+11,y+30],[x-11,y+30]],cloth);r(x-5,y+11,2,17,front?'#e1bd91':'#91a28a');p.line(x-7,y+11,x-13,y+25,'#d2b58c',2);p.line(x+7,y+11,x+13,y+25,'#ad9775',2);p.line(x-4,y+31,x-6,y+43,'#d4b88b',2);p.line(x+4,y+31,x+6,y+43,'#b69d79',2);
}

function theater(p,s){
  const r=p.rect,aligned=s.solved.includes('R4-2'),done=s.solved.includes('R4-3');
  p.frame(26,56,588,202,'#735d45','#c0a273','#263c36');r(35,65,570,178,'#1d343d');
  p.polygon([[281,77],[350,77],[421,243],[213,243]],'rgba(197,187,140,.10)');
  for(let n=0;n<7;n++){const x=51+n*84;r(x,70,2,165,'#263c42');r(x+35,75,1,154,'#253b42');}
  const left=[[35,65],[134,65],[106,112],[85,157],[64,203],[58,244],[35,244]],right=left.map(([x,y])=>[640-x,y]);p.polygon(left,'#6b3d47');p.polygon(right,'#6b3d47');
  for(let n=0;n<8;n++){const x=39+n*11,h=171-n*17;r(x,66,5,h,n%2?'#8e5660':'#79434e');r(x+1,66,1,h-4,'#b77a72');r(640-x-5,66,5,h,n%2?'#8e5660':'#79434e');r(640-x-4,66,1,h-4,'#b77a72');}
  p.line(36,239,60,230,'#ccae74',3);p.line(604,239,580,230,'#ccae74',3);
  r(34,64,572,17,'#834d50');r(34,65,572,2,'#c48c72');r(34,79,572,3,'#ba9b65');for(let x=47;x<600;x+=22){p.polygon([[x,80],[x+11,87],[x+22,80]],'#c0a573');r(x+11,85,2,4,'#d7bd83');}
  r(29,244,582,12,'#a58a5a');r(29,244,582,2,'#d9b77c');r(36,256,568,11,'#715f44');r(43,268,553,7,'#485241');for(let x=42;x<606;x+=35)r(x,248,1,9,'#6e674a');
  const roles=s.solved.includes('R4-1')?['W','B','F','D']:['D','F','B','W'];roles.forEach((role,i)=>puppet(p,72+i*31,done&&[0,3].includes(i)?197:181,role,done&&[0,3].includes(i)));
  p.frame(264,109,113,123,'#a99668','#e0c38a','#4a6046');r(273,118,95,104,'#cbc49d');p.texture(278,122,84,93,['#e4d5af','#b4b28a'],.15,5);
  r(aligned?311:304,158,16,36,'#3d5d4e');r(303,147,32,20,'#3d5d4e');r(310,153,17,8,'#bfc29b');if(!aligned){r(312,159,8,14,'#cbc49d');r(343,182,9,12,'#456653');}else r(325,184,11,5,'#3d5d4e');
  p.frame(465,97,128,134,'#5e6f50','#aaa277','#304b3a');for(let i=0;i<4;i++){const x=481+i*29;p.gear(x,115,10,10,0,'#9e9465');p.line(x,126,x,201+(done&&i<3?7:0),'#c6b381');p.frame(x-7,196+(done&&i<3?7:0),16,25,'#82906b','#c1bd8c','#3e5c42');r(x-3,200+(done&&i<3?7:0),7,3,done&&i<3?'#dfc98d':'#627e57');}
  p.paper(538,51,38,22);for(let i=0;i<3;i++)r(548+i*5,61,2,3+i%2*3,'#6e7d59');
  for(let i=0;i<7;i++){p.ellipse(58+i*87,254,4,2,'#e1c085');p.glow(58+i*87,243,24,21,'235,188,107',.3);}
  for(let i=0;i<9;i++){const x=43+i*65;p.shadow(x+21,340,26,4);p.frame(x,309,43,29,'#533f45','#997063','#29373a');r(x+4,314,35,19,'#694b4e');r(x+6,315,2,17,'#98675e');}
  p.glow(316,166,127,103,'237,206,139',.5);
}

function postoffice(p,s){
  const r=p.rect,received=s.solved.includes('R5-2');
  p.cabinet(26,72,169,4,4,true);p.table(23,219,177,62);for(let i=0;i<5;i++)envelope(p,36+i*29,201+i%2*8,25,17,i%2===0);p.paper(164,209,24,11,true);
  p.pipe([[214,64],[239,64],[239,88],[400,88],[400,53],[575,53],[575,80]],received,7);
  p.frame(242,98,159,136,'#6c7d5a','#a4af83','#2c4e3b');
  for(let i=0;i<2;i++){const x=258+i*68;p.frame(x,111,55,63,'#445f49','#8e9d74','#1b4138');r(x+5,116,44,47,'#263f3c');r(x+10,123,35,21,'#a5b08c');p.digits(received?(i?42:43):41,x+20,129,'#365847',2);r(x+11,150,31,6,'#2a4c3c');p.frame(x+7,186,40,22,'#948b5c','#c1b789','#436047');r(x+15,192,24,3,received?'#d8c88b':'#4c6b4a');}
  p.gauge(322,73,17,received?.72:.23);p.pipe([[322,233],[322,249],[419,249]],received,4);envelope(p,289,229,30,17,true);
  p.frame(454,91,155,137,'#95885c','#d0bb83','#425e46');r(462,99,139,120,'#b9bd96');p.texture(465,102,130,112,['#d6ceab','#a4af88'],.18,5);
  const nodes={S:[475,159],A:[513,118],B:[513,198],C:[554,159],T:[588,159]};for(const[from,to]of[['S','A'],['S','B'],['A','C'],['A','T'],['B','C'],['B','T'],['C','T']])p.line(...nodes[from],...nodes[to],'#5d7a59',2);for(const[x,y]of Object.values(nodes)){p.ellipse(x,y,5,5,'#607e5b');p.ellipse(x-1,y-1,2,2,'#e0d29d');}
  p.frame(20,276,601,29,'#4e6954','#8a9d72','#233e35');for(let i=0;i<44;i++){const x=27+i*13;p.ellipse(x,290,3,10,'#243f39');p.line(x-1,282,x-1,297,'#718d67');}
  envelope(p,s.solved.includes('R5-3')?563:405,260,42,22,true);p.paper(214,53,22,29,true);p.book(59,60,43,9,'#567968',true);
  p.glow(320,157,151,108,'174,196,137',.6);wallSconce(p,430,75);p.glow(440,78,77,92,'225,190,115',.5);
}

function clockwork(p,s,frame){
  const r=p.rect,powered=s.solved.includes('R6-1'),timed=s.solved.includes('R6-2'),complete=s.solved.includes('R6-3');
  windowFrame(p,40,57,117,91,false,frame);p.table(24,227,178,65);p.frame(39,169,150,53,'#4f6548','#aaab79','#284a36');
  const centers=[[57,194,15,12],[88,190,19,18],[127,192,23,24],[171,194,27,36]];centers.forEach(([x,y,radius,teeth],i)=>p.gear(x,y,radius,teeth,powered?frame*.025*(i%2?-1:1):0,i%2?'#8b9a6a':'#baa36a'));p.paper(35,217,38,13);
  p.frame(240,71,163,173,'#536e4c','#b6b486','#234b38');r(248,79,147,155,'#35563d');p.texture(252,82,139,146,['#55774b','#2c4a37'],.17,5);p.clock(321,131,41,timed?29/60:.02);
  for(let i=0;i<3;i++){p.clock(272+i*48,206,18,timed?[2/3,1/4,4/5][i]:[.1,.5,.1][i],[3,4,5][i]);r(267+i*48,230,10,3,timed?'#cfbf7e':'#6d8556');}
  p.frame(460,86,153,154,'#546f4d','#a6aa7b','#2b4d38');r(468,95,137,136,'#365b41');
  const switches=[false,true,true,false,false,true];for(let i=0;i<6;i++){const x=484+i%3*44,y=139+Math.floor(i/3)*57;p.frame(x-7,y-11,18,31,'#7b885b','#b3b286','#294b39');r(x-3,y-5,9,20,'#1e4236');r(x-3,y+(complete&&switches[i]?-4:7),9,8,'#c1ad78');r(x-2,y+(complete&&switches[i]?-4:7),7,2,'#e4cf93');}
  for(let i=0;i<5;i++){p.ellipse(482+i*26,109,6,5,complete?'#e6cf8e':'#1f4435');p.rect(480+i*26,106,2,1,complete?'#fff0b3':'#6c8656');}
  p.pipe([[71,58],[71,43],[221,43],[221,250],[453,250],[453,219]],complete,4);
  for(const[x,y]of[[189,78],[440,57],[592,47]])p.gear(x,y,13,12,powered?frame*.01:0,'#76865b');p.gauge(435,171,16,complete?.5:.12);p.paper(545,51,35,25,true);
  p.glow(322,144,142,111,'207,188,109',.7);p.glow(104,190,85,61,'197,184,114',.4);
}

function exitRoom(p,s,frame){
  const r=p.rect,water=s.solved.includes('F-1'),light=s.solved.includes('F-2'),open=s.solved.includes('F-3');
  p.frame(242,46,156,212,'#687c58','#b0b184','#294c3e');p.frame(251,57,139,194,'#77916a','#bbc195','#31523f');
  r(262,67,118,180,'#294f43');p.texture(266,72,110,165,['#3e6751','#203f3a'],.19,4);
  if(open){harbor(p,263,68,115,179,true,frame);p.polygon([[263,68],[283,77],[283,247],[263,247]],'#274b40');p.line(283,77,283,246,'#9aac7a',2);p.polygon([[283,248],[375,248],[478,360],[162,360]],'rgba(228,213,153,.14)');}
  for(let i=0;i<3;i++){const done=s.solved.includes(`F-${i+1}`),x=done?370:338;p.frame(333,102+i*42,51,15,'#5f7951','#afb489','#294936');r(x,105+i*42,39,8,done?'#d2be82':'#8e9a6b');r(x,105+i*42,39,2,done?'#f0d99d':'#b2bd88');}
  p.table(31,236,166,49);p.pipe([[47,138],[47,127],[174,127],[174,238],[225,238],[225,257],[257,257]],water,6);
  for(let i=0;i<3;i++){const x=46+i*48;p.frame(x,145,32,82,'#7e9068','#c0cba1','#254f3e');r(x+5,152,22,66,'#1e4542');const amount=water?[2,1,1][i]:0;r(x+5,218-amount*17,22,amount*17,'#7cafa0');r(x+6,153,1,62,'#bed4b4');for(let n=0;n<4;n++)r(x+7,163+n*14,4,1,'#c1cba0');valve(p,x+16,232,water);}
  p.gauge(117,111,16,water?.7:.14);
  p.table(425,224,182,61);p.frame(435,107,70,92,'#7c8f6b','#c5c89b','#335740');r(442,114,56,76,'#284a4b');for(const[x,y]of[[454,136],[454,174],[485,174]]){p.ellipse(x,y,5,5,'#819e8e');p.line(x-3,y-3,x+3,y+3,'#dbe5c3',2);}if(light){p.line(440,136,454,136,'#e7d296',2);p.line(454,136,454,174,'#e7d296',2);p.line(454,174,485,174,'#e7d296',2);p.line(485,174,485,114,'#e7d296',2);}
  p.paper(517,165,49,34,true);p.paper(552,191,35,24,true);p.lamp(582,191);p.pipe([[499,194],[512,194],[512,249],[387,249]],light,4);p.paper(452,57,36,24);p.glow(582,190,81,70,'231,193,114',.7);if(open)p.glow(322,187,121,150,'239,216,145',.65);
}

function endingRoom(p,s,frame){
  const r=p.rect;
  windowFrame(p,179,49,283,182,true,frame);p.polygon([[185,241],[458,241],[578,360],[72,360]],'rgba(226,218,157,.13)');
  p.table(36,250,159,61);p.table(470,250,145,61);
  if(s.ending==='preserve'){
    for(let i=0;i<6;i++){p.book(44+i*24,214+i%2*3,20,33,['#809576','#7c805b','#7b9b8c'][i%3]);p.paper(47+i*24,219+i%2*3,13,15,false);}
    p.lamp(554,214);p.paper(491,238,39,15,true);p.glow(550,207,90,74,'231,199,117',.75);
  }else{for(let i=0;i<6;i++){const x=43+i*24;p.frame(x,220,20,27,'#7e9470','#b1bd91','#3b634a');envelope(p,x+3,224,14,11,false);}p.paper(511,229,62,23,true);r(553,219,3,13,'#6a8e73');p.ellipse(555,218,3,3,'#93ae85');}
  p.fern(113,234,.7);p.fern(598,244,.65);p.glow(320,161,243,170,'236,223,172',1.15);
  for(let i=0;i<30;i++){const x=195+(i*41)%245,y=236+(i*17)%100;if(x>200+(y-235)*-.8&&x<455+(y-235)*1.3)r(x,y,1,1,'rgba(238,225,176,.43)');}
}

export function drawScene(canvas,room,state,frame=0){
  const p=painter(canvas);roomShell(p,room);
  const renderers={reception,hall,archive,greenhouse,observatory,theater,postoffice,clockwork,exit:exitRoom,ending:endingRoom};
  renderers[room]?.(p,state,frame);
  if(!['hall','ending'].includes(room))protagonist(p,311,290,frame);
  // Stepped ambient occlusion: no blur or resampling of the pixel originals.
  for(let i=0;i<4;i++){p.rect(8+i*5,43,5,212,`rgba(5,21,28,${.17-i*.035})`);p.rect(627-i*5,43,5,212,`rgba(5,21,28,${.17-i*.035})`);}
  p.rect(8,344,624,4,'rgba(9,24,29,.08)');p.rect(8,348,624,4,'rgba(9,24,29,.16)');
  p.rect(0,0,8,360,'#0e2530');p.rect(632,0,8,360,'#0e2530');p.rect(0,352,640,8,'#0e2530');
}
