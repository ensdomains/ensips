import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { remark } from 'remark';
import remarkFrontMatter from 'remark-frontmatter';
import html from 'remark-html';

import { App } from './App';
import { Home } from './Home';
import {
    type Frontmatter,
    extractFrontmatter,
} from './specs/validateFrontmatter';
import { extractTitle } from './specs/validateTitle';
import { TracedError } from './util/error';

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

export type ENSIPData = {
    path: string;
    title: string;
    frontmatter: Frontmatter;
    markdown: string;
};

let ensips: ENSIPData[] = [];

for (const file of files) {
    const directPath = file.replace('../', '');

    try {
        const fileData = await readFile(file, 'utf8');

        let frontmatter: Frontmatter;
        let title: string;

        const result = await remark()
            .use(remarkFrontMatter)
            .use(html)
            .use(
                extractFrontmatter(directPath, (_frontmatter) => {
                    frontmatter = _frontmatter;
                })
            )
            .use(
                extractTitle(directPath, (_found) => {
                    title = _found;
                })
            )
            .process(fileData);

        ensips.push({
            path: directPath.split('/').pop()!.replace('.md', ''),
            title: title!,
            frontmatter: frontmatter!,
            markdown: result.value.toString(),
        });

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
        if (error instanceof TracedError) {
            console.log(error.error);

            console.log(
                `::error file=${directPath},line=${error.line},col=${error.column},endColumn=${error.columnEnd}::${error.error}`
            );
        } else {
            console.log(error);

            console.log(
                '::error file=' +
                    directPath +
                    ',line=1,col=1,endColumn=2::Unable to load file'
            );
        }
    }
}

ensips = ensips.sort((a, b) =>
    a.frontmatter.ensip.created.localeCompare(b.frontmatter.ensip.created)
);

// Render Index
await writeFile(
    './dist/index.html',
    renderToStaticMarkup(<Home ensips={ensips} />)
);

// Render public content

const static_files = ['./public/index.css', './public/normalize.css'];

for (const file of static_files) {
    const fileData = await readFile(file, 'utf8');

    // write to file
    await writeFile(`./dist/${file.split('/').pop()}`, fileData);
}

console.log('Preview built successfully!');
