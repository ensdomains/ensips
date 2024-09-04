import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { remark } from 'remark';
import remarkFrontMatter from 'remark-frontmatter';
import html from 'remark-html';
import { parse as parseYaml, YAMLParseError } from 'yaml';

import { App } from './App';

export type Frontmatter = {
    description: string;
    contributors: string[];
    ensip: {
        status: string;
        created: string;
    };
};

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

        let frontmatter: {
            type: 'yaml';
            value: string;
            position: {
                start: { line: number; column: number };
                end: { line: number; column: number };
            };
        };

        const result = await remark()
            .use(remarkFrontMatter)
            .use(html)
            .use(() => {
                return function (tree) {
                    // console.dir(tree)
                    const first = (
                        (tree as any)['children'] as {
                            type: string;
                            value?: string;
                        }[]
                    ).shift();

                    if (first && first.type === 'yaml' && first.value) {
                        // @ts-ignore
                        frontmatter = first;
                    } else {
                        throw new Error('No frontmatter found');
                    }
                };
            })
            .process(fileData);

        const frontmatter_parsed = (() => {
            try {
                // @ts-ignore
                return parseYaml(frontmatter.value as string) as Frontmatter;
            } catch (error) {
                if (error instanceof YAMLParseError) {
                    console.log(error.name);
                    const line =
                        frontmatter!.position.start.line +
                        (error.linePos?.[0].line || 0);
                    const column =
                        frontmatter!.position.start.column +
                        (error.linePos?.[0].col || 0);
                    const endColumn =
                        frontmatter!.position.start.column +
                        (error.linePos?.[0].col || 0);

                    console.log(
                        '::error file=' +
                            directPath +
                            ',line=' +
                            line +
                            ',col=' +
                            column +
                            ',endColumn=' +
                            endColumn +
                            '::' +
                            error.message
                    );

                    // eslint-disable-next-line unicorn/no-process-exit
                    process.exit(1);
                } else {
                    console.log(error);
                }
            }
        })();

        const x = renderToStaticMarkup(
            <App
                markdown={result.value.toString()}
                frontmatter={frontmatter_parsed!}
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
