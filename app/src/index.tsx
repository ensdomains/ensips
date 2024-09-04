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
import { ENSIPNumberMatch } from './util/regex';

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

        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    }
}

// sort ensips by number, all titles start with ENSIP-1 to ENSIP-19, I want 19 to be the last, 1 to be the first
ensips = ensips.sort((a, b) => {
    const titleA = ENSIPNumberMatch.exec(a.title)![1] as string;
    const titleB = ENSIPNumberMatch.exec(b.title)![1] as string;

    if (titleA.toLowerCase() === 'x') {
        return 1;
    }

    if (titleB.toLowerCase() === 'x') {
        return -1;
    }

    return Number.parseInt(titleA, 10) - Number.parseInt(titleB, 10);
});

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
