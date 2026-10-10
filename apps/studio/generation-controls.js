export function schemaShape(s={}) {return s.anyOf?.find(v=>v.type!=='null')||s.oneOf?.find(v=>v.type!=='null')||s;}
export function audioCapabilities(model) {
 const p=model.schema?.properties||{};
 if(p.lyrics||p.lyrics_prompt)return {song:true,lyricsKey:p.lyrics?'lyrics':'lyrics_prompt',styleKey:p.tags?'tags':'prompt',instrumental:!!p.lyrics,description:p.duration?'Songs or instrumentals with your lyrics, music style and requested duration.':'Songs with your lyrics and music style. This model chooses the length; it has no duration control.'};
 if(p.text&&p.voice)return {speech:true,description:'Speech from your text. Choose a voice; length follows the text and speaking speed. Singing and song lyrics are not supported.'};
 return {description:'Instrumental audio and sound effects. This model has no dedicated lyrics or singer controls; choose ACE-Step or MiniMax Music for songs.'};
}
export function musicStyle(style,{vocal='',exclude=''}={},maxLength=10000) {
 const vocalTags={female:'female vocals',male:'male vocals',duet:'male and female duet'};
 const result=[style.trim(),vocalTags[vocal],exclude.trim()?'without '+exclude.trim():''].filter(Boolean).join(', ');
 if(result.length>maxLength)throw Error('Keep the music style, vocal preference and exclusions together under '+maxLength+' characters for this model.');
 return result;
}
