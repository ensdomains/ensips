import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { remark } from 'remark';
import remarkFrontMatter from 'remark-frontmatter';
import html from 'remark-html';

import { App } from './App';
import {
    type Frontmatter,
    extractFrontmatter,
} from './specs/validateFrontmatter';

console.log('Building preview...');

const markdown_files = await readdir('../ensips');
const files = markdown_files.map((x) => `../ensips/${x}`);

// delete the dist folder
try {
    await rm('./dist', { recursive: true });
} catch {
    // Soft error if directory doesn't exist
    // console.log(e);
}

await mkdir('./dist');

for (const file of files) {
    const directPath = file.replace('../', '');

    try {
        const fileData = await readFile(file, 'utf8');

        let frontmatter: Frontmatter;

        const result = await remark()
            .use(remarkFrontMatter)
            .use(html)
            .use(
                extractFrontmatter(directPath, (_frontmatter) => {
                    frontmatter = _frontmatter;
                })
            )
            .process(fileData);

        const x = renderToStaticMarkup(
            <App
                markdown={result.value.toString()}
                frontmatter={frontmatter!}
            />
        );

        // write to file
        await writeFile(
            `./dist/${file.split('/').pop()?.replace('.md', '.html')}`,
            x
        );
    } catch (error) {
        console.log(error);
        console.log(
            '::error file=' +
                directPath +
                ',line=1,col=1,endColumn=2::Unable to load file'
        );
    }
}

const static_files = ['./public/index.css'];

for (const file of static_files) {
    const fileData = await readFile(file, 'utf8');

    // write to file
    await writeFile(`./dist/${file.split('/').pop()}`, fileData);
}

console.log('Preview built successfully!');
