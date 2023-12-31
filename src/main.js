import './style.css'
import 'playground-elements';
import sandbox from 'virtual:pg-sandbox';
import { setup } from './playground';

document.querySelector('#app').innerHTML = `
    <playground-ide line-numbers editable-file-system resizable class="play-ide">
    </playground-ide>
    <button class="play-toggler"></button>
`;

setup(document.querySelector('playground-ide'));
