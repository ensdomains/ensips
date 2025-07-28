import rehypeShiki from '@shikijs/rehype';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import postcss from 'postcss';
import { renderToStaticMarkup } from 'react-dom/server';
import rehypeStringify from 'rehype-stringify';
import remarkFrontMatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import postcssConfig from '../postcss.config.js';
import { App } from './App';
import { Home } from './Home';
import { validate } from './specs/index.js';
import { type Frontmatter } from './specs/validateFrontmatter';
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
await mkdir('./dist/ensip');

export type ENSIPData = {
    path: string;
    title: string;
    frontmatter: Frontmatter;
    markdown: string;
};

let ensips: ENSIPData[] = [];

for (const file of files) {
    const directPath = file.replace('../', '');
    const filename = directPath.split('/').pop()!;

    try {
        const fileData = await readFile(file, 'utf8');

        let frontmatter: Frontmatter;
        let title: string;

        const result = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype)
            .use(rehypeShiki, { theme: 'github-light' })
            .use(rehypeStringify)
            .use(remarkFrontMatter)
            .use(
                validate(directPath, (returnData) => {
                    ({ title, frontmatter } = returnData);
                })
            )
            .process(fileData);

        const data: ENSIPData = {
            path: filename.replace('.md', ''),
            title: title!,
            frontmatter: frontmatter!,
            markdown: result.value.toString(),
        };

        ensips.push(data);

        const x = renderToStaticMarkup(<App data={data} />);

        // write to file
        await writeFile(`./dist/ensip/${filename.replace('.md', '.html')}`, x);
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

const static_files = ['./public/index.css'];

console.log('Processing styles');

for (const file of static_files) {
    const fileData = await readFile(file, 'utf8');

    // apply postcss
    const processed = await postcss(postcssConfig.plugins).process(fileData, {
        from: file,
        to: 'dist/' + file.split('/').pop(),
    });

    // write to file
    await writeFile(`./dist/${file.split('/').pop()}`, processed.css);

    if (processed.map) {
        console.log('Writing sourcemap');
        await writeFile(
            `./dist/${file.split('/').pop()}.map`,
            processed.map.toString()
        );
    }
}

console.log('Preview built successfully!');
