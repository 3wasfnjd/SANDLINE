const paths:Record<string,string>={
 rifle:'M4 16 18 6l3 1-3 3-3 1-2 5-3 1 1-4-5 5zm9-8 2-2 2 1',
 assault:'m13 2-8 11h6l-1 9 9-13h-6z',
 mg:'M3 10h16v4H8l-3 4H2l3-7m10 3 3 7m0-10 3-4M9 7h7',
 at:'m5 18 12-12 3 3L8 21zm10-10 2-5 4-1-1 4m-8 8-1 5m-6-7 5 1',
 vehicle:'M3 9h18v9H3zm3 0 2-4h8l2 4M4 18v3m5-3v3m6-3v3m5-3v3M11 6V3h9',
 retreat:'M9 5 3 11l6 6M4 11h10a6 6 0 0 1 6 6v3',
 hold:'M12 2 4 5v7c0 5 8 10 8 10s8-5 8-10V5zm0 5v9m-4-5h8',
 rally:'M12 3v18M4 8l8-5 8 5M5 14l7-5 7 5',
 select:'M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M9 9h6v6H9z',
 sound:'M3 9h4l5-5v16l-5-5H3zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
 mute:'M3 9h4l5-5v16l-5-5H3zm13 0 6 6m0-6-6 6',
 pause:'M8 4v16M16 4v16',play:'m8 4 12 8-12 8z',
 close:'m6 6 12 12M6 18 18 6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4v.1',
 home:'m3 11 9-8 9 8M6 10v11h12V10',
 chevron:'m9 5 7 7-7 7',compass:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
 flag:'M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0',
 restart:'M4 8a9 9 0 1 1-1 8M4 3v6h6',zoom:'M4 12h16M12 4v16'
};
export const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.rifle}"/></svg>`;
