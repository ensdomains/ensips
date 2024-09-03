import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './src/App';
import { readFile, rmdir, mkdir, writeFile, readdir } from 'fs/promises';
import { remark } from 'remark';
import html from 'remark-html';

let markdown_files = await readdir('../ensips');
const files = markdown_files.map(x => `../ensips/${x}`);

// delete the dist folder
try {
    await rmdir('./dist', { recursive: true })
} catch (e) {
    console.log(e);
}

await mkdir('./dist');

for (const file of files) {
    const fileData = await readFile(file, 'utf8');

    const result = await remark().use(html).process(fileData);

    const x = renderToStaticMarkup(<App markdown={result.value.toString()} />);

    // write to file
    await writeFile(`./dist/${file.split('/').pop()?.replace('.md', '.html')}`, x);
}

const static_files = ['./public/index.css'];

for (const file of static_files) {
    const fileData = await readFile(file, 'utf8');

    // write to file
    await writeFile(`./dist/${file.split('/').pop()}`, fileData);
}
