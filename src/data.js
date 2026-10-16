export const tracks = [
 {id:'1',title:'Midnight City',artist:'The Midnight Collective',album:'After Hours',duration:48,art:'night',category:'Electronic',seed:0},
 {id:'2',title:'Slow Motion',artist:'Luna Park',album:'Soft Focus',duration:44,art:'bloom',category:'Chill',seed:1},
 {id:'3',title:'Golden',artist:'Sol & The Satellites',album:'Golden Hour',duration:52,art:'sun',category:'Indie',seed:2},
 {id:'4',title:'Somewhere, Someday',artist:'Coastline',album:'Ocean Drive',duration:40,art:'ocean',category:'Chill',seed:3},
 {id:'5',title:'Into the Blue',artist:'Nova Echo',album:'Blue Notes',duration:48,art:'blue',category:'Electronic',seed:4},
 {id:'6',title:'Nothing But Time',artist:'Sunday Service',album:'Easy Days',duration:44,art:'desert',category:'Indie',seed:5},
 {id:'7',title:'City Lights',artist:'The Midnight Collective',album:'After Hours',duration:48,art:'night',category:'Electronic',seed:6},
 {id:'8',title:'Paper Planes',artist:'Luna Park',album:'Soft Focus',duration:44,art:'bloom',category:'Chill',seed:7},
];
export const mixes = [
 {id:'night',name:'After Hours',subtitle:'For the nights that feel like a movie.',art:'night',tag:'TSPOT ORIGINAL',ids:['1','7','5','2']},
 {id:'bloom',name:'Soft Focus',subtitle:'A little less noise. A little more you.',art:'bloom',tag:'DAILY MIX 01',ids:['2','8','4']},
 {id:'sun',name:'Golden Hour',subtitle:'Good energy, on repeat.',art:'sun',tag:'MADE FOR YOU',ids:['3','6','4']},
 {id:'ocean',name:'Ocean Drive',subtitle:'Windows down. Volume up.',art:'ocean',tag:'DAILY MIX 02',ids:['4','3','5']},
 {id:'blue',name:'Blue Notes',subtitle:'Get lost in the right direction.',art:'blue',tag:'FRESH FINDS',ids:['5','1','7']},
 {id:'desert',name:'Easy Days',subtitle:'Take the scenic route.',art:'desert',tag:'WEEKEND ROTATION',ids:['6','3','2']},
];
export const fmt = n => `${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
