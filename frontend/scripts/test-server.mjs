import { spawn } from 'node:child_process';
import {assertTestDatabase} from './test-database.mjs';
assertTestDatabase(process.env.XGSZ_DATABASE_URL);
const child = spawn('java', ['-jar','../website/target/xgsz-website-1.0.0.jar','--server.port=18080','--spring.sql.init.mode=always','--spring.main.banner-mode=off'], {stdio:'inherit',windowsHide:true});
process.on('SIGTERM',()=>child.kill());
process.on('SIGINT',()=>child.kill());
child.on('exit',code=>process.exit(code || 0));
