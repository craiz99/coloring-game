import type { Fills, Scene } from './model';

interface Region { id: string; tag: 'path' | 'ellipse' | 'rect'; attrs: string }
export interface Template { id: string; name: string; category: 'animals' | 'kpop' | 'minecraft'; regions: Region[]; details: string }
const p = (id: string, d: string): Region => ({ id, tag: 'path', attrs: `d="${d}"` });
const e = (id: string, cx: number, cy: number, rx: number, ry: number): Region => ({ id, tag: 'ellipse', attrs: `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"` });
const r = (id: string, x: number, y: number, width: number, height: number, radius = 0): Region => ({ id, tag: 'rect', attrs: `x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"` });
const line = (d: string) => `<path d="${d}" fill="none"/>`;
const dot = (x: number, y: number, radius = 4) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="#493551" stroke="none"/>`;
const smile = (x = 150, y = 157) => line(`M${x - 13} ${y} Q${x} ${y + 17} ${x + 13} ${y}`);
const animalFace = () => dot(113, 128, 5) + dot(187, 128, 5) + line('M141 151 L159 151 L150 159Z M150 160 Q136 179 126 164 M150 160 Q164 179 174 164');
const cat: Template = {
  id: 'cat', name: 'Cat', category: 'animals',
  regions: [p('tail', 'M197 223 Q255 237 248 186 Q246 170 232 172 Q219 176 228 193 Q233 210 203 202Z'), p('body', 'M106 191 Q71 224 75 283 Q75 310 109 310 L190 310 Q220 308 217 278 Q214 226 194 194Z'), p('head', 'M64 115 L67 44 Q69 29 83 39 L118 66 Q151 55 182 68 L218 38 Q230 29 233 47 L237 121 Q243 182 198 199 Q149 219 102 199 Q55 182 64 115Z'), p('ear-left', 'M80 87 L81 54 L105 77Z'), p('ear-right', 'M197 79 L219 55 L222 91Z'), p('belly', 'M117 237 Q149 215 180 237 L184 280 Q150 293 114 280Z')],
  details: line('M92 131 Q103 120 113 131 M185 131 Q197 120 207 131 M140 151 Q150 146 160 151 L150 160Z M150 162 Q140 178 128 166 M150 162 Q163 177 174 166 M92 157 L55 150 M94 170 L55 177 M205 157 L244 150 M205 170 L244 177 M110 307 L110 282 M180 307 L180 282'),
};
const panda: Template = {
  id: 'panda', name: 'Panda', category: 'animals',
  regions: [e('left-ear', 83, 70, 28, 30), e('right-ear', 217, 70, 28, 30), e('body', 150, 237, 72, 73), e('left-arm', 80, 232, 26, 43), e('right-arm', 220, 232, 26, 43), e('left-foot', 101, 298, 32, 22), e('right-foot', 199, 298, 32, 22), e('head', 150, 126, 90, 77), e('left-patch', 113, 124, 24, 30), e('right-patch', 187, 124, 24, 30), e('belly', 150, 245, 40, 43)],
  details: animalFace() + line('M88 298 L88 303 M100 296 L100 304 M112 298 L112 303 M187 298 L187 303 M199 296 L199 304 M211 298 L211 303'),
};
const quokka: Template = {
  id: 'quokka', name: 'Quokka', category: 'animals',
  regions: [p('tail', 'M193 264 Q258 285 238 306 Q221 318 215 304 Q232 294 188 287Z'), e('body', 150, 241, 65, 72), e('ear-left', 88, 77, 25, 35), e('ear-right', 211, 77, 25, 35), e('ear-inner-left', 88, 78, 12, 21), e('ear-inner-right', 211, 78, 12, 21), p('head', 'M78 108 Q93 68 150 72 Q210 70 226 117 Q246 178 190 203 Q150 220 110 202 Q58 176 78 108Z'), e('muzzle', 150, 164, 51, 33), e('nose', 150, 148, 15, 10), e('belly', 150, 249, 36, 42), e('left-foot', 105, 305, 29, 14), e('right-foot', 195, 305, 29, 14)],
  details: dot(112, 126, 5) + dot(188, 126, 5) + line('M116 162 Q150 198 184 162 M150 159 L150 173 M103 227 L117 251 M197 227 L183 251'),
};
const puppy: Template = {
  id: 'puppy', name: 'Puppy', category: 'animals',
  regions: [p('tail', 'M201 242 Q240 216 241 242 Q240 260 205 270Z'), e('body', 150, 245, 64, 66), p('left-ear', 'M85 83 Q50 69 46 125 Q37 177 63 182 Q88 180 101 122Z'), p('right-ear', 'M215 83 Q250 69 254 125 Q263 177 237 182 Q212 180 199 122Z'), e('head', 150, 126, 77, 76), e('eye-patch', 113, 119, 23, 29), e('muzzle', 150, 160, 37, 26), e('nose', 150, 149, 15, 10), p('collar', 'M101 194 Q150 214 200 194 L198 211 Q151 231 102 211Z'), e('tag', 150, 220, 12, 13), e('left-foot', 107, 304, 29, 15), e('right-foot', 193, 304, 29, 15)],
  details: dot(114, 122, 5) + dot(187, 122, 5) + line('M150 159 Q135 179 124 163 M150 159 Q165 179 176 163 M119 277 L119 303 M181 277 L181 303'),
};
const rabbit: Template = {
  id: 'rabbit', name: 'Rabbit', category: 'animals',
  regions: [e('ear-left', 112, 74, 24, 63), e('ear-right', 185, 74, 24, 63), e('inner-left', 112, 73, 11, 44), e('inner-right', 185, 73, 11, 44), e('tail', 216, 265, 25, 25), e('body', 150, 252, 65, 62), e('head', 150, 161, 78, 67), e('belly', 150, 251, 34, 38), e('left-foot', 103, 308, 34, 13), e('right-foot', 197, 308, 34, 13), r('teeth', 140, 188, 20, 17, 3)],
  details: dot(117, 158, 5) + dot(183, 158, 5) + line('M141 179 L159 179 L150 186Z M150 186 L150 201 M126 184 Q150 199 174 184 M108 180 L80 174 M109 190 L78 194 M192 180 L220 174 M191 190 L222 194 M114 240 L122 262 M186 240 L178 262'),
};
const fox: Template = {
  id: 'fox', name: 'Fox', category: 'animals',
  regions: [p('tail', 'M183 267 Q244 278 247 220 Q247 183 274 176 Q284 261 246 298 Q217 321 181 294Z'), p('tail-tip', 'M247 220 Q247 183 274 176 Q281 220 268 249 L254 243 L246 252 L239 243Z'), p('body', 'M116 186 Q90 220 94 283 Q96 308 121 311 L180 311 Q206 309 207 282 Q210 226 184 186Z'), p('head', 'M72 117 L61 37 L114 77 Q151 61 188 77 L241 37 L229 117 Q240 162 150 206 Q60 163 72 117Z'), p('inner-left', 'M78 91 L74 58 L105 87Z'), p('inner-right', 'M195 87 L227 58 L222 93Z'), p('muzzle', 'M77 139 Q114 137 150 172 Q185 138 224 139 Q208 176 150 206 Q94 177 77 139Z'), p('chest', 'M124 211 L150 225 L177 211 L169 269 L150 289 L130 269Z')],
  details: dot(111, 124, 5) + dot(189, 124, 5) + line('M139 173 L161 173 L150 184Z M150 184 L150 192 M119 307 L119 281 M181 307 L181 281'),
};

function human(id: string, name: string, hair: Region[], outfit: Region[], details = '', back: Region[] = []): Template {
  return { id, name, category: 'kpop', regions: [...back,
    p('left-leg', 'M118 248 L145 248 L142 302 L116 302Z'), p('right-leg', 'M155 248 L182 248 L184 302 L158 302Z'),
    p('left-shoe', 'M115 295 L143 295 L143 320 L103 320 Q100 309 115 305Z'), p('right-shoe', 'M157 295 L184 295 L185 305 Q202 310 198 320 L157 320Z'),
    p('neck', 'M136 143 L164 143 L165 174 L135 174Z'),
    p('left-hand', 'M107 211 L98 234 Q87 243 82 231 L89 209Z'), p('right-hand', 'M194 211 L202 231 Q211 243 218 231 L210 209Z'),
    ...outfit,
    p('face', 'M104 83 Q112 54 150 56 Q191 54 199 87 L194 122 Q190 151 151 162 Q114 153 106 128Z'),
    ...hair,
  ], details: (id === 'mystery' ? '' : line('M116 112 Q126 105 135 111 M165 111 Q175 104 184 111') + dot(126, 115, 3.5) + dot(175, 115, 3.5)) + line('M148 124 L145 132 L153 132') + smile(150, 140) + details };
}
const standardPants = [p('pants', 'M115 221 L185 221 L182 271 L155 271 L150 244 L145 271 L116 271Z')];
const jacket = [p('shirt', 'M123 169 L176 169 L182 224 L116 224Z'), p('left-jacket', 'M131 165 L105 174 L82 213 L101 225 L118 201 L118 229 L143 229 L140 188Z'), p('right-jacket', 'M166 165 L195 174 L219 213 L200 225 L182 201 L183 229 L157 229 L161 187Z'), p('left-lapel', 'M131 165 L145 186 L130 199 L121 179Z'), p('right-lapel', 'M166 165 L156 186 L170 198 L181 179Z')];
const rumi = human('rumi', 'Rumi', [p('hair', 'M100 108 Q86 50 123 43 Q155 17 186 50 Q214 73 197 115 L183 81 Q150 85 140 61 Q119 92 103 96Z'), p('ponytail', 'M110 49 Q72 38 73 65 L84 88 L103 70Z')], [...standardPants, ...jacket], line('M109 70 Q126 52 144 50 M147 42 Q174 42 187 64 M126 213 L138 210 M166 210 L179 213 M149 225 L149 237') + `<circle cx="108" cy="132" r="5" fill="none"/><circle cx="193" cy="132" r="5" fill="none"/>`, [
  ...Array.from({ length: 7 }, (_, i) => p(`braid-${i}`, `M${83 - i * 2} ${70 + i * 30} Q${55 - i * 2} ${76 + i * 30} ${63 - i * 2} ${99 + i * 30} Q${80 - i * 2} ${112 + i * 30} ${93 - i * 2} ${95 + i * 30} Q${106 - i * 2} ${77 + i * 30} ${83 - i * 2} ${70 + i * 30}Z`)),
  p('braid-tie', 'M48 281 L74 284 L70 295 L49 292Z'), p('braid-end', 'M52 294 Q42 311 44 322 Q63 321 70 296Z'),
]);
const mira = human('mira', 'Mira', [p('hair', 'M100 114 Q89 74 103 51 Q124 29 150 47 Q185 23 200 59 L201 113 L184 78 L152 66 L119 81Z'), p('left-pony', 'M108 53 Q80 36 70 57 L83 111 L99 97Z'), p('right-pony', 'M193 54 Q220 36 230 57 L218 110 L202 96Z')], [p('top', 'M125 165 L174 165 L186 207 L115 207Z'), p('left-sleeve', 'M125 169 L106 173 L89 209 L105 217 L121 191Z'), p('right-sleeve', 'M174 168 L195 173 L213 210 L197 216 L181 190Z'), p('skirt', 'M116 220 L184 220 L195 258 L105 258Z'), p('belt', 'M116 215 L184 215 L186 226 L114 226Z')], line('M123 230 L118 254 M139 231 L137 254 M160 231 L162 254 M177 230 L184 254 M116 103 L133 100 M166 100 L184 103 M135 181 L165 181'), [p('long-hair', 'M92 82 Q70 166 78 275 L103 286 L99 245 L116 271 L117 105Z'), p('long-hair-right', 'M201 82 Q228 168 220 279 L199 288 L199 245 L185 269 L185 102Z')]);
const zoey = human('zoey', 'Zoey', [e('bun-left', 105, 52, 23, 24), e('bun-right', 195, 52, 23, 24), p('hair', 'M100 111 Q86 60 121 48 Q158 31 187 55 Q208 75 199 112 L186 91 L180 71 L169 98 L157 74 L147 97 L133 76 L119 99 L111 83Z')], [p('tee', 'M121 165 L177 165 L204 185 L190 208 L181 202 L184 226 L115 226 L118 202 L107 209 L92 187Z'), p('shorts', 'M116 226 L185 226 L187 263 L157 263 L150 247 L143 263 L113 263Z'), p('socks-left', 'M117 279 L143 279 L142 300 L116 300Z'), p('socks-right', 'M158 279 L183 279 L184 300 L158 300Z')], line('M132 183 L150 201 L169 183 M129 215 L169 215 M122 287 L137 287 M163 287 L178 287 M107 48 L114 58 M188 53 L200 44'));
const jinu = human('jinu', 'Jinu', [p('hair', 'M101 112 Q88 73 111 51 Q130 34 151 47 Q177 28 195 54 Q211 79 198 110 L181 85 Q158 84 151 58 Q144 84 113 87Z')], [...standardPants, p('undershirt', 'M127 167 L174 167 L178 226 L121 226Z'), p('left-shirt', 'M129 165 L105 175 L86 217 L104 226 L117 199 L114 232 L140 232 L139 188Z'), p('right-shirt', 'M172 165 L195 175 L215 217 L197 226 L182 199 L186 232 L159 232 L160 188Z'), p('collar-left', 'M129 165 L145 179 L134 191 L121 177Z'), p('collar-right', 'M172 165 L156 179 L167 191 L181 178Z')], line('M110 181 L133 183 M105 195 L137 197 M115 213 L138 216 M169 182 L192 184 M163 197 L201 200 M162 215 L184 218 M143 174 Q151 188 160 174 M137 199 L137 222 M166 199 L166 221'));
const romance = human('romance', 'Romance', [p('heart-hair', 'M98 116 Q82 86 98 55 Q120 28 149 57 Q175 28 199 52 Q220 82 203 118 L183 102 Q166 88 150 77 Q135 92 118 99Z')], [...standardPants, p('sweater', 'M125 166 L175 166 L196 178 L217 216 L198 228 L181 202 L185 231 L115 231 L118 201 L102 228 L82 216 L104 178Z'), p('collar', 'M131 164 L150 180 L169 164 L171 177 L150 191 L129 178Z')], line('M134 204 Q125 191 137 190 Q145 188 150 198 Q160 184 168 193 Q176 202 150 219 Q140 212 134 204 M118 228 L183 228'), [p('long-left', 'M101 78 L95 170 L112 157 L121 103Z'), p('long-right', 'M199 78 L207 173 L187 159 L181 103Z')]);
const abs = human('abs', 'Abs', [p('hair', 'M101 107 L93 72 L102 73 L100 52 L117 57 L127 37 L142 48 L157 34 L169 48 L190 40 L190 58 L205 61 L199 108 L183 81 L114 85Z')], [...standardPants, p('chest', 'M130 164 L171 164 L181 230 L119 230Z'), p('left-shirt', 'M130 164 L102 172 L79 205 L98 219 L115 199 L109 231 L131 231 L139 188Z'), p('right-shirt', 'M172 164 L199 172 L222 205 L203 219 L185 199 L191 231 L170 231 L161 188Z')], line('M150 182 L150 224 M135 186 Q142 181 148 187 M154 187 Q162 181 169 186 M135 202 L145 202 M157 202 L168 202 M137 215 L146 215 M156 215 L166 215') + `<g fill="none" stroke-width="2.5">${line('M114 181 L119 188 L126 181 M106 207 L112 214 L118 207 M186 182 L181 189 L174 182 M192 209 L185 216 L178 209')}</g>`);
const baby = human('baby', 'Baby', [p('hair', 'M101 111 Q83 70 110 50 Q146 25 185 49 Q213 66 199 114 L187 91 L187 71 L174 94 L163 74 L153 96 L141 73 L128 95 L116 76 L114 111Z')], [...standardPants, p('sweater', 'M126 165 L174 165 L197 178 L215 217 L194 229 L180 207 L184 234 L115 234 L120 207 L105 229 L84 217 L103 178Z'), p('collar', 'M131 165 Q150 179 168 165 L172 176 Q150 197 127 176Z'), p('cuff-left', 'M87 209 L108 219 L103 230 L82 218Z'), p('cuff-right', 'M194 219 L213 209 L218 218 L198 230Z')], line('M116 227 L184 227 M136 207 L165 207 M139 198 L139 215 M158 198 L158 215'));
const mystery = human('mystery', 'Mystery', [p('bangs', 'M99 119 Q83 75 108 51 Q141 30 180 47 Q207 62 201 122 L184 119 L184 131 L168 125 L158 134 L147 124 L130 134 L122 121 L106 128Z')], [...standardPants, p('left-arm', 'M121 171 L104 180 L86 221 L104 230 L127 190Z'), p('right-arm', 'M179 171 L196 180 L215 221 L197 230 L174 190Z'), p('vest', 'M126 165 L173 165 L186 228 L113 228Z'), p('v-neck', 'M127 165 L150 189 L173 165 L171 183 L150 204 L129 184Z')], line('M116 218 L184 218 M114 228 L185 228 M111 78 L109 111 M130 65 L126 118 M150 60 L146 120 M169 65 L166 117 M186 76 L184 111'));

const derpy: Template = {
  id: 'derpy', name: 'Derpy Tiger', category: 'kpop',
  regions: [p('tail', 'M202 256 Q268 274 248 214 Q238 192 254 190 Q274 195 278 238 Q282 292 213 286Z'), e('body', 150, 244, 79, 65), e('ear-left', 80, 74, 27, 27), e('ear-right', 219, 74, 27, 27), p('head', 'M68 116 Q65 60 143 64 Q231 56 236 117 L248 151 L231 149 L238 172 L217 169 Q193 205 147 202 Q93 204 72 170 L55 174 L65 149 L51 151Z'), e('eye-left', 113, 119, 26, 29), e('eye-right', 185, 117, 25, 28), e('muzzle-left', 130, 160, 29, 21), e('muzzle-right', 174, 160, 29, 21), p('nose', 'M135 143 Q150 133 165 143 L151 156Z'), p('tooth', 'M165 176 L178 174 L175 192Z'), e('left-foot', 100, 302, 33, 16), e('right-foot', 198, 302, 33, 16), p('forehead-stripe', 'M130 67 L145 105 L157 67Z'), p('left-stripe', 'M68 115 L92 137 L64 130Z'), p('right-stripe', 'M234 114 L210 137 L239 129Z'), p('body-stripe-left', 'M76 231 L113 243 L76 251Z'), p('body-stripe-right', 'M224 231 L191 245 L224 254Z')],
  details: dot(120, 119, 7) + dot(178, 111, 7) + line('M152 157 L152 174 M127 179 Q149 190 180 177 M96 163 L64 159 M98 174 L63 179 M201 163 L237 157 M201 174 L235 181 M120 274 L120 305 M180 274 L180 305'),
};
const sussie: Template = {
  id: 'sussie', name: 'Sussie Bird', category: 'kpop',
  regions: [p('tail', 'M123 241 L85 309 L113 298 L110 324 L140 295 L159 318 L170 249Z'), e('body', 153, 216, 58, 65), p('wing', 'M173 175 Q223 181 211 250 Q186 251 170 223Z'), e('head', 143, 119, 62, 59), p('breast', 'M108 185 Q137 199 169 181 L164 254 Q126 264 105 236Z'), p('beak', 'M90 123 L46 146 L92 153Z'), p('hat-brim', 'M98 64 Q147 46 197 62 L196 72 Q143 63 100 75Z'), p('hat', 'M117 60 L118 29 Q144 20 175 28 L182 61Z'), ...[[117, 101], [155, 94], [178, 112], [118, 134], [151, 126], [177, 139]].map(([x, y], i) => e(`eye-${i}`, x, y, 10, 12))],
  details: [[117, 101], [155, 94], [178, 112], [118, 134], [151, 126], [177, 139]].map(([x, y]) => dot(x - 1, y + 1, 3)).join('') + line('M137 275 L131 291 L118 292 M170 274 L177 291 L190 292 M98 143 L65 144 M181 202 L196 226 M178 218 L187 235 M122 42 L177 42'),
};
const jj: Template = {
  id: 'jj', name: 'JJ', category: 'minecraft',
  regions: [r('hood', 76, 36, 149, 135, 10), r('head', 91, 57, 119, 111), p('hair', 'M91 57 L210 57 L210 91 L191 91 L191 80 L170 80 L170 96 L145 96 L145 80 L120 80 L120 110 L91 110Z'), r('shirt', 97, 174, 107, 83), p('left-arm', 'M97 176 L70 176 L48 237 L74 248 L102 205Z'), p('right-arm', 'M203 176 L230 176 L252 237 L226 248 L199 205Z'), p('left-hand', 'M49 236 L74 247 L68 266 L42 255Z'), p('right-hand', 'M226 247 L251 236 L258 255 L232 266Z'), r('pants-left', 102, 258, 43, 49), r('pants-right', 155, 258, 43, 49), r('shoe-left', 96, 303, 49, 21), r('shoe-right', 155, 303, 49, 21), r('eye-left', 115, 111, 17, 21), r('eye-right', 171, 111, 17, 21), r('pocket', 125, 226, 50, 18)],
  details: `<path d="M121 117 L128 117 L128 129 L121 129Z M176 117 L183 117 L183 129 L176 129Z" fill="#493551"/>` + line('M135 143 L166 143 L160 153 L141 153Z M130 178 L133 208 M170 178 L167 208 M146 177 L153 177'),
};
const mikey: Template = {
  id: 'mikey', name: 'Mikey', category: 'minecraft',
  regions: [r('shell', 84, 173, 133, 112, 15), r('head', 85, 48, 132, 122, 7), r('body', 99, 176, 104, 105, 3), p('left-arm', 'M98 180 L71 178 L49 235 L75 247 L104 208Z'), p('right-arm', 'M204 180 L230 178 L251 235 L226 247 L199 208Z'), r('left-leg', 102, 280, 42, 42), r('right-leg', 158, 280, 42, 42), r('belly', 116, 189, 70, 81, 5), r('left-eye', 110, 88, 25, 35), r('right-eye', 167, 88, 25, 35), p('mouth', 'M118 141 L184 141 L175 158 L128 158Z')],
  details: `<path d="M122 103 L133 103 L133 122 L122 122Z M169 103 L180 103 L180 122 L169 122Z" fill="#493551"/>` + line('M116 215 L185 215 M116 241 L185 241 M150 190 L150 269 M97 64 L105 64 M199 64 L207 64'),
};

export const templates: Template[] = [cat, panda, quokka, puppy, rabbit, fox, rumi, mira, zoey, jinu, romance, abs, baby, mystery, derpy, sussie, jj, mikey];
export const templateById = (id: string) => templates.find(t => t.id === id);
export function templateSVG(template: Template, fills: Fills = {}, outlinesOnly = false): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" role="img" aria-label="${template.name} coloring picture"><g stroke="#493551" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${template.regions.map(region => `<${region.tag} data-region="${region.id}" ${region.attrs} fill="${outlinesOnly ? 'none' : fills[region.id] ?? '#ffffff'}"/>`).join('')}${template.details}</g></svg>`;
}
export const svgURL = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Shared scene artwork for the live world and exported PNG. */
export function sceneSVG(scene: Scene): string {
  const defs = '<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#cfe9ff"/><stop offset="1" stop-color="#f2f8ff"/></linearGradient><linearGradient id="curtain" x2="1"><stop stop-color="#42305f"/><stop offset=".5" stop-color="#715292"/><stop offset="1" stop-color="#42305f"/></linearGradient></defs>';
  let shapes = '<rect width="1000" height="650" fill="#fff"/>';
  if (scene === 'park') shapes = `<rect width="1000" height="650" fill="url(#sky)"/><circle cx="855" cy="83" r="40" fill="#ffe6a0"/><g fill="#fff"><ellipse cx="172" cy="110" rx="70" ry="20"/><ellipse cx="146" cy="95" rx="35" ry="25"/><ellipse cx="595" cy="166" rx="57" ry="17"/></g><path d="M0 444 Q210 350 445 439 Q680 357 1000 435 L1000 650 L0 650Z" fill="#c6e3ac"/><path d="M0 505 Q300 380 570 503 Q800 442 1000 488 L1000 650 L0 650Z" fill="#afd58d"/><path d="M360 650 Q397 532 572 467 Q470 555 540 650" fill="#e8d6b6"/><g stroke="#927d6a" stroke-width="12"><path d="M20 462 H260 M20 485 H260 M45 441 V511 M120 441 V501 M195 441 V491"/></g><g fill="#8bb970"><circle cx="888" cy="350" r="62"/><circle cx="942" cy="340" r="66"/><circle cx="916" cy="294" r="65"/></g><path d="M911 364 L922 506" stroke="#9c7962" stroke-width="20"/>`;
  if (scene === 'stage') shapes = `<rect width="1000" height="650" fill="url(#curtain)"/><path d="M80 0 L320 492 L460 492 L240 0Z M920 0 L680 492 L540 492 L760 0Z" fill="#cfc1ff" opacity=".13"/><path d="M0 0 Q77 165 175 140 L120 0 M1000 0 Q923 165 825 140 L880 0" fill="#a96bb6"/><rect y="480" width="1000" height="170" fill="#ad87cf"/><ellipse cx="500" cy="541" rx="330" ry="78" fill="#c6a3e6"/><path d="M0 617 H1000" stroke="#785798" stroke-width="10"/><g fill="#ffe6a0">${[150, 300, 500, 700, 850].map((x, i) => `<circle cx="${x}" cy="${90 + i % 2 * 60}" r="8"/>`).join('')}</g>`;
  if (scene === 'garden') shapes = `<rect width="1000" height="650" fill="#cceeff"/><path d="M100 90 H220 V130 H100Z M620 150 H760 V190 H620Z" fill="white"/><rect x="830" y="65" width="60" height="60" fill="#ffe599"/><path d="M0 450 H190 V400 H350 V445 H670 V390 H820 V440 H1000 V650 H0Z" fill="#9fcd7a"/><path d="M0 510 H190 V460 H350 V505 H670 V450 H820 V500 H1000 V650 H0Z" fill="#ac815f"/><path d="M0 545 H1000 M0 600 H1000 M100 510 V650 M260 460 V650 M450 505 V650 M630 505 V650 M780 450 V650 M930 500 V650" fill="none" stroke="#be9671" stroke-width="4"/><rect x="70" y="330" width="25" height="120" fill="#946f54"/><path d="M25 260 H140 V350 H25Z M45 225 H120 V300 H45Z" fill="#78b26a"/><rect x="870" y="360" width="90" height="80" fill="#92bd68"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650">${defs}${shapes}</svg>`;
}
export function propSVG(type: 'ball' | 'flower' | 'microphone'): string {
  const shapes = type === 'ball' ? '<circle cx="50" cy="50" r="40" fill="#ffe7a4"/><path d="M17 28 Q55 31 80 74 M23 80 Q58 52 81 24 M12 54 Q50 39 88 51" fill="none" stroke="#b48ad5" stroke-width="12"/>' : type === 'flower' ? '<path d="M50 55 V93 M50 80 Q20 56 23 79 Q29 96 50 86 M50 74 Q80 51 76 75 Q69 86 50 83" fill="#86bc86" stroke="#679a71" stroke-width="5"/><g fill="#bc8de0"><circle cx="50" cy="22" r="16"/><circle cx="70" cy="38" r="16"/><circle cx="62" cy="59" r="16"/><circle cx="37" cy="59" r="16"/><circle cx="29" cy="37" r="16"/></g><circle cx="50" cy="40" r="13" fill="#ffe59a"/>' : '<path d="M50 57 V89 M28 91 H72" stroke="#554466" stroke-width="7"/><g transform="rotate(23 50 42)"><rect x="40" y="32" width="20" height="43" rx="6" fill="#b494d3" stroke="#554466" stroke-width="4"/><ellipse cx="50" cy="25" rx="19" ry="23" fill="#ece5f7" stroke="#554466" stroke-width="4"/><path d="M34 16 H66 M32 25 H68 M34 34 H66" stroke="#a28fb8" stroke-width="3"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shapes}</svg>`;
}
