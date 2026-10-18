import { PORT } from '../shared/constants.js';
import { makeHttp } from './http.js';
import { attachWs } from './websocket.js';
import { startLoop } from './loop.js';

const port = process.env.PORT || PORT;
const http = makeHttp();
attachWs(http);
startLoop();
http.listen(port, () => console.log(`порт ${port}`));
