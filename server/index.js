import { PORT } from '../shared/constants.js';
import { makeHttp } from './http.js';
import { attachWs } from './websocket.js';
import { startLoop } from './loop.js';

const http = makeHttp();
attachWs(http);
startLoop();
http.listen(PORT, () => console.log(`http://localhost:${PORT}`));
